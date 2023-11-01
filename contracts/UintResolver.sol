// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import { IEAS, Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";

/// @title UintResolver
/// @notice A sample schema resolver that logs a uint256 input.
contract UintResolver is SchemaResolver {
    /// @notice Emitted to log a uint256 value.
    /// @param value The attested value.
    event Log(uint256 value);

    /// @notice Creates a new UintResolver instance.
    constructor(IEAS eas) SchemaResolver(eas) {}

    /// @notice An example resolver onAttest callback that decodes a uint256 value and just logs it.
    /// @param attestation The new attestation.
    /// @return Whether the attestation is valid.
    function onAttest(Attestation calldata attestation, uint256 /*value*/) internal override returns (bool) {
        uint256 value = abi.decode(attestation.data, (uint256));

        emit Log(value);

        return true;
    }

    /// @notice An example resolver onRevoke fallthrough callback (which currently doesn't do anything).
    /// @return Whether the attestation can be revoked.
    function onRevoke(Attestation calldata /*attestation*/, uint256 /*value*/) internal pure override returns (bool) {
        return true;
    }
}
