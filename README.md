# zkAmoeba: Smart Contracts

[![Logo](Logo.svg)](https://www.zkamoeba.com/)

zkAmoeba is a layer 2 rollup that uses zero-knowledge proofs to scale Ethereum without compromising on security or
decentralization. Since it's EVM compatible (Solidity/Vyper), 99% of Ethereum projects can redeploy without refactoring
or re-auditing a single line of code. zkAmoeba also uses an LLVM-based compiler that will eventually let developers
write smart contracts in C++, Rust and other popular languages.

This repository contains both L1 and L2 micro smart contracts. For their description see the
[system overview](docs/Overview.md).

## Disclaimer

It is used as a submodule of a private repo. Compilation and test scripts should work without additional tooling, but
others may not.

## License

zkAmoeba contracts are distributed under the terms of the MIT license.

See [LICENSE-MIT](LICENSE-MIT) for details.

## Official Links

- [Website](https://www.zkamoeba.com/)
- [GitHub](https://github.com/ZKAmoeba-Micro)
- [Twitter](https://twitter.com/zkamoeba)

## Disclaimer

zkAmoeba has been through lots of testing and audits. Although it is live, it is still in alpha state and will go
through more audits and bug bounties programs. We would love to hear our community's thoughts and suggestions about it!
It is important to state that forking it now can potentially lead to missing important security updates, critical
features, and performance improvements.
