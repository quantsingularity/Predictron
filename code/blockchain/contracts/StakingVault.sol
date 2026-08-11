// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {
    Ownable2Step,
    Ownable
} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title StakingVault
/// @notice Non-custodial staking vault. Rewards accrue per-second via an accumulator pattern.
contract StakingVault is ReentrancyGuard, Pausable, Ownable2Step {
    using SafeERC20 for IERC20;

    struct Plan {
        uint256 id;
        uint256 lockDurationSeconds; // 0 = flexible, no lock
        uint256 rewardRateBps; // annualized, basis points
        bool active;
    }

    struct StakePosition {
        uint256 planId;
        uint256 amount;
        uint256 startTimestamp;
        uint256 unlockTimestamp;
        uint256 rewardDebt;
        uint256 accruedReward;
        uint256 lastAccrualTimestamp;
    }

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public nextPlanId = 1;
    mapping(uint256 => Plan) public plans;

    mapping(address => mapping(uint256 => StakePosition)) public positions;
    mapping(address => uint256) public nextPositionId;

    uint256 public totalStaked;
    uint256 public rewardReserve;

    event PlanCreated(
        uint256 indexed planId,
        uint256 lockDurationSeconds,
        uint256 rewardRateBps
    );
    event PlanUpdated(
        uint256 indexed planId,
        bool active,
        uint256 rewardRateBps
    );
    event Staked(
        address indexed user,
        uint256 indexed positionId,
        uint256 indexed planId,
        uint256 amount,
        uint256 unlockTimestamp
    );
    event Unstaked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 rewardPaid
    );
    event RewardClaimed(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    event RewardsFunded(address indexed from, uint256 amount);

    error PlanNotActive();
    error StillLocked(uint256 unlockTimestamp);
    error NothingStaked();
    error InsufficientRewardReserve();
    error ZeroAmount();
    error ZeroAddress();
    error CannotRecoverVaultToken();

    constructor(
        address _stakingToken,
        address _rewardToken,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            _stakingToken == address(0) ||
            _rewardToken == address(0) ||
            initialOwner == address(0)
        ) {
            revert ZeroAddress();
        }
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    // -- Admin --

    function createPlan(
        uint256 lockDurationSeconds,
        uint256 rewardRateBps
    ) external onlyOwner returns (uint256 planId) {
        planId = nextPlanId++;
        plans[planId] = Plan({
            id: planId,
            lockDurationSeconds: lockDurationSeconds,
            rewardRateBps: rewardRateBps,
            active: true
        });
        emit PlanCreated(planId, lockDurationSeconds, rewardRateBps);
    }

    function setPlanActive(uint256 planId, bool active) external onlyOwner {
        plans[planId].active = active;
        emit PlanUpdated(planId, active, plans[planId].rewardRateBps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundRewards(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardReserve += amount;
        emit RewardsFunded(msg.sender, amount);
    }

    /// @notice Recover a foreign token sent here by mistake. Cannot touch stakingToken/rewardToken.
    function recoverForeignToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (token == address(stakingToken) || token == address(rewardToken))
            revert CannotRecoverVaultToken();
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // -- User actions --

    function stake(
        uint256 planId,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 positionId) {
        Plan memory plan = plans[planId];
        if (!plan.active) revert PlanNotActive();
        if (amount == 0) revert ZeroAmount();

        // Credit the actual received amount, safe for fee-on-transfer tokens.
        uint256 balanceBefore = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received =
            stakingToken.balanceOf(address(this)) - balanceBefore;
        if (received == 0) revert ZeroAmount();

        positionId = nextPositionId[msg.sender]++;
        uint256 unlockAt =
            plan.lockDurationSeconds == 0
                ? 0
                : block.timestamp + plan.lockDurationSeconds;

        positions[msg.sender][positionId] = StakePosition({
            planId: planId,
            amount: received,
            startTimestamp: block.timestamp,
            unlockTimestamp: unlockAt,
            rewardDebt: 0,
            accruedReward: 0,
            lastAccrualTimestamp: block.timestamp
        });

        totalStaked += received;
        emit Staked(msg.sender, positionId, planId, received, unlockAt);
    }

    function pendingReward(
        address user,
        uint256 positionId
    ) public view returns (uint256) {
        StakePosition memory pos = positions[user][positionId];
        if (pos.amount == 0) return pos.accruedReward;
        Plan memory plan = plans[pos.planId];
        uint256 elapsed = block.timestamp - pos.lastAccrualTimestamp;
        uint256 newReward =
            (pos.amount * plan.rewardRateBps * elapsed) / (10_000 * 365 days);
        return pos.accruedReward + newReward;
    }

    function _accrue(address user, uint256 positionId) internal {
        StakePosition storage pos = positions[user][positionId];
        pos.accruedReward = pendingReward(user, positionId);
        pos.lastAccrualTimestamp = block.timestamp;
    }

    function claimReward(uint256 positionId) external nonReentrant {
        _accrue(msg.sender, positionId);
        StakePosition storage pos = positions[msg.sender][positionId];
        uint256 reward = pos.accruedReward;
        if (reward == 0) return;
        if (reward > rewardReserve) revert InsufficientRewardReserve();

        pos.accruedReward = 0;
        rewardReserve -= reward;
        rewardToken.safeTransfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, positionId, reward);
    }

    function unstake(uint256 positionId) external nonReentrant {
        StakePosition storage pos = positions[msg.sender][positionId];
        if (pos.amount == 0) revert NothingStaked();
        if (pos.unlockTimestamp != 0 && block.timestamp < pos.unlockTimestamp) {
            revert StillLocked(pos.unlockTimestamp);
        }

        _accrue(msg.sender, positionId);
        uint256 amount = pos.amount;
        uint256 totalReward = pos.accruedReward;
        uint256 payableReward =
            totalReward > rewardReserve ? rewardReserve : totalReward;
        uint256 remainder = totalReward - payableReward;

        pos.amount = 0;
        // Any shortfall stays claimable, paid once the reserve is topped up.
        pos.accruedReward = remainder;
        totalStaked -= amount;
        if (payableReward > 0) rewardReserve -= payableReward;

        stakingToken.safeTransfer(msg.sender, amount);
        if (payableReward > 0)
            rewardToken.safeTransfer(msg.sender, payableReward);

        emit Unstaked(msg.sender, positionId, amount, payableReward);
    }
}
