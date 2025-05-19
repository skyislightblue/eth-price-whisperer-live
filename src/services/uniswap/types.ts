
// Types for Uniswap services

// Interface for hourly volume data with buy/sell distinction
export interface VolumeData {
  timestamp: number;
  volumeUSD: number;
  buyVolume?: number;
  sellVolume?: number;
  swapCount?: number; // Trade count tracking
}

// Define the whale threshold in USD
export const WHALE_THRESHOLD = 500000;
