import Contracts from '../components/Contracts';
import { SchemaRegistry, EAS, ExampleAttester, ExampleUintResolver } from '../typechain-types';
import { getSchemaUID } from '@ethereum-attestation-service/eas-sdk';
import { expect } from './helpers/Chai';

describe('Example Attester', () => {
  let registry: SchemaRegistry;
  let eas: EAS;
  let attester: ExampleAttester;
  let resolver: ExampleUintResolver;

  const schema = 'uint256 value';
  let schemaId: string;

  beforeEach(async () => {
    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.EAS.deploy(await registry.getAddress());

    attester = await Contracts.ExampleAttester.deploy(await eas.getAddress());

    resolver = await Contracts.ExampleUintResolver.deploy(await eas.getAddress());

    await registry.register(schema, await resolver.getAddress(), true);
    schemaId = getSchemaUID(schema, await resolver.getAddress(), true);
  });

  describe('attesting', () => {
    it('should log the attested value', async () => {
      const value = 123456n;
      const res = await attester.attestUint(schemaId, value);
      await expect(res).to.emit(resolver, 'Log').withArgs(value);
    });
  });
});
