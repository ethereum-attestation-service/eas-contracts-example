import {
  EAS,
  Offchain,
  OffChainAttestationVersion,
  SchemaRegistry,
  SignedOffchainAttestation,
  ZERO_ADDRESS
} from '@ethereum-attestation-service/eas-sdk';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import {
  EAS as EASContract,
  OffchainAttestationVerifier,
  SchemaRegistry as SchemaRegistryContract
} from '../typechain-types';
import { HARDHAT_CHAIN_ID, NO_EXPIRATION, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { expect } from './helpers/chai';
import { latest } from './helpers/time';

describe('OffchainAttestationVerifier', () => {
  let sender: Signer;
  let recipient: Signer;

  let registryContract: SchemaRegistryContract;
  let easContract: EASContract;

  let registry: SchemaRegistry;

  const schema = 'uint256 value';
  let schemaId: string;

  before(async () => {
    [sender, recipient] = await ethers.getSigners();
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

  describe('verification', () => {
    let eas: EAS;
    let offchain: Offchain;
    let verifier: OffchainAttestationVerifier;
    let attestation: SignedOffchainAttestation;

    for (const version of [OffChainAttestationVersion.Legacy, OffChainAttestationVersion.Version1]) {
      context(`version ${version}`, () => {
        beforeEach(async () => {
          eas = new EAS(await easContract.getAddress(), { signerOrProvider: ethers.provider });
          offchain = new Offchain(
            {
              address: await easContract.getAddress(),
              version: await eas.getVersion(),
              chainId: HARDHAT_CHAIN_ID
            },
            version,
            eas
          );

          verifier = await Contracts.OffchainAttestationVerifier.deploy(await easContract.getAddress(), version);

          attestation = await offchain.signOffchainAttestation(
            {
              version,
              schema: schemaId,
              recipient: await recipient.getAddress(),
              time: await latest(),
              expirationTime: NO_EXPIRATION,
              revocable: false,
              refUID: ZERO_BYTES32,
              data: ZERO_BYTES
            },
            sender
          );
        });

        it('should verify', async () => {
          expect(
            await verifier.verify.staticCall({
              attester: await sender.getAddress(),
              ...attestation.message,
              signature: attestation.signature
            })
          ).to.be.true;
        });
      });
    }
  });
});
