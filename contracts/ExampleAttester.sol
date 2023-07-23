// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import { IEAS, AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { NO_EXPIRATION_TIME, EMPTY_UID } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

/**
 * @title Ethereum Attestation Service - Example
 */
contract ExampleAttester {
    error InvalidEAS();

    // The address of the global EAS contract.
    IEAS private immutable _eas;

    /**
     * @dev Creates a new ExampleAttester instance.
     *
     * @param eas The address of the global EAS contract.
     */
    constructor(IEAS eas) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        _eas = eas;
    }

    /**
     * @dev Attests to a schema that receives a uint256 parameter
     *
     * @return The UID of the new attestation.
     */
    function attestUint(bytes32 schema, uint256 input) external returns (bytes32) {
        return
            _eas.attest(
                AttestationRequest({
                    schema: schema,
                    data: AttestationRequestData({
                        recipient: address(0), // No recipient
                        expirationTime: NO_EXPIRATION_TIME, // No expiration time
                        revocable: true,
                        refUID: EMPTY_UID, // No references UI
                        data: abi.encode(input), // Encode a single uint256 as a parameter to the schema
                        value: 0 // No value/ETH
                    })
                })
            );
    }
}
