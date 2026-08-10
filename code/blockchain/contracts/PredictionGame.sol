// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReferralRegistry} from "./ReferralRegistry.sol";

/// @title PredictionGame
/// @notice Round-based up/down price prediction with bets escrowed
/// entirely on-chain. The backend can render a Live/Next/Prev
/// round UI by reading `Round`/`Bet` events, it never decides who
/// won or who gets paid; the contract does, from the Chainlink
/// price recorded at lock and close.
contract PredictionGame is ReentrancyGuard, Pausable, Ownable2Step {
    AggregatorV3Interface public immutable priceFeed;
    ReferralRegistry public immutable referralRegistry;

    uint256 public immutable roundDurationSeconds; // e.g. 5 minutes
    uint256 public treasuryFeeBps = 300; // 3% house fee, owner-adjustable, capped below
    uint256 public constant MAX_FEE_BPS = 1000; // hard cap: owner can never set fee above 10%

    /// @notice Share of the house fee (not of the payout) routed to a
    /// winner's referrer, if one is registered. Owner-adjustable,
    /// capped below, and paid out of the fee itself, it never
    /// increases what a winner pays or decreases their payout.
    uint256 public referralShareBps = 2000; // 20% of the fee, i.e. 0.6% of a winning payout at the default 3% fee
    uint256 public constant MAX_REFERRAL_SHARE_BPS = 5000; // owner can never route more than half the fee away from treasury

    enum Position {
        Down,
        Up
    }

    struct Round {
        uint256 epoch;
        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        int256 lockPrice;
        int256 closePrice;
        bool lockPriceSet;
        bool closePriceSet;
        uint256 totalUpAmount;
        uint256 totalDownAmount;
        bool cancelled; // e.g. oracle failure, everyone gets a full refund
    }

    struct Bet {
        Position position;
        uint256 amount;
        bool claimed;
    }

    uint256 public currentEpoch;
    mapping(uint256 => Round) public rounds; // epoch => round
    mapping(uint256 => mapping(address => Bet)) public bets; // epoch => user => bet
    uint256 public treasuryBalance;

    /// @notice Referral rewards accrue here (pull-payment) rather than
    /// being pushed inline during claim(). Pushing an external
    /// call to an arbitrary referrer address inside claim() would
    /// let a referrer with a reverting fallback grief every user
    /// they referred out of their own winnings; accruing instead
    /// and letting the referrer withdraw separately removes that
    /// attack surface entirely.
    mapping(address => uint256) public pendingReferralReward;

    event RoundStarted(uint256 indexed epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp);
    event RoundLocked(uint256 indexed epoch, int256 lockPrice);
    event RoundClosed(uint256 indexed epoch, int256 closePrice);
    event RoundCancelled(uint256 indexed epoch);
    event BetPlaced(address indexed user, uint256 indexed epoch, Position position, uint256 amount);
    event Claimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event ReferralRewardAccrued(
        address indexed referrer,
        address indexed referredUser,
        uint256 indexed epoch,
        uint256 amount
    );
    event ReferralRewardClaimed(address indexed referrer, uint256 amount);

    error RoundNotBettable();
    error RoundAlreadyLive();
    error AlreadyBet();
    error ZeroAmount();
    error ZeroAddress();
    error RoundNotResolved();
    error NothingToClaim();
    error TooEarly();
    error FeeTooHigh();

    constructor(
        address _priceFeed,
        address _referralRegistry,
        uint256 _roundDurationSeconds,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_priceFeed == address(0) || _referralRegistry == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }
        if (_roundDurationSeconds == 0) revert ZeroAmount();
        priceFeed = AggregatorV3Interface(_priceFeed);
        referralRegistry = ReferralRegistry(_referralRegistry);
        roundDurationSeconds = _roundDurationSeconds;
    }

    // ---------------------------------------------------------------------
    // Round lifecycle, permissionless "keeper" pattern: anyone (typically
    // the backend's cron job, but trustlessly, it gets no special power)
    // can call these once the time window is right. The contract enforces
    // timing and price sourcing itself.
    // ---------------------------------------------------------------------

    /// @notice Start the next round. Reverts if the current round hasn't
    /// been locked/closed/cancelled yet, which both keeps exactly
    /// one round live at a time (matching the Live/Next/Prev UI
    /// model) and means this can't be spammed to fragment epochs,
    /// starting round N+1 is itself gated on round N having
    /// already passed its own closeTimestamp check.
    function startRound() external whenNotPaused returns (uint256 epoch) {
        if (currentEpoch != 0) {
            Round storage prev = rounds[currentEpoch];
            if (!prev.closePriceSet && !prev.cancelled) revert RoundAlreadyLive();
        }

        epoch = ++currentEpoch;
        uint256 start = block.timestamp;
        rounds[epoch] = Round({
            epoch: epoch,
            startTimestamp: start,
            lockTimestamp: start + roundDurationSeconds,
            closeTimestamp: start + 2 * roundDurationSeconds,
            lockPrice: 0,
            closePrice: 0,
            lockPriceSet: false,
            closePriceSet: false,
            totalUpAmount: 0,
            totalDownAmount: 0,
            cancelled: false
        });
        emit RoundStarted(epoch, start, start + roundDurationSeconds, start + 2 * roundDurationSeconds);
    }

    function lockRound(uint256 epoch) external {
        Round storage r = rounds[epoch];
        if (block.timestamp < r.lockTimestamp) revert TooEarly();
        if (r.lockPriceSet || r.cancelled) return;
        r.lockPrice = _latestPrice();
        r.lockPriceSet = true;
        emit RoundLocked(epoch, r.lockPrice);
    }

    function closeRound(uint256 epoch) external {
        Round storage r = rounds[epoch];
        if (block.timestamp < r.closeTimestamp) revert TooEarly();
        if (r.closePriceSet || r.cancelled) return;
        if (!r.lockPriceSet) {
            // Lock never happened (e.g. no one called lockRound in time).
            // Cancel so bettors can reclaim their stake instead of losing it
            // to an undefined outcome.
            r.cancelled = true;
            emit RoundCancelled(epoch);
            return;
        }
        r.closePrice = _latestPrice();
        r.closePriceSet = true;
        emit RoundClosed(epoch, r.closePrice);
    }

    function _latestPrice() internal view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(updatedAt > 0 && block.timestamp - updatedAt < 1 hours, "stale price feed");
        require(answer > 0, "invalid price feed answer");
        return answer;
    }

    // ---------------------------------------------------------------------
    // Betting
    // ---------------------------------------------------------------------

    function bet(uint256 epoch, Position position) external payable nonReentrant whenNotPaused {
        Round storage r = rounds[epoch];
        if (r.startTimestamp == 0 || block.timestamp >= r.lockTimestamp || r.cancelled) revert RoundNotBettable();
        if (msg.value == 0) revert ZeroAmount();
        if (bets[epoch][msg.sender].amount != 0) revert AlreadyBet();

        bets[epoch][msg.sender] = Bet({position: position, amount: msg.value, claimed: false});
        if (position == Position.Up) {
            r.totalUpAmount += msg.value;
        } else {
            r.totalDownAmount += msg.value;
        }
        emit BetPlaced(msg.sender, epoch, position, msg.value);
    }

    /// @notice Pull-payment claim, winners (or everyone, if the round was
    /// cancelled) withdraw their own payout. Nothing is pushed to users by
    /// an admin action, so there's no "approve withdrawal" trust step. If
    /// the caller has a registered referrer, a slice of the house fee
    /// (never of the payout) accrues to that referrer's pending balance.
    function claim(uint256 epoch) external nonReentrant {
        Round storage r = rounds[epoch];
        Bet storage b = bets[epoch][msg.sender];
        if (b.amount == 0 || b.claimed) revert NothingToClaim();

        uint256 payout;
        if (r.cancelled) {
            payout = b.amount;
        } else {
            if (!r.closePriceSet) revert RoundNotResolved();
            bool up = r.closePrice > r.lockPrice;
            bool down = r.closePrice < r.lockPrice;
            bool won = (up && b.position == Position.Up) || (down && b.position == Position.Down);
            bool tie = !up && !down;

            if (tie) {
                payout = b.amount; // tie: full refund, no fee
            } else if (won) {
                uint256 pool = r.totalUpAmount + r.totalDownAmount;
                uint256 winningSide = b.position == Position.Up ? r.totalUpAmount : r.totalDownAmount;
                uint256 grossShare = (pool * b.amount) / winningSide;
                uint256 fee = (grossShare * treasuryFeeBps) / 10_000;
                payout = grossShare - fee;

                uint256 referralCut = 0;
                address referrer = referralRegistry.getReferrer(msg.sender);
                if (referrer != address(0) && referralShareBps > 0) {
                    referralCut = (fee * referralShareBps) / 10_000;
                    pendingReferralReward[referrer] += referralCut;
                    emit ReferralRewardAccrued(referrer, msg.sender, epoch, referralCut);
                }
                treasuryBalance += fee - referralCut;
            } else {
                payout = 0;
            }
        }

        b.claimed = true;
        if (payout > 0) {
            (bool ok, ) = msg.sender.call{value: payout}("");
            require(ok, "transfer failed");
        }
        emit Claimed(msg.sender, epoch, payout);
    }

    /// @notice Withdraw accrued referral rewards. Separate from claim() so
    /// a referrer's own withdrawal behavior can never affect a
    /// referred user's ability to collect their winnings.
    function claimReferralReward() external nonReentrant {
        uint256 amount = pendingReferralReward[msg.sender];
        if (amount == 0) revert NothingToClaim();
        pendingReferralReward[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit ReferralRewardClaimed(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Admin, parameters and the house fee only. Owner can never touch a
    // user's bet or force a claim's outcome; it's derived purely from the
    // oracle price recorded at lock/close.
    // ---------------------------------------------------------------------

    function setTreasuryFeeBps(uint256 bps) external onlyOwner {
        if (bps > MAX_FEE_BPS) revert FeeTooHigh();
        treasuryFeeBps = bps;
    }

    function setReferralShareBps(uint256 bps) external onlyOwner {
        if (bps > MAX_REFERRAL_SHARE_BPS) revert FeeTooHigh();
        referralShareBps = bps;
    }

    function withdrawTreasury(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = treasuryBalance;
        treasuryBalance = 0;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit TreasuryWithdrawn(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
