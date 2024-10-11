import { getUIDFromAttestTx, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import {
  Attester,
  EAS as EASContract,
  LogResolver,
  SchemaRegistry as SchemaRegistryContract
} from '../typechain-types';
import { ZERO_ADDRESS } from '../utils/Constants';

describe('Example Attester', () => {
  let sender: Signer;

  let registryContract: SchemaRegistryContract;
  let easContract: EASContract;
  let attester: Attester;
  let resolver: LogResolver;

  let registry: SchemaRegistry;

  const schema = 'uint256 value';
  let schemaId: string;

  before(async () => {
    [sender] = await ethers.getSigners();
  });

  beforeEach(async () => {
    registryContract = await Contracts.SchemaRegistry.deploy();
    easContract = await Contracts.EAS.deploy(await registryContract.getAddress());
    attester = await Contracts.Attester.deploy(await easContract.getAddress());
    resolver = await Contracts.LogResolver.deploy(await easContract.getAddress());

    registry = new SchemaRegistry(await registryContract.getAddress(), { signer: sender });

    schemaId = await (
      await registry.register({ schema, resolverAddress: await resolver.getAddress(), revocable: true })
    ).wait();
  });

  describe('construction', () => {
    it('should revert when initialized with an invalid EAS', async () => {
      await expect(Contracts.Attester.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(attester, 'InvalidEAS');
    });
  });

  describe('attestation', () => {
    const value = 123456n;

    it('should log the attested value', async () => {
      const res = await attester.attest(schemaId, value);
      await expect(res).to.emit(resolver, 'Attested').withArgs(value);
    });
  });

  describe('multi attestation', () => {
    const values = [10n, 100n, 123456n];

    it('should log the attested value', async () => {
      const res = await attester.multiAttest(schemaId, values);

      for (const value of values) {
        await expect(res).to.emit(resolver, 'Attested').withArgs(value);
      }
    });
  });

  describe('revocation', () => {
    let uid: string;
    const value = 999n;

    beforeEach(async () => {
      const res = await attester.attest(schemaId, value);
      uid = await getUIDFromAttestTx(res);
    });

    it('should handle revoke', async () => {
      const res = await attester.revoke(schemaId, uid);
      await expect(res).to.emit(resolver, 'Revoked').withArgs(value);
    });
  });

  describe('multi revocation', () => {
    let uids: string[];
    const values = [10n, 999n];

    beforeEach(async () => {
      uids = [];

      for (const value of values) {
        const res = await attester.attest(schemaId, value);
        uids.push(await getUIDFromAttestTx(res));
      }
    });

    it('should handle revoke', async () => {
      const res = await attester.multiRevoke(schemaId, uids);

      for (const value of values) {
        await expect(res).to.emit(resolver, 'Revoked').withArgs(value);
      }
    });
  });
});
