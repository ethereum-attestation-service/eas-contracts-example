import { ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import {
  Attester__factory,
  EAS__factory,
  LogResolver__factory,
  OffchainAttestationVerifier__factory,
  SchemaRegistry__factory
} from '../typechain-types';

export * from '../typechain-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer U>
  ? U
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends (...args: any) => infer U
    ? U
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any;

type Contract<F extends ContractFactory> = AsyncReturnType<F['deploy']>;

export interface ContractBuilder<F extends ContractFactory> {
  metadata: {
    bytecode: string;
  };
  deploy(...args: Parameters<F['deploy']>): Promise<Contract<F>>;
  attach(address: string, passedSigner?: Signer): Promise<Contract<F>>;
}

export type FactoryConstructor<F extends ContractFactory> = {
  new (signer?: Signer): F;
  abi: unknown;
  bytecode: string;
};

export const deployOrAttach = <F extends ContractFactory>(
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
): ContractBuilder<F> => {
  return {
    metadata: {
      bytecode: FactoryConstructor.bytecode
    },
    deploy: async (...args: Parameters<F['deploy']>): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? ((await ethers.getSigners())[0] as Signer);

      return new FactoryConstructor(defaultSigner).deploy(...(args || [])) as Promise<Contract<F>>;
    },
    attach: attachOnly<F>(FactoryConstructor, initialSigner).attach
  };
};

export const attachOnly = <F extends ContractFactory>(
  FactoryConstructor: FactoryConstructor<F>,
  initialSigner?: Signer
) => {
  return {
    attach: async (address: string, signer?: Signer): Promise<Contract<F>> => {
      const defaultSigner = initialSigner ?? ((await ethers.getSigners())[0] as Signer);
      return new FactoryConstructor(signer ?? defaultSigner).attach(address) as Contract<F>;
    }
  };
};

const getContracts = (signer?: Signer) => ({
  connect: (signer: Signer) => getContracts(signer),

  EAS: deployOrAttach(EAS__factory, signer),
  Attester: deployOrAttach(Attester__factory, signer),
  LogResolver: deployOrAttach(LogResolver__factory, signer),
  OffchainAttestationVerifier: deployOrAttach(OffchainAttestationVerifier__factory, signer),
  SchemaRegistry: deployOrAttach(SchemaRegistry__factory, signer)
});

export default getContracts();
