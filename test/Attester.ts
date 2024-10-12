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
      await expect(res).to.emit(resolver, 'Attested').withArgs(schemaId, value);
    });
  });

  describe('multi attestation', () => {
    const schema2 = 'uint256 value2';
    let schemaId2: string;

    beforeEach(async () => {
      schemaId2 = await (
        await registry.register({ schema: schema2, resolverAddress: await resolver.getAddress(), revocable: true })
      ).wait();
    });

    it('should log the attested value', async () => {
      const data = [
        { schema: schemaId, inputs: [10n, 100n, 123456n] },
        { schema: schemaId2, inputs: [5n, 23423234n] }
      ];

      const schemas = data.map((d) => d.schema);
      const inputs = data.map((d) => d.inputs);
      const res = await attester.multiAttest(schemas, inputs);

      for (const { schema, inputs } of data) {
        for (const value of inputs) {
          await expect(res).to.emit(resolver, 'Attested').withArgs(schema, value);
        }
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
      await expect(res).to.emit(resolver, 'Revoked').withArgs(schemaId, value);
    });
  });

  describe('multi revocation', () => {
    const schema2 = 'uint256 value2';
    let schemaId2: string;

    let data: { schema: string; uids: string[]; inputs: bigint[] }[];

    beforeEach(async () => {
      schemaId2 = await (
        await registry.register({ schema: schema2, resolverAddress: await resolver.getAddress(), revocable: true })
      ).wait();

      data = [];

      const input = [
        { schema: schemaId, inputs: [10n, 100n, 123456n] },
        { schema: schemaId2, inputs: [5n, 23423234n] }
      ];

      for (const { schema, inputs } of input) {
        const uids = [];

        for (const value of inputs) {
          const res = await attester.attest(schema, value);
          uids.push(await getUIDFromAttestTx(res));
        }

        data.push({ schema, uids, inputs });
      }
    });

    it('should handle revoke', async () => {
      const schemas = data.map((d) => d.schema);
      const uids = data.map((d) => d.uids);
      const res = await attester.multiRevoke(schemas, uids);

      for (const { schema, inputs } of data) {
        for (const value of inputs) {
          await expect(res).to.emit(resolver, 'Revoked').withArgs(schema, value);
        }
      }
    });
  });
});
