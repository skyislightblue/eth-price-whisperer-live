
import { VolumeData, WHALE_THRESHOLD } from './types';
import { volumeDataCache, isCacheValid, updateCache } from './cache';
import { generateFallbackVolumeData } from './mockData';
import { processSwapsData, fillMissingHours, ETH_USDC_POOL_ID } from './dataProcessing';

// Function to fetch 24-hour trading volume for ETH/USDC pair with buy/sell distinction
export const fetchUniswapVolume = async (whaleMode = false, forceRefresh = false): Promise<VolumeData[]> => {
  // Check cache first if not forcing refresh
  const cacheKey = whaleMode ? 'whale' : 'regular';
  
  if (!forceRefresh && isCacheValid(cacheKey)) {
    console.log(`Using cached ${cacheKey} volume data from ${new Date(volumeDataCache.timestamp).toLocaleTimeString()}`);
    return volumeDataCache[cacheKey] || [];
  }
  
  console.log(`Fetching fresh ${cacheKey} volume data, whale threshold: ${WHALE_THRESHOLD}`);
  
  try {
    // Get UTC timestamp for 24 hours ago
    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    
    // GraphQL query to fetch swap data for the ETH/USDC pool
    // In Uniswap V3, token0 is typically the token with the lower address value
    // For ETH/USDC pool, token0 is USDC and token1 is ETH (WETH)
    const query = `{
      swaps(
        where: {
          pool: "${ETH_USDC_POOL_ID}",
          timestamp_gt: ${oneDayAgo}
        }
        orderBy: timestamp
        first: 1000
      ) {
        timestamp
        amount0In
        amount0Out
        amount1In
        amount1Out
        amountUSD
      }
    }`;

    // Send request to The Graph API
    const response = await fetch(
      "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.swaps) {
      throw new Error("Invalid data structure returned from API");
    }
    
    // Process the raw swaps data
    const swaps = data.data.swaps;
    const processedData = processSwapsData(swaps, whaleMode);
    
    console.log(`Generated ${processedData.length} hourly data points after filtering`);
    if (processedData.length > 0) {
      console.log(`First hourly data point: timestamp=${new Date(processedData[0].timestamp).toLocaleTimeString()}, swapCount=${processedData[0].swapCount}`);
    }
    
    // In whale mode, we don't fill empty hours because it makes more sense to see just the actual whale trades
    let finalResult: VolumeData[];
    
    if (!whaleMode) {
      // Fill in any missing hours with zero volume
      finalResult = fillMissingHours(processedData, oneDayAgo * 1000, Date.now());
    } else {
      finalResult = processedData;
    }
    
    // Update cache
    updateCache(cacheKey, finalResult);
    
    console.log(`Returning ${finalResult.length} final data points for ${cacheKey} mode`);
    return finalResult;
  } catch (error) {
    console.error("Error fetching Uniswap volume data:", error);
    
    // If we can't fetch data, try using mock data as fallback
    console.warn("Failed to fetch real Uniswap data, using fallback data");
    return generateFallbackVolumeData(whaleMode);
  }
};

// Re-export types for external use
export * from './types';
