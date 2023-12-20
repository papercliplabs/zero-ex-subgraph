# 0x Protocol Community Subgraph

0x Protocol community subgraph. These subgraphs contain comprehensive data on the 0x protocol on all networks.

## Table of Contents

- [0x Protocol Community Subgraph](#0x-protocol-community-subgraph)
	- [Table of Contents](#table-of-contents)
	- [Subgraph Deployments](#subgraph-deployments)
	- [Usage Notes](#usage-notes)
	- [Block Diagrams](#block-diagrams)
		- [Order Types and Events](#order-types-and-events)
		- [Contract Contexts](#contract-contexts)
		- [Contract Source Spawning](#contract-source-spawning)
		- [Multiplex](#multiplex)
			- [BatchSell](#batchsell)
			- [MultiHopSell](#multihopsell)
		- [Token Flows](#token-flows)
			- [NativeOrder](#nativeorder)
			- [OptimizedSwap](#optimizedswap)
			- [Transform Erc20](#transform-erc20)
			- [Plugable Liquidity Provider](#plugable-liquidity-provider)
	- [Development](#development)
		- [Contract Addresses](#contract-addresses)
	- [Validation](#validation)


## Subgraph Deployments

| Blockchain Network | The Graph Hosted                                                                                   | The Graph Decentralized | Alchemy |
| ------------------ | -------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| Ethereum Mainnet   | [Mainnet Hosted](https://thegraph.com/hosted-service/subgraph/papercliplabs/0x-protocol-mainnet)   | TODO                    | TODO    |
| Optimism           | [Optimism Hosted](https://thegraph.com/hosted-service/subgraph/papercliplabs/0x-protocol-optimism) | TODO                    | TODO    |

## Usage Notes

-   TODO

## Block Diagrams

### Order Types and Events

```mermaid
graph TD
    P[0x Proxy v4] --> E[Erc20Swap]
    P --> N[NftSwap]
    E --> D[direct]
    E --0xProxy::TransformedERC20--> T[TransformErc20]
	D --> F[optimized]
	F --UniswapV2Pair::Swap--> UniswapV2
	F --SushiSwapPair::Swap--> SushiSwap
	F --PancakeSwapPair::Swap--> PancakeSwap
	F --UniswapV3Pool::Swap--> UniswapV3
	D --0xProxy::LiquidityProviderSwap && PlpSandbox::LiquidityProviderFill---> Plp
	D --> NA[Native]
	NA --0xProxy::LimitOrderFilled--> Limit
	NA --0xProxy::RfqOrderFilled--> Rfq
	NA --0xProxy::OtcOrderFilled--> Otc
	T --> NA
	T --FlashWallet::BridgeFill---> Bridge
	N --0xProxy::ERC721OrderFilled----> Erc721
	N --0xProxy::ERC1155OrderFilled----> Erc1155
```

### Contract Contexts

```mermaid
erDiagram
  ZeroExProxy ||--|| FlashWallet : ""
  FlashWallet ||--|{ Bridge : ""
  ZeroExProxy ||--|| PlpSandbox : ""
  ZeroExProxy ||--|{ Plp : ""
  PlpSandbox ||--|{ Plp : ""
	ZeroExProxy ||--|{ UniswapV2Pair : ""
	ZeroExProxy ||--|{ SushiSwapPair : ""
	ZeroExProxy ||--|{ PancakeSwapPair : ""
	ZeroExProxy ||--|{ UniswapV3Pool : ""
```

### Contract Source Spawning

Top row is all the static data sources with hard coded contract addresses, below that are dynamic data sources

```mermaid
erDiagram
	ZeroExProxy
	FlashWallet
	PlpSandbox
    UniswapV2Factory ||--|{ UniswapV2Pair : "PairCreated"
    SushiSwapFactory ||--|{ SushiSwapPair : "PairCreated"
    PancakeSwapFactory ||--|{ PancakeSwapPair : "PairCreated"
    UniswapV3Factory ||--|{ UniswapV3Pool : "PoolCreated"
```

### Multiplex

Multiplex allows composition of all order types:

```solidity
enum MultiplexSubcall {
    Invalid,
    RFQ,
    OTC,
    UniswapV2,
    UniswapV3,
    LiquidityProvider,
    TransformERC20,
    BatchSell,
    MultiHopSell
}
```

#### BatchSell

```mermaid
graph TD
  	S[Source] --> Subcall1
	S --> Subcall2
	S --> SubcallN
	Subcall1 --> R[Recipient]
	Subcall2 --> R
	SubcallN --> R
```

#### MultiHopSell

```mermaid
graph TD
  	S[Source] --> Subcall1
	Subcall1 --> Subcall2
	Subcall2 --> SubcallN
	SubcallN --> R[Recipient]
```

> Note that BatchSell and MultiHopSell can be composed within each other, offering even more flexibility. I.e a subcall of batch could be a multihop and visa versa.

### Token Flows

#### NativeOrder

Note: OTC is the only one that supports filling in ETH directly, others can through transforms

```mermaid
graph TD
	subgraph A[ZeroExProxy as payer, supports ERC20 + ETH]
		T[Taker] --ETH or ERC20--> Z[ZeroExProxy]
		Z --ETH or ERC20--> M[Maker]
		M --ETH or ERC20--> R[Receipient]
	end
	subgraph B[Taker as payer, supports ERC20 only]
		TB[Taker] --ERC20--> MB[Maker]
		MB--ERC20--> RB[Receipient]
	end
```

#### OptimizedSwap

```mermaid
graph TD
	subgraph ETH output
		SB[sender] --(1) ERC20--> PB[Pools]
		PB --(2) ERC20--> PB
		PB --(3) WETH--> ZB[ZeroExProxy]
		ZB[ZeroExProxy] <--(4) WETH/ETH--> WB[WETH]
		ZB --(5) ETH--> SB
	end
	subgraph ETH input
		SA[sender] --(1) ETH--> ZA[ZeroExProxy]
		ZA <--(2) ETH / WETH--> WA[WETH]
		ZA --(3) WETH--> PA[Pools]
		PA --(4) ERC20--> PA
		PA --(5) ERC20--> SA
	end
	subgraph ERC20 input and output
		SC[sender] --(1) ERC20--> PC[Pools]
		PC --(2) ERC20--> PC
		PC --(3) ETH--> SC
	end
```

#### Transform Erc20

```mermaid
graph TD
	U[Sender] --(1, using proxy as payer) ETH or ERC20--> P[ZeroExProxy]
  P --(1, using proxy as payer) ETH or ERC20--> F[FlashWallet]
	U --(1, using sender as payer) ERC20--> F
	F <--(2: FillQuoteTransformer->fillBridge) ETH or ERC20--> B[Bridge]
	F <--(2: FillQuoteTransformer->NativeOrder) ETH or ERC20--> NativeOrderMaker
	F <--(2: WethTransformer) WETH / ETH--> W[WETH]
	F --(3: AffiliateFeeTransformer)----> FeeRecipient
	F --(3: PayTakerTransformer) ETH or ERC20----> Recipient
```

#### Plugable Liquidity Provider

```mermaid
graph TD
	subgraph B[ETH output]
		SB[Sender] --ERC20--> BB[Provider]
		BB --ETH--> RB[Receipient]
	end
	subgraph A[ETH input]
		SA[Sender] --ETH--> ZA[ZeroExProxy]
		ZA --ETH--> BA[PlpSandbox]
		BA --ETH--> PA[Provider]
		PA --ERC20--> RA[Receipient]
	end
	subgraph C[ERC20 input and output]
		SC[Sender] --ERC20--> BC[Provider]
		BC --ERC20--> RC[Receipient]
	end
```

## Development

Install dependencies

```
yarn install
```

Copy .env.example to .env and populate it

```
cp .env.example .env
```

Run code generation

```
yarn codegen
```

Build

```
yarn build:<network>

# Examples
yarn build:mainnet
yarn build:optimism
```

Deploy to the hosted network

```
yarn deploy-hosted:<network>

# Examples
yarn deploy-hosted:mainnet
yarn deploy-hosted:optimism
```

Deploy to the subgraph studio

```
yarn deploy-studio:<network>

# Examples
yarn deploy-studio:mainnet
yarn deploy-studio:optimism
```

Codegen, build and deploy everywhere in one command

```
yarn auto-deploy:<network> v<version (X.Y.Z)>

# Examples
yarn auto-deploy:mainnet v0.0.2
yarn auto-deploy:optimism v0.0.1
```

Supported networks (for <network> tag):

-   mainnet
-   optimism

Local mainnet development

```
# Create subgraph (only need first time)
yarn create-local

# Deploy
yarn deploy-local
```

### Contract Addresses

-   0x addresses: https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json
-   UniswapV2: https://docs.uniswap.org/contracts/v2/reference/smart-contracts/factory
-   SushiSwap: https://docs.sushi.com/docs/Products/Classic%20AMM/Deployment%20Addresses
-   PancakeSwap: https://docs.pancakeswap.finance/developers/smart-contracts/pancakeswap-exchange/v2-contracts/factory-v2
-   UniswapV3: https://docs.uniswap.org/contracts/v3/reference/deployments

## Validation

TODO
