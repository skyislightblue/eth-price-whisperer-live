
# ETH tracker

**URL**: [https://skyislightblue.github.io/eth-tracker/](https://skyislightblue.github.io/eth-tracker/)

This is a lightweight Ethereum market dashboard that combines off-chain and on-chain data to help users monitor short-term ETH market activity in real time.

## 🔍 Features
The tracker includes four core visualizations:

- *24-Hour Price History*
  - Real-time ETH price chart sourced from the [CoinGecko API](https://www.coingecko.com/)

- *Net ETH Flow (Uniswap) vs Price*
  - Visualizes net ETH inflow/outflow on Uniswap alongside market price to reflect liquidity dynamics

- *24-Hour ETH/USDC Trading Volume (Uniswap)*
  - Displays total trading volume for the ETH/USDC pair on Uniswap over the past 24 hours

- *ETH/USDC Buy/Sell Volume Ratio (Uniswap)*
  - Estimates market sentiment by comparing buy vs. sell volume for ETH/USDC trades on Uniswap
 
## ⚙️ Tech Stack
- Frontend:
  - Vite
  - TypeScript
  - React
  - Tailwind CSS
  - shadcn/ui
    
- Data Sources:
  - *ETH price:* [CoinGecko API](https://www.coingecko.com/en/api)
  - *Uniswap on-chain data:* [The Graph](https://thegraph.com/)
