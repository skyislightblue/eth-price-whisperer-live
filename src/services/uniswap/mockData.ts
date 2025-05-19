
import { VolumeData, WHALE_THRESHOLD } from './types';

// Function to generate fallback volume data with buy/sell distinction when API fails
export const generateFallbackVolumeData = (whaleMode = false): VolumeData[] => {
  const data: VolumeData[] = [];
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  // Generate 24 hours of fallback data
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * hourInMs);
    
    // More realistic number of swaps per hour for Uniswap V3 ETH/USDC pool
    // Typically hundreds of swaps per hour
    const swapCount = Math.floor(200 + Math.random() * 300); // 200-500 swaps per hour
    let hourlyBuyVolume = 0;
    let hourlySellVolume = 0;
    let includedSwaps = 0;
    
    // Generate individual swaps
    for (let j = 0; j < swapCount; j++) {
      // Random volume between $5,000 and $1,500,000
      const swapVolume = 5000 + Math.random() * 1495000;
      
      // Skip if whale mode is active and this isn't a whale trade
      if (whaleMode && swapVolume <= WHALE_THRESHOLD) continue;
      
      includedSwaps++;
      const isBuy = Math.random() > 0.5;
      
      if (isBuy) {
        hourlyBuyVolume += swapVolume;
      } else {
        hourlySellVolume += swapVolume;
      }
    }
    
    const totalVolume = hourlyBuyVolume + hourlySellVolume;
    
    // Only add data point if there's volume (important for whale mode)
    if (totalVolume > 0) {
      data.push({
        timestamp,
        volumeUSD: totalVolume,
        buyVolume: hourlyBuyVolume,
        sellVolume: hourlySellVolume,
        swapCount: includedSwaps
      });
    }
  }
  
  console.log(`Generated ${data.length} fallback data points with whaleMode=${whaleMode}`);
  console.log(`First data point swapCount: ${data[0]?.swapCount || 0}`);
  
  // Don't store this in cache since it's fallback data
  
  return data;
};
