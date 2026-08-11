// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ReferralRegistry
/// @notice Minimal on-chain referral graph: who referred whom.
contract ReferralRegistry {
    mapping(address => address) public referrerOf;

    event ReferrerSet(address indexed user, address indexed referrer);

    error ReferrerAlreadySet();
    error SelfReferral();
    error ZeroAddress();

    /// @notice Set once per address, irreversible.
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
