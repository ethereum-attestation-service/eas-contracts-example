import {
  EAS,
  Offchain,
  OffchainAttestationParams,
  OffChainAttestationVersion,
  SchemaRegistry,
  SignedOffchainAttestation,
  ZERO_ADDRESS
} from '@ethereum-attestation-service/eas-sdk';
import { encodeBytes32String, Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../components/Contracts';
import {
  EAS as EASContract,
  OffchainAttestationVerifier,
  SchemaRegistry as SchemaRegistryContract
} from '../typechain-types';
import { HARDHAT_CHAIN_ID, NO_EXPIRATION, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { expect } from './helpers/chai';
import { duration, latest } from './helpers/time';

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
      verifier = await Contracts.OffchainAttestationVerifier.deploy(await easContract.getAddress());
    });

    it('should revert when initialized with an invalid EAS', async () => {
      await expect(Contracts.OffchainAttestationVerifier.deploy(ZERO_ADDRESS)).to.be.revertedWithoutReason();
    });

    it('should be properly initialized', async () => {
      expect(await verifier.getEAS()).to.equal(await easContract.getAddress());
    });
  });

  describe('verification', () => {
    let eas: EAS;
    let offchain: Offchain;
    let verifier: OffchainAttestationVerifier;
    let attestation: SignedOffchainAttestation;

    interface Signature {
      r: string;
      s: string;
      v: number;
    }

    interface VerifyOptions {
      attester?: string;
      message?: Partial<OffchainAttestationParams>;
      signature?: Signature;
    }

    const verify = async (
      attestation: SignedOffchainAttestation,
      { attester, message, signature }: VerifyOptions = {}
    ): Promise<boolean> =>
      verifier.verify.staticCall({
        attester: attester ?? (await sender.getAddress()),
        ...{ ...attestation.message, ...(message ?? {}) },
        signature: { ...attestation.signature, ...(signature ?? {}) }
      });

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

          verifier = await Contracts.OffchainAttestationVerifier.deploy(await easContract.getAddress());

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
          expect(await verify(attestation)).to.be.true;
        });

        it('should revert when attempting to verify with an invalid attester', async () => {
          expect(await verify(attestation, { attester: ZERO_ADDRESS })).to.be.false;
        });

        it('should revert when attempting to verify with an incompatible version', async () => {
          expect(await verify(attestation, { message: { version: OffChainAttestationVersion.Version1 + 1000 } })).to.be
            .false;
        });

        it('should revert when attempting to verify with an invalid time', async () => {
          expect(await verify(attestation, { message: { time: (await latest()) + duration.years(1n) } })).to.be.false;
        });

        it('should revert when attempting to verify with an invalid schema', async () => {
          expect(await verify(attestation, { message: { schema: ZERO_BYTES32 } })).to.be.false;
        });

        it('should revert when attempting to verify with an invalid referenced attestation', async () => {
          expect(await verify(attestation, { message: { refUID: encodeBytes32String('BAD') } })).to.be.false;
        });

        it('should revert when attempting to verify with an invalid signature', async () => {
          expect(
            await verify(attestation, {
              signature: { r: encodeBytes32String('BAD'), s: attestation.signature.s, v: attestation.signature.v }
            })
          ).to.be.false;
        });
      });
    }
  });
});
