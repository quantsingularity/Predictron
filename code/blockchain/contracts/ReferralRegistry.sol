// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReferralRegistry
/// @notice Minimal on-chain referral graph: a user may record who referred
///         them, exactly once. PredictionGame reads this at claim time to
///         route a share of its own house fee directly to the referrer —
///         this registry itself never holds or moves a single token, it
///         only ever answers "who referred this address?".
contract ReferralRegistry {
    mapping(address => address) public referrerOf;

    event ReferrerSet(address indexed user, address indexed referrer);

    error ReferrerAlreadySet();
    error SelfReferral();
    error ZeroAddress();

    /// @notice Record `referrer` as the caller's referrer. Callable once
    ///         per address and irreversible by design, so a referral can't
    ///         be reassigned later to redirect another referrer's reward.
    function setReferrer(address referrer) external {
        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == msg.sender) revert SelfReferral();
        if (referrerOf[msg.sender] != address(0)) revert ReferrerAlreadySet();
        referrerOf[msg.sender] = referrer;
        emit ReferrerSet(msg.sender, referrer);
    }

    function getReferrer(address user) external view returns (address) {
        return referrerOf[user];
    }
}
