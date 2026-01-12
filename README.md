# Halal Supply Chain dApp (El Mino)

## Project Overview
Hardhat + Solidity smart contracts and a React (Vite) frontend for a Halal Supply Chain dApp. The system models batch creation, certification, transfers, and consumer verification, with a Sepolia deployment for demo purposes.

## Tech Stack
- Hardhat, Solidity
- ethers.js
- React + Vite

## Deployed Contract (Sepolia)
- `0x8cB4eEED072293230E1B8aA4eAE429E9bd5B79C1`

## Environment Setup
1) Copy `.env.example` to `.env`
2) Fill in values:
   - `PRIVATE_KEY`
   - `ETHERSCAN_API_KEY`
   - `SEPOLIA_RPC_URL`

Note: The frontend currently uses a read-only RPC URL in `frontend/src/config/contract.js`, so consumer verification works without a wallet connection.

## Run Tests
```shell
npx hardhat test
```

## Run Frontend
```shell
cd frontend
npm install
npm run dev
```

## Demo Flow
1) Producer creates batch
2) Transfers to HalalAuthority
3) HalalAuthority certifies
4) Distributor transfers
5) Retailer updates status
6) Consumer verifies batch

## Suggested Screenshots (Submission Checklist)
- Hardhat test passing output
- MetaMask connected (each role)
- Before & after batch state
- MetaMask tx confirmation
- Etherscan tx success
- Consumer verification screen
