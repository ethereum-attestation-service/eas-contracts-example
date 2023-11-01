// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { EMPTY_UID, Signature } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title OffchainAttestationVerifier
/// @notice Offchain Attestation Verifier - Example
contract OffchainAttestationVerifier is EIP712 {
    error InvalidEAS();
    error InvalidVersion();

    /// @notice A struct representing an offchain attestation request.
    struct OffchainAttestation {
        Version version; // The version of the attestation.
        bytes32 schema; // The unique identifier of the schema.
        address recipient; // The recipient of the attestation.
        uint64 time; // The time when the attestation was signed.
        uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
        bool revocable; // Whether the attestation is revocable.
        bytes32 refUID; // The UID of the related attestation.
        bytes data; // Custom attestation data.
        Signature signature; // The ECDSA signature data.
    }

    /// @notice Offchain attestation versions.
    enum Version {
        LEGACY,
        VERSION_1
    }

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attestation(bytes32 schema,address recipient,uint64 time,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data)").
    bytes32 private constant LEGACY_ATTEST_TYPEHASH =
        0x2fcbc49c85ccde58f6986371b0828354351185c921aebbaace3e89e0e023b25d;

    // The hash of the data type used to relay calls to the attest function. It's the value of
    // keccak256("Attest(uint16 version,bytes32 schema,address recipient,uint64 time,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data)").
    bytes32 private constant VERSION1_ATTEST_TYPEHASH =
        0x9a1ef129b3715afc513574bddcf4404e21b0296e3ca20fec532fe1ec8d0932ec;

    // The address of the global EAS contract.
    IEAS private immutable _eas;

    // The version of the offchain attestations to verify.
    Version private immutable _version;

    /// @notice Creates a new Attester instance.
    /// @param eas The address of the global EAS contract.
    /// @param version The version of offchain attestations to verify.
    constructor(IEAS eas, Version version) EIP712("EAS Attestation", Strings.toString(uint256(version))) {
        if (address(eas) == address(0)) {
            revert InvalidEAS();
        }

        // Verify that the version is known.
        if (version > Version.VERSION_1) {
            revert InvalidVersion();
        }

        _eas = eas;
        _version = version;
    }

    /// @notice Returns the EAS.
    function getEAS() external view returns (IEAS) {
        return _eas;
    }

    /// @notice Returns the version of the offchain attestations to verify.
    function getVersion() external view returns (uint16) {
        return uint16(_version);
    }

    /// @notice Verify the offchain attestation.
    /// @param attestation The offchain attestation to verify.
    /// @param attester The address of the attester.
    /// @return The status of the verification.
    function verify(OffchainAttestation calldata attestation, address attester) external view returns (bool) {
        if (attester == address(0)) {
            return false;
        }

        // Verify that the version is known.
        if (attestation.version != _version) {
            return false;
        }

        // Verify that the time of the attestation isn't in the future.
        if (attestation.time > _time()) {
            return false;
        }

        // Verify that the schema exists.
        if (_eas.getSchemaRegistry().getSchema(attestation.schema).uid == EMPTY_UID) {
            return false;
        }

        // Verify that the referenced attestation exists.
        if (attestation.refUID != EMPTY_UID && !_eas.isAttestationValid(attestation.refUID)) {
            return false;
        }

        // Verify the EIP712/EIP1271 signature.
        bytes32 hash;

        // Derive the right typed data hash based on the offchain attestation version.
        if (_version == Version.LEGACY) {
            hash = _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        LEGACY_ATTEST_TYPEHASH,
                        attestation.schema,
                        attestation.recipient,
                        attestation.time,
                        attestation.expirationTime,
                        attestation.revocable,
                        attestation.refUID,
                        keccak256(attestation.data)
                    )
                )
            );
        } else if (_version == Version.VERSION_1) {
            hash = _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        VERSION1_ATTEST_TYPEHASH,
                        uint16(_version),
                        attestation.schema,
                        attestation.recipient,
                        attestation.time,
                        attestation.expirationTime,
                        attestation.revocable,
                        attestation.refUID,
                        keccak256(attestation.data)
                    )
                )
            );
        } else {
            return false;
        }

        Signature memory signature = attestation.signature;
        if (
            !SignatureChecker.isValidSignatureNow(
                attester,
                hash,
                abi.encodePacked(signature.r, signature.s, signature.v)
            )
        ) {
            return false;
        }

        return true;
    }

    /// @dev Returns the current's block timestamp. This method is overridden during tests and used to simulate the
    ///     current block time.
    function _time() internal view virtual returns (uint64) {
        return uint64(block.timestamp);
    }
}
