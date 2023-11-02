import { OffChainAttestationVersion, SchemaRegistry, ZERO_ADDRESS } from '@ethereum-attestation-service/eas-sdk';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import {
  EAS as EASContract,
  OffchainAttestationVerifier,
  SchemaRegistry as SchemaRegistryContract
} from '../typechain-types';
import { expect } from './helpers/Chai';

describe('OffchainAttestationVerifier', () => {
  let sender: Signer;

  let registryContract: SchemaRegistryContract;
  let easContract: EASContract;

  let registry: SchemaRegistry;

  const schema = 'uint256 value';
  let schemaId: string;

  before(async () => {
    [sender] = await ethers.getSigners();
  });

  beforeEach(async () => {
    registryContract = await Contracts.SchemaRegistry.deploy();
    easContract = await Contracts.EAS.deploy(await registryContract.getAddress());

    registry = new SchemaRegistry(await registryContract.getAddress(), { signerOrProvider: sender });

    schemaId = await (await registry.register({ schema, resolverAddress: ZERO_ADDRESS, revocable: true })).wait();
  });

  describe('construction', () => {
    let verifier: OffchainAttestationVerifier;

    beforeEach(async () => {
      verifier = await Contracts.OffchainAttestationVerifier.deploy(
        await easContract.getAddress(),
        OffChainAttestationVersion.Version1
      );
    });

    it('should revert when initialized with an invalid EAS', async () => {
      await expect(
        Contracts.OffchainAttestationVerifier.deploy(ZERO_ADDRESS, OffChainAttestationVersion.Version1)
      ).to.be.revertedWithCustomError(verifier, 'InvalidEAS');
    });

    it('should revert when initialized with an invalid version', async () => {
      await expect(
        Contracts.OffchainAttestationVerifier.deploy(await easContract.getAddress(), 255n)
      ).to.be.revertedWithCustomError(verifier, 'InvalidVersion');
    });

    it('should be properly initialized', async () => {
      expect(await verifier.getEAS()).to.equal(await easContract.getAddress());
      expect(await verifier.getVersion()).to.equal(OffChainAttestationVersion.Version1);
    });
  });
});
