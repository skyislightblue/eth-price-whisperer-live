
import { VolumeData, WHALE_THRESHOLD } from './types';

// ETH/USDC pool ID for Uniswap V3 on mainnet
// This is the 0.3% fee tier pool ID
export const ETH_USDC_POOL_ID = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8";

// Process GraphQL response data into hourly volume data
export const processSwapsData = (swaps: any[], whaleMode: boolean): VolumeData[] => {
  // Process swaps to categorize by hour and buy/sell direction
  const hourlyData: Record<number, { buyVolume: number, sellVolume: number, swapCount: number }> = {};
  
  console.log(`Processing ${swaps.length} swaps with whale threshold: ${WHALE_THRESHOLD}, whale mode: ${whaleMode}`);
  
  let totalSwaps = 0;
  let includedSwaps = 0;
  
  // Process each swap and categorize as buy or sell
  swaps.forEach((swap: any) => {
    const timestamp = parseInt(swap.timestamp) * 1000; // Convert to milliseconds
    const hourTimestamp = Math.floor(timestamp / 3600000) * 3600000; // Group by hour
    
    const amount0In = parseFloat(swap.amount0In || '0');
    const amount1Out = parseFloat(swap.amount1Out || '0');
    const amount1In = parseFloat(swap.amount1In || '0');
    const amount0Out = parseFloat(swap.amount0Out || '0');
    const amountUSD = parseFloat(swap.amountUSD || '0');
    
    totalSwaps++;
    
    // Skip if whale mode is active and this isn't a whale trade
    if (whaleMode && amountUSD <= WHALE_THRESHOLD) {
      return;
    }
    
    includedSwaps++;
    
    if (!hourlyData[hourTimestamp]) {
      hourlyData[hourTimestamp] = { buyVolume: 0, sellVolume: 0, swapCount: 0 };
    }
    
    hourlyData[hourTimestamp].swapCount++;
    
    // In ETH/USDC pool, token0 is USDC, token1 is ETH
    // If USDC in and ETH out, it's a sell ETH
    // If ETH in and USDC out, it's a buy ETH
    if (amount0In > 0 && amount1Out > 0) {
      // This is buying ETH with USDC
      hourlyData[hourTimestamp].buyVolume += amountUSD;
    } else if (amount1In > 0 && amount0Out > 0) {
      // This is selling ETH for USDC
      hourlyData[hourTimestamp].sellVolume += amountUSD;
    }
  });
  
  console.log(`Processed ${totalSwaps} total swaps, included ${includedSwaps} swaps after whale filtering`);
  
  // Convert to array format for the chart
  const result: VolumeData[] = Object.entries(hourlyData)
    .filter(([_, volumes]) => volumes.buyVolume > 0 || volumes.sellVolume > 0) // Filter out empty hours
    .map(([timestamp, volumes]) => ({
      timestamp: parseInt(timestamp),
      volumeUSD: volumes.buyVolume + volumes.sellVolume,
      buyVolume: volumes.buyVolume,
      sellVolume: volumes.sellVolume,
      swapCount: volumes.swapCount
    }));
  
  // Sort by timestamp
  result.sort((a, b) => a.timestamp - b.timestamp);
  
  return result;
};

// Fill missing hours with zero values for complete data
export const fillMissingHours = (data: VolumeData[], startTime: number, endTime: number): VolumeData[] => {
  const completeHourlyData: VolumeData[] = [];
  
  for (let time = startTime; time <= endTime; time += 3600000) {
    const hourStart = Math.floor(time / 3600000) * 3600000;
    const existingData = data.find(item => item.timestamp === hourStart);
    
    if (existingData) {
      completeHourlyData.push(existingData);
    } else {
      completeHourlyData.push({
        timestamp: hourStart,
        volumeUSD: 0,
        buyVolume: 0,
        sellVolume: 0,
        swapCount: 0
      });
    }
  }
  
  return completeHourlyData;
};
