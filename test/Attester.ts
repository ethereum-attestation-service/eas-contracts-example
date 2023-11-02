import { SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import {
  Attester,
  EAS as EASContract,
  LogResolver,
  SchemaRegistry as SchemaRegistryContract
} from '../typechain-types';
import { expect } from './helpers/Chai';

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

    registry = new SchemaRegistry(await registryContract.getAddress(), { signerOrProvider: sender });

    schemaId = await (
      await registry.register({ schema, resolverAddress: await resolver.getAddress(), revocable: true })
    ).wait();
  });

  describe('attesting', () => {
    it('should log the attested value', async () => {
      const value = 123456n;
      const res = await attester.attestUint(schemaId, value);
      await expect(res).to.emit(resolver, 'Log').withArgs(value);
    });
  });
});
