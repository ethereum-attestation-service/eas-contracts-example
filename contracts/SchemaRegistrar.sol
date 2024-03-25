// SPDX-License-Identifier: MIT

pragma solidity 0.8.25;

import { ISchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { ISchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/ISchemaResolver.sol";

/// @title SchemaRegistrar
/// @notice Schema Registration Example
contract SchemaRegistrar {
    error InvalidSchemaRegistry();
    error InvalidSchema();
    error InvalidResolver();

    // The address of the global SchemaRegistry contract.
    ISchemaRegistry private immutable _schemaRegistry;

    /// @notice Creates a new Attester instance.
    /// @param schemaRegistry The address of the global EAS contract.
    constructor(ISchemaRegistry schemaRegistry) {
        if (address(schemaRegistry) == address(0)) {
            revert InvalidSchemaRegistry();
        }

        _schemaRegistry = schemaRegistry;
    }

    /// @notice Submits and reserves a new schema
    /// @param schema The schema data schema.s
    /// @param resolver An optional schema resolver.
    /// @param revocable Whether the schema allows revocations explicitly.
    /// @return The UID of the new schema.
    function register(string memory schema, ISchemaResolver resolver, bool revocable) external returns (bytes32) {
        if (bytes(schema).length == 0) {
            revert InvalidSchema();
        }

        if (address(resolver) == address(0)) {
            revert InvalidResolver();
        }

        return _schemaRegistry.register(schema, resolver, revocable);
    }
}
