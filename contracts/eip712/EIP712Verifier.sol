// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { ShortString, ShortStrings } from "@openzeppelin/contracts/utils/ShortStrings.sol";

/// @title EIP712Verifier
/// @notice EIP712 verifier that supports receiving the target aggress
abstract contract EIP712Verifier {
    using ShortStrings for *;

    bytes32 private constant TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    address private immutable _target;

    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 private immutable _cachedDomainSeparator;
    uint256 private immutable _cachedChainId;
    address private immutable _cachedThis;

    bytes32 private immutable _hashedName;
    bytes32 private immutable _hashedVersion;

    ShortString private immutable _name;
    ShortString private immutable _version;
    string private _nameFallback;
    string private _versionFallback;

    /// @dev Initializes the domain separator and parameter caches.
    constructor(string memory name, string memory version, address target) {
        _target = target;

        _name = name.toShortStringWithFallback(_nameFallback);
        _version = version.toShortStringWithFallback(_versionFallback);
        _hashedName = keccak256(bytes(name));
        _hashedVersion = keccak256(bytes(version));

        _cachedChainId = block.chainid;
        _cachedDomainSeparator = _buildDomainSeparator();
        _cachedThis = address(this);
    }

    /// @dev Returns the domain separator for the current chain and for a specific target.
    function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _cachedThis && block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        }

        return _buildDomainSeparator();
    }

    /// @dev Builds the domain separator for the current chain and for a specific target.
    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, _target));
    }

    /// @dev Given an already hashed struct, this function returns the hash of the fully encoded EIP712 message for this
    /// domain.
    /// @param structHash The hashed struct to verify.
    function _hashTypedDataV4(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSA.toTypedDataHash(_domainSeparatorV4(), structHash);
    }
}
