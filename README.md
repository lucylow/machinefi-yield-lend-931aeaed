# MachineFi Lending Pool

> DePIN-Inspired RWA Collateralizer on BNB Chain  
> Make productive machines bankable on-chain.

MachineFi Lending Pool is a BNB Chain-native protocol that lets operators borrow stablecoins against the future yield of productive hardware such as Helium hotspots, Hivemapper dashcams, and EV chargers. The system combines on-chain device identity, proof-of-operation, oracle-driven valuation, collateralized lending, liquidations, treasury routing, and governance into one modular architecture. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Table of Contents

- [Overview](#overview)
- [Core Thesis](#core-thesis)
- [System Architecture](#system-architecture)
- [Chain Design](#chain-design)
- [Protocol Modules](#protocol-modules)
- [Data Flow](#data-flow)
- [State Machines](#state-machines)
- [Risk Model](#risk-model)
- [Fee Model](#fee-model)
- [Treasury and Governance](#treasury-and-governance)
- [Oracles and Proofs](#oracles-and-proofs)
- [Liquidation Engine](#liquidation-engine)
- [Indexing and Analytics](#indexing-and-analytics)
- [Frontend Read Model](#frontend-read-model)
- [Security Model](#security-model)
- [Deployment Model](#deployment-model)
- [Testing Strategy](#testing-strategy)
- [Developer Guide](#developer-guide)
- [Roadmap](#roadmap)

***

## Overview

The protocol’s goal is to turn real-world productive machines into financeable on-chain collateral. Instead of treating hardware as a static NFT, the system treats a device as a yield-bearing economic object whose proof freshness, realized output, and risk score affect borrow power over time. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

The repository framing already includes the core building blocks: `HardwareNFT`, `YieldToken`, `LendingPool`, `OracleConsumer`, `Liquidator`, plus governance and treasury components such as `MACH`, `MachineFiGovernor`, and `Treasury`. This README turns that architecture into a blockchain-first protocol specification with explicit state flow, event design, risk controls, and deployment assumptions. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Core Thesis

The protocol follows one thesis:

1. A machine produces measurable output.
2. Output is verified through proofs and oracle data.
3. Verified output becomes normalized future yield.
4. Future yield is priced as collateral.
5. Collateral unlocks stablecoin liquidity.
6. Risk is continuously re-evaluated.
7. Unsafe positions are liquidated deterministically. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

That thesis is the product, the risk model, and the business model all at once. The blockchain layer must make every step explicit and auditable. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## System Architecture

```mermaid
flowchart LR
  A[Physical Device<br/>Helium / Hivemapper / EV Charger]
  B[Proof of Operation<br/>Greenfield / Signed Heartbeat]
  C[Oracle Consumer<br/>Price + Yield + Freshness]
  D[HardwareNFT<br/>On-chain identity]
  E[YieldToken<br/>Claim on future yield]
  F[LendingPool<br/>Borrow / Repay / Health]
  G[Liquidator<br/>Permissionless unwind]
  H[Treasury<br/>Fees / Reserve / Revenue]
  I[Governor<br/>Risk params / upgrades]

  A --> B --> C --> D
  D --> E --> F
  C --> F
  F --> G
  F --> H
  I --> D
  I --> F
  I --> C
  I --> H
```

The architecture is intentionally modular. Device identity, proof verification, pricing, lending, liquidation, treasury, and governance are separate concerns so that the system can fail safely without collapsing into a single monolithic contract. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Chain Design

The repo context points to BNB Chain as the primary settlement layer, with opBNB for high-frequency updates and BNB Greenfield for proof metadata and off-chain attestations. This split is useful because core loan settlement needs finality and liquidity, while proof refresh and telemetry can happen more frequently and cheaply. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

```mermaid
flowchart TB
  BSC[BSC Mainnet / Testnet<br/>Settlement + collateral + governance]
  OP[opBNB<br/>Frequent proof/yield refresh]
  GF[BNB Greenfield<br/>Proof metadata / CID storage]

  OP --> BSC
  GF --> OP
  GF --> BSC
```

A clean chain boundary model matters. BSC should remain the canonical source of truth for debt, collateral, liquidation, and governance state, while opBNB and Greenfield support faster proof and metadata flows. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Protocol Modules

### HardwareNFT

`HardwareNFT` represents each productive machine as an on-chain asset. It stores device identity, registration state, proof timestamps, and ownership bindings so that a machine is not just a picture NFT but a registry entry with protocol meaning. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Recommended fields include:
- `deviceId`
- `deviceType`
- `owner`
- `registrationTime`
- `lastProofTimestamp`
- `isActive`
- `greenfieldProofCID` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

The contract should emit lifecycle events such as `DeviceRegistered`, `ProofSubmitted`, `DeviceStatusChanged`, and `DeviceRevoked` to make indexing reliable. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

### YieldToken

`YieldToken` represents a claim on future machine rewards. It should be minted only by the lending pool or a trusted factory and burned when the position is repaid, liquidated, or settled. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

The token is not just a transfer asset; it is part of the collateral accounting model. Its supply should match the yield allocation tied to the underlying device or position. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

### LendingPool

`LendingPool` is the canonical borrowing engine. It must manage deposit, borrow, repay, interest accrual, collateral refresh, and liquidation with deterministic math and explicit state transitions. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

Its responsibilities include:
- enforcing LTV ceilings,
- using oracle values for collateral pricing,
- tracking accrued debt,
- freezing or penalizing stale positions,
- exposing health factor data for frontends and keepers. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

### OracleConsumer

`OracleConsumer` aggregates reward token price, yield performance, and proof freshness. The README framing explicitly calls for multiple data sources, including Chainlink-style feeds, subgraph queries, and Greenfield proof verification. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

A good oracle layer should not simply return a price. It should return:
- normalized value,
- confidence score,
- freshness status,
- anomaly flags,
- stale-data fallback behavior. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

### Liquidator

`Liquidator` makes liquidation permissionless. The protocol depends on deterministic liquidation rules so that anyone can unwind risky positions when thresholds are breached. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

The liquidation engine should support:
- warning thresholds,
- partial liquidation,
- full liquidation,
- keeper incentives,
- residual collateral handling. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Data Flow

```mermaid
sequenceDiagram
  participant Device
  participant Greenfield
  participant Oracle
  participant HardwareNFT
  participant LendingPool
  participant Liquidator

  Device->>Greenfield: submit proof / heartbeat
  Greenfield->>Oracle: proof reference available
  Oracle->>HardwareNFT: update freshness / status
  Oracle->>LendingPool: collateral value + confidence
  LendingPool->>LendingPool: compute borrow power / health
  User->>LendingPool: deposit + borrow
  LendingPool->>LendingPool: mint debt / transfer stablecoin
  Liquidator->>LendingPool: liquidate if unhealthy
```

The flow is designed so that the device does not directly control credit. Instead, proofs and oracle data update the protocol’s view of the device, and the lending engine uses that view to price risk. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## State Machines

The repo’s framing strongly suggests explicit lifecycle states rather than boolean flags. That is important for protocol clarity and auditability. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

### Device State

```mermaid
stateDiagram-v2
  [*] --> Unregistered
  Unregistered --> Registered
  Registered --> ProofActive
  ProofActive --> Stale
  Stale --> ProofActive
  ProofActive --> Frozen
  Frozen --> Registered
  Registered --> Revoked
  ProofActive --> Revoked
```

### Position State

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Healthy
  Healthy --> Warning
  Warning --> AtRisk
  AtRisk --> Liquidating
  Liquidating --> Repaid
  Liquidating --> Closed
  Healthy --> Repaid
  Warning --> Repaid
  AtRisk --> Repaid
```

State machines make it easier to reason about what transitions are allowed and what events must fire. This is especially useful when proof freshness, oracle delay, and liquidation logic interact. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Risk Model

The protocol’s main risk drivers are:
- proof staleness,
- reward token volatility,
- oracle manipulation,
- device downtime,
- undercollateralization,
- liquidation slippage,
- chain sync or data availability issues. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

A strong risk model should express those risks numerically through:
- LTV,
- health factor,
- freshness score,
- confidence score,
- haircut factor,
- liquidation threshold. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

Example model:
- Fresh proof increases confidence.
- Stale proof reduces borrow power.
- Yield underperformance lowers collateral value.
- Oracle disagreement triggers conservative fallback pricing. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Fee Model

The repo material already frames a protocol fee structure with origination fees, interest spreads, liquidation fees, and treasury allocation. For a blockchain-first README, define them clearly: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

| Fee Type | Trigger | Purpose |
|---|---|---|
| Origination fee | New borrow position | Protocol revenue and risk coverage |
| Interest spread | Ongoing debt accrual | Treasury, lenders, reserve |
| Liquidation fee | Position unwind | Keeper incentive and protocol income |
| Verification fee | Proof / oracle checks | Infrastructure and attestation cost |
| Premium service fee | Optional operator tier | Faster refresh, analytics, higher service level |

Fees should be configured through governance and not hardcoded into frontends. That allows the protocol to evolve without breaking accounting. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Treasury and Governance

The repo’s governance framing already includes MACH token governance, timelock control, and treasury routing. The right way to document this is to separate control, value capture, and risk management. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

```mermaid
flowchart LR
  Fees[Protocol Fees]
  Treasury[Treasury]
  Reserve[Insurance Reserve]
  LP[Liquidity Providers]
  Stakers[MACH Stakers]
  Gov[Governance]

  Fees --> Treasury
  Treasury --> Reserve
  Treasury --> LP
  Treasury --> Stakers
  Gov --> Treasury
  Gov --> Risk
```

Governance should be able to adjust:
- LTV limits,
- liquidation thresholds,
- supported device classes,
- fee rates,
- oracle providers,
- treasury allocation weights. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

The treasury should expose transparent balances and inflow sources so that protocol health is visible to users, partners, and auditors. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Oracles and Proofs

The system depends on proof-of-operation and oracle data because machine yield is not fully endogenous to the chain. The repo’s notes already mention Greenfield proofs, manufacturer signatures, and multi-oracle consensus. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

A clean oracle model should answer:
- Is the proof fresh?
- Is the source credible?
- Is the value within tolerance?
- Is the feed stale?
- What fallback should apply if the feed fails? [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

Suggested proof pipeline:
1. Device signs heartbeat.
2. Heartbeat is uploaded to Greenfield.
3. Oracle verifies signature and timestamp.
4. Oracle aggregates yield and price data.
5. LendingPool updates collateral value and health. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

This keeps the protocol from trusting a single raw data source.

***

## Liquidation Engine

Liquidation should be permissionless and deterministic. The repo content supports this with keeper role ideas, liquidation bonus logic, and threshold-based triggers. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

```mermaid
flowchart TB
  H[Healthy Position]
  W[Warning Zone]
  A[At Risk]
  L[Liquidating]
  C[Closed]

  H --> W
  W --> A
  A --> L
  L --> C
```

Key requirements:
- Use threshold-based liquidations.
- Prefer partial liquidation before full liquidation.
- Emit detailed state change events.
- Preserve any excess value after debt recovery where policy allows.
- Keep liquidation math reproducible and testable. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Indexing and Analytics

The repo material explicitly references subgraph indexing and event-based read models. That should become a first-class README section because the frontend, dashboards, and keepers need clean event streams. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Events to index:
- `DeviceRegistered`
- `ProofSubmitted`
- `CollateralUpdated`
- `Borrowed`
- `Repaid`
- `InterestAccrued`
- `Liquidated`
- `TreasuryFeesCollected`
- `ParameterUpdated` [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Good events are critical because they make it possible to build:
- dashboard cards,
- device tables,
- risk alerts,
- liquidation feeds,
- treasury analytics,
- governance history. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Frontend Read Model

The frontend should not depend only on raw contract calls. The repo also includes a strong demo and fallback data philosophy, which points to an indexer-plus-contract read model. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Recommended read layers:
- Direct contract reads for current position state.
- Indexed events for history and analytics.
- Cached fallback data for offline or demo states.
- Mock data only when live values are unavailable. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

This makes the app feel live even when RPC calls fail or data is sparse.

***

## Security Model

The repo content stresses security controls such as access control, oracle fallback, reentrancy protection, and exact math. A good README should make these explicit. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Threats to document:
- fake proof submissions,
- duplicate device registration,
- stale or manipulated oracles,
- liquidation griefing,
- precision mismatches,
- unauthorized minting or burning,
- governance capture. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

Mitigations:
- role separation,
- custom errors,
- guarded state transitions,
- conservative fallback pricing,
- permissionless liquidation,
- timelocked governance. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Deployment Model

The repo’s structure strongly implies BSC testnet/mainnet deployment with opBNB and Greenfield integration. Document deployment as a chain-aware process: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

1. Deploy `HardwareNFT`.
2. Deploy `YieldToken` or factory.
3. Deploy `OracleConsumer`.
4. Deploy `LendingPool`.
5. Deploy `Liquidator`.
6. Deploy treasury/governance components.
7. Configure addresses, chain IDs, and oracle sources. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

For a real README, include:
- chain IDs,
- required RPC endpoints,
- supported reward token addresses,
- treasury and governor addresses,
- role assignment steps. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Testing Strategy

The repo documentation repeatedly emphasizes edge-case testing, risk validation, and protocol invariants. That means the README should also describe the testing model. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Test categories:
- device registration,
- duplicate device prevention,
- proof submission,
- oracle staleness,
- collateral refresh,
- borrow limits,
- repayment flows,
- liquidation flows,
- governance updates,
- treasury routing. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

Add invariant tests for:
- non-existent devices cannot be borrowed against,
- stale data cannot increase borrow power,
- liquidated positions cannot remain active,
- burned yield claims cannot be reused. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

***

## Developer Guide

A good developer workflow for this repo should include:
- local chain setup,
- deployment order,
- indexer bootstrapping,
- frontend env variables,
- mock/demo mode,
- contract verification steps. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Suggested section structure:
```md
## Local Development
## Contract Deployment
## Oracle Simulation
## Proof Submission
## Frontend Configuration
## Event Indexing
## Test Execution
```

This keeps the repo usable for contributors and judges without making them reverse-engineer the architecture.

***

## Roadmap

The attached materials describe a staged roadmap from prototype to pilot to mainnet launch, including BNB Chain testnet, mainnet, and expansion to more device classes. A README should reflect that maturity path. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)

Recommended roadmap:
- Phase 1: architecture cleanup and contract hardening.
- Phase 2: proof verification and oracle integration.
- Phase 3: treasury, fees, and governance.
- Phase 4: indexing and frontend integration.
- Phase 5: testnet pilot.
- Phase 6: mainnet readiness and audit.

***

## Suggested README Diagram Pack

If you want this README to feel truly “super technical,” include these diagrams:
- system architecture
- chain boundary map
- device lifecycle state machine
- position lifecycle state machine
- proof and oracle data flow
- liquidation flow
- fee routing flow
- governance flow
- deployment topology
- frontend read model [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6d94f97a-5695-4dde-bbab-f40e64ab650e/RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx)

***

## Closing Position

MachineFi Lending Pool is not just a lending app. It is a BNB Chain-native DePIN RWA primitive that turns productive hardware into verifiable collateral and stablecoin liquidity. The strongest README should make that architecture obvious in the first few screens, then prove it with modules, diagrams, events, and security assumptions. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/87326718/6317b0dd-6a00-449b-992c-219f81a499d7/2.-RWA-Demo-Day-Project-Recruitment-Officially-Launched.-DePIN-Inspired-RWA-Collateralizer.docx?AWSAccessKeyId=ASIA2F3EMEYE3TOFKKGZ&Signature=yyRLtITFUso5xHdKkXgZEO8OSbQ%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF0aCXVzLWVhc3QtMSJHMEUCIQDy4mSJGynonYpalSbVLdoY7tjcFDCUa6ElR%2FQEw6IYoAIga%2F8chvQlJFmSvXILqj9E1CTA63Z1m3M6lzI8uFb9Yiwq8wQIJhABGgw2OTk3NTMzMDk3MDUiDGuE09mAkfQo5EseCCrQBIPEK8oijWTheAzfNP91ZAvyC8V9erLvyg9au0VpEhqcETDty7pInUsnGDbJthkLuq9uZlvo2rY5FcyRO8W3XnoIS%2FItIHT3PyZsZlhcEo5gDR5y4xRlAjjUqSNEN%2BcBCsPovOXT%2BQTmGO7VSEtIiwELhbirixUGliuwvqpR4nnwX2foTv07gawhPlDhzvqhjtnIH5uz1Y8CmYPbP5C97GrN3yBCJaSeb%2B%2B97pJP2YuB5X3uo7zM2R69tn7B8QJN5oJzrx7QqSLqA2gzLh17v9IBO52gdzcVVbpjvdXy4hUf8qxHvZcDu6haX54Oi1C3AqwaJPUeUfQLBGvF8QCosd%2F%2FZJ6mSxMqaMMhSLUJjYVmSlXukU0c2%2BYe%2BmgAI3mIYmY9DcSK%2Bk8vQqIE%2B6Ulgk6lpcj20CbxCnh2C3dnCL3HxkqRN6YrGQGG8uZXeqEXpRWr%2Fx8huhxXp7M6FN8eFLFZXdFJPf7%2Fa3DAj36QiCFXbMUjNCYAT9VDgN7oAvqxJspkPz%2F4EfVywltMbKUzdexSSNgHrHAURwv6STUXTcqQamYfo2sXl4tfSOlgR%2BtNgEUkLax%2BEsXI%2FbUopfqK6UZ8zrqFtQQtDJbdJLSdamZFThg4zPqAV%2Bcf69DODoDI6cYYTxC%2FXdZ%2FGwdI72QU84HPJp%2BU2KSlCUzmWCLTJVdWJ8aP7eXwgqjmLxWG5I9kbikmO6bsKqm0QF18buYcQX3mGqVWrCQMJjsMnuK0LM5V3fEh33VGtDZlL7A4EA4ecKKtNo5pwe7fjE3Uf9uOQVIw%2BN%2BpzgY6mAFauJG0YRglcD9k9BV7DRnux9xthaUEMb0dPVoDaj64aVND6Nb11%2FGEV12Io3P6sQRFHxI0OLpSWx%2FtGFNX9Hf%2BUQuEStJI81OKXjjou%2B3jBwTfIJLjHJBCf5t9WY2sfA%2F3qd36%2Bhx5j%2FN7HQt9xxH0IFqdz5c2sxKH8Ay%2Fpu8wn5NC4N2T2jfkYYo5dAP93D%2Bzbgs0qWEz3w%3D%3D&Expires=1774877652)
