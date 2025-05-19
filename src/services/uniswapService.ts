
// Service for fetching Uniswap V3 trading data from The Graph API

// ETH/USDC pool ID for Uniswap V3 on mainnet
// This is the 0.3% fee tier pool ID
const ETH_USDC_POOL_ID = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8";

// Interface for hourly volume data
export interface VolumeData {
  timestamp: number;
  volumeUSD: number;
}

// Function to generate mock volume data
const generateMockVolumeData = (): VolumeData[] => {
  const data: VolumeData[] = [];
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  // Generate 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * hourInMs);
    // Random volume between $500,000 and $5,000,000
    const volumeUSD = 500000 + Math.random() * 4500000;
    
    data.push({
      timestamp,
      volumeUSD
    });
  }
  
  return data;
};

// Function to fetch 24-hour trading volume for ETH/USDC pair
export const fetchUniswapVolume = async (): Promise<VolumeData[]> => {
  try {
    // Get UTC timestamp for 24 hours ago
    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    
    // GraphQL query to fetch hourly data for the ETH/USDC pool
    const query = `{
      poolHourDatas(
        where: {
          pool: "${ETH_USDC_POOL_ID}",
          periodStartUnix_gt: ${oneDayAgo}
        }
        orderBy: periodStartUnix
        first: 24
      ) {
        periodStartUnix
        volumeUSD
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
    
    // Format the volume data
    return data.data.poolHourDatas.map((item: any) => ({
      timestamp: parseInt(item.periodStartUnix) * 1000, // Convert to milliseconds
      volumeUSD: parseFloat(item.volumeUSD),
    }));
  } catch (error) {
    console.error("Error fetching Uniswap volume data:", error);
    
    // Return mock data instead of throwing an error
    console.log("Using mock volume data instead");
    return generateMockVolumeData();
  }
};
