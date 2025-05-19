
// Service for fetching Uniswap V3 trading data from The Graph API

// ETH/USDC pool ID for Uniswap V3 on mainnet
// This is the 0.3% fee tier pool ID
const ETH_USDC_POOL_ID = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8";

// Interface for hourly volume data with buy/sell distinction
export interface VolumeData {
  timestamp: number;
  volumeUSD: number;
  buyVolume?: number;
  sellVolume?: number;
  swapCount?: number; // Added swapCount for trade count tracking
}

// Define the whale threshold in USD
export const WHALE_THRESHOLD = 500000;

// Cache for volume data to avoid redundant API calls
let volumeDataCache: {
  regular: VolumeData[] | null;
  whale: VolumeData[] | null;
  timestamp: number;
} = {
  regular: null,
  whale: null,
  timestamp: 0
};

// Function to fetch 24-hour trading volume for ETH/USDC pair with buy/sell distinction
export const fetchUniswapVolume = async (whaleMode = false, forceRefresh = false): Promise<VolumeData[]> => {
  // Check cache first if not forcing refresh
  const cacheKey = whaleMode ? 'whale' : 'regular';
  const now = Date.now();
  
  if (!forceRefresh && 
      volumeDataCache[cacheKey] !== null && 
      (now - volumeDataCache.timestamp) < 300000) { // 5 minute cache
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
    
    // Process swaps to categorize by hour and buy/sell direction
    const swaps = data.data.swaps;
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
      .filter(([_, volumes]) => volumes.buyVolume > 0 || volumes.sellVolume > 0) // Filter out empty hours (important for whale mode)
      .map(([timestamp, volumes]) => ({
        timestamp: parseInt(timestamp),
        volumeUSD: volumes.buyVolume + volumes.sellVolume,
        buyVolume: volumes.buyVolume,
        sellVolume: volumes.sellVolume,
        swapCount: volumes.swapCount
      }));
    
    // Sort by timestamp
    result.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`Generated ${result.length} hourly data points after filtering`);
    if (result.length > 0) {
      console.log(`First hourly data point: timestamp=${new Date(result[0].timestamp).toLocaleTimeString()}, swapCount=${result[0].swapCount}`);
    }
    
    // In whale mode, we don't fill empty hours because it makes more sense to see just the actual whale trades
    let finalResult: VolumeData[];
    
    if (!whaleMode) {
      // Fill in any missing hours with zero volume
      const completeHourlyData: VolumeData[] = [];
      const startTime = oneDayAgo * 1000;
      const endTime = Date.now();
      
      for (let time = startTime; time <= endTime; time += 3600000) {
        const hourStart = Math.floor(time / 3600000) * 3600000;
        const existingData = result.find(item => item.timestamp === hourStart);
        
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
      
      finalResult = completeHourlyData;
    } else {
      finalResult = result;
    }
    
    // Update cache
    volumeDataCache[cacheKey] = finalResult;
    volumeDataCache.timestamp = now;
    
    console.log(`Returning ${finalResult.length} final data points for ${cacheKey} mode`);
    return finalResult;
  } catch (error) {
    console.error("Error fetching Uniswap volume data:", error);
    
    // If we can't fetch data, try using mock data as fallback
    console.warn("Failed to fetch real Uniswap data, using fallback data");
    return generateFallbackVolumeData(whaleMode);
  }
};

// Function to generate fallback volume data with buy/sell distinction when API fails
const generateFallbackVolumeData = (whaleMode = false): VolumeData[] => {
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
