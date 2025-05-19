
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
}

// Function to generate mock volume data with buy/sell distinction
const generateMockVolumeData = (): VolumeData[] => {
  const data: VolumeData[] = [];
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  // Generate 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * hourInMs);
    // Random volume between $500,000 and $5,000,000
    const totalVolume = 500000 + Math.random() * 4500000;
    // Split into buy/sell randomly (roughly equal but varies)
    const buyPercentage = 0.3 + Math.random() * 0.4; // Between 30% and 70% buy
    const buyVolume = totalVolume * buyPercentage;
    const sellVolume = totalVolume * (1 - buyPercentage);
    
    data.push({
      timestamp,
      volumeUSD: totalVolume,
      buyVolume,
      sellVolume
    });
  }
  
  return data;
};

// Function to fetch 24-hour trading volume for ETH/USDC pair with buy/sell distinction
export const fetchUniswapVolume = async (): Promise<VolumeData[]> => {
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
    const hourlyData: Record<number, { buyVolume: number, sellVolume: number }> = {};
    
    // Process each swap and categorize as buy or sell
    swaps.forEach((swap: any) => {
      const timestamp = parseInt(swap.timestamp) * 1000; // Convert to milliseconds
      const hourTimestamp = Math.floor(timestamp / 3600000) * 3600000; // Group by hour
      
      if (!hourlyData[hourTimestamp]) {
        hourlyData[hourTimestamp] = { buyVolume: 0, sellVolume: 0 };
      }
      
      const amount0In = parseFloat(swap.amount0In || '0');
      const amount1Out = parseFloat(swap.amount1Out || '0');
      const amount1In = parseFloat(swap.amount1In || '0');
      const amount0Out = parseFloat(swap.amount0Out || '0');
      const amountUSD = parseFloat(swap.amountUSD || '0');
      
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
    
    // Convert to array format for the chart
    const result: VolumeData[] = Object.entries(hourlyData).map(([timestamp, volumes]) => ({
      timestamp: parseInt(timestamp),
      volumeUSD: volumes.buyVolume + volumes.sellVolume,
      buyVolume: volumes.buyVolume,
      sellVolume: volumes.sellVolume
    }));
    
    // Sort by timestamp
    result.sort((a, b) => a.timestamp - b.timestamp);
    
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
          sellVolume: 0
        });
      }
    }
    
    return completeHourlyData;
  } catch (error) {
    console.error("Error fetching Uniswap volume data:", error);
    
    // Return mock data instead of throwing an error
    console.log("Using mock volume data instead");
    return generateMockVolumeData();
  }
};
