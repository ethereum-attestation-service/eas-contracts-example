// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import { IEAS, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData, MultiAttestationRequest, MultiRevocationRequest } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

/// @title Attester
/// @notice Ethereum Attestation Service - Example
contract Attester {
    error InvalidEAS();

    // The address of the global EAS contract.
    IEAS private immutable _eas;

    /// @notice Creates a new Attester instance.
    /// @param eas The address of the global EAS contract.
    constructor(IEAS eas) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
    }

    /// @notice Attests to a schema that receives a uint256 parameter.
    /// @param schema The schema UID to attest to.
    /// @param input The uint256 value to pass to to the resolver.
    /// @return The UID of the new attestation.
    function attest(bytes32 schema, uint256 input) external returns (bytes32) {
        return
            _eas.attest(
                AttestationRequest({
                    schema: schema,
                    data: AttestationRequestData({
                        recipient: address(0), // No recipient
                        expirationTime: NO_EXPIRATION_TIME, // No expiration time
                        revocable: true,
                        refUID: EMPTY_UID, // No referenced UID
                        data: abi.encode(input), // Encode a single uint256 as a parameter to the schema
                        value: 0 // No value/ETH
                    })
                })
            );
    }

    /// @notice Revokes an attestation of a schema that receives a uint256 parameter.
    /// @param schema The schema UID to attest to.
    /// @param uid The UID of the attestation to revoke.
    function revoke(bytes32 schema, bytes32 uid) external {
        _eas.revoke(RevocationRequest({ schema: schema, data: RevocationRequestData({ uid: uid, value: 0 }) }));
    }

    /// @notice Multi-attests to a schema that receives a uint256 parameter.
    /// @param schema The schema UID to attest to.
    /// @param inputs The uint256 values to pass to to the resolver.
    /// @return The UIDs of new attestations.
    function multiAttest(bytes32 schema, uint256[] calldata inputs) external returns (bytes32[] memory) {
        uint256 length = inputs.length;

        AttestationRequestData[] memory data = new AttestationRequestData[](length);
        for (uint256 i = 0; i < length; ++i) {
            data[i] = AttestationRequestData({
                recipient: address(0), // No recipient
                expirationTime: NO_EXPIRATION_TIME, // No expiration time
                revocable: true,
                refUID: EMPTY_UID, // No referenced UID
                data: abi.encode(inputs[i]), // Encode a single uint256 as a parameter to the schema
                value: 0 // No value/ETH
            });
        }

        MultiAttestationRequest[] memory multiRequests = new MultiAttestationRequest[](1);
        multiRequests[0] = MultiAttestationRequest({ schema: schema, data: data });

        return _eas.multiAttest(multiRequests);
    }

    /// @notice Multi-revokes an attestation of a schema that receives a uint256 parameter.
    /// @param schema The schema UID to attest to.
    /// @param uids The UIDs of the attestations to revoke.
    function multiRevoke(bytes32 schema, bytes32[] calldata uids) external {
        uint256 length = uids.length;

        RevocationRequestData[] memory data = new RevocationRequestData[](length);
        for (uint256 i = 0; i < length; ++i) {
            data[i] = RevocationRequestData({ uid: uids[i], value: 0 });
        }

        MultiRevocationRequest[] memory multiRequests = new MultiRevocationRequest[](1);
        multiRequests[0] = MultiRevocationRequest({ schema: schema, data: data });

        _eas.multiRevoke(multiRequests);
    }
}
