
// Price service for fetching Ethereum price data from CoinGecko API

// Interface for current price data
export interface CurrentPriceData {
  current: number;
  high24h: number;
  low24h: number;
  priceChangePercentage24h: number;
}

// Interface for historical price data points
export interface HistoricalPrice {
  timestamp: number;
  price: number;
}

// Function to generate mock price data in case API fails
const generateMockCurrentPriceData = (): CurrentPriceData => {
  const basePrice = 3500 + (Math.random() * 300 - 150); // Around $3500 +/- $150
  const high24h = basePrice * (1 + (Math.random() * 0.03)); // Up to 3% higher
  const low24h = basePrice * (1 - (Math.random() * 0.03)); // Up to 3% lower
  const priceChangePercentage24h = (Math.random() * 6) - 3; // -3% to +3%

  return {
    current: basePrice,
    high24h,
    low24h,
    priceChangePercentage24h
  };
};

// Function to generate mock historical price data
const generateMockHistoricalData = (): HistoricalPrice[] => {
  const data: HistoricalPrice[] = [];
  const now = Date.now();
  const basePrice = 3500;
  const hourInMs = 60 * 60 * 1000;
  
  // Generate 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - (i * hourInMs);
    // Random price fluctuation around $3500
    const price = basePrice + (Math.random() * 300 - 150);
    
    data.push({
      timestamp,
      price
    });
  }
  
  return data;
};

// Function to fetch current ETH price
export const fetchCurrentPrice = async (): Promise<CurrentPriceData> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
    );
    
    if (!response.ok) {
      // Check for rate limit or other API errors
      if (response.status === 429) {
        console.warn("CoinGecko API rate limit reached");
        throw new Error("API rate limit reached. Please try again later.");
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      current: data.market_data.current_price.usd,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
      priceChangePercentage24h: data.market_data.price_change_percentage_24h,
    };
  } catch (error) {
    console.error("Error fetching current price:", error);
    
    // Return mock data instead of throwing
    console.log("Using mock price data");
    return generateMockCurrentPriceData();
  }
};

// Function to fetch historical ETH price data (last 24 hours)
export const fetchHistoricalData = async (): Promise<HistoricalPrice[]> => {
  try {
    // Get data for the last 24 hours (1 day)
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1"
    );
    
    if (!response.ok) {
      // Check for rate limit or other API errors
      if (response.status === 429) {
        console.warn("CoinGecko API rate limit reached");
        throw new Error("API rate limit reached. Please try again later.");
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the price data
    return data.prices.map((item: [number, number]) => ({
      timestamp: item[0],
      price: item[1],
    }));
  } catch (error) {
    console.error("Error fetching historical data:", error);
    
    // Return mock data instead of throwing
    console.log("Using mock historical data");
    return generateMockHistoricalData();
  }
};
