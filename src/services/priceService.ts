
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

// Function to fetch current ETH price
export const fetchCurrentPrice = async (): Promise<CurrentPriceData> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
    );
    
    if (!response.ok) {
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
    throw new Error("Failed to fetch current ETH price");
  }
};

// Function to fetch historical ETH price data (last 24 hours)
export const fetchHistoricalData = async (): Promise<HistoricalPrice[]> => {
  try {
    // Get data for the last 24 hours (1 day)
    // Remove 'interval=hourly' which requires enterprise plan
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1"
    );
    
    if (!response.ok) {
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
    throw new Error("Failed to fetch ETH historical price data");
  }
};
