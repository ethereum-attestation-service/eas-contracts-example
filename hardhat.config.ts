import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-dependency-compiler';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: {
        count: 20,
        accountsBalance: '10000000000000000000000000000000000000000000000'
      },
      allowUnlimitedContractSize: true
    }
  },

  solidity: {
    compilers: [
      {
        version: '0.8.23',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          metadata: {
            bytecodeHash: 'none'
          }
        }
      },
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000
          },
          metadata: {
            bytecodeHash: 'none'
          }
        }
      }
    ]
  },

  dependencyCompiler: {
    paths: [
      '@ethereum-attestation-service/eas-contracts/contracts/EAS.sol',
      '@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol'
    ]
  },

  typechain: {
    target: 'ethers-v6'
  },

  mocha: {
    color: true,
    bail: true
  }
};

export default config;
