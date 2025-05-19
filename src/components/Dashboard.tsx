
import React, { useEffect, useState } from "react";
import PriceCard from "./PriceCard";
import PriceChart from "./PriceChart";
import VolumeChart from "./VolumeChart";
import { fetchCurrentPrice, fetchHistoricalData } from "@/services/priceService";
import { fetchUniswapVolume, VolumeData } from "@/services/uniswapService";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";

// Define types for our price data
interface PriceData {
  current: number;
  high24h: number;
  low24h: number;
  priceChangePercentage24h: number;
}

interface HistoricalPrice {
  timestamp: number;
  price: number;
}

const Dashboard = () => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [volumeLoading, setVolumeLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Function to fetch all price data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      
      // Fetch current price data
      const currentData = await fetchCurrentPrice();
      setPriceData(currentData);
      
      // Fetch historical price data
      const historicalPrices = await fetchHistoricalData();
      setHistoricalData(historicalPrices);
      
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Error fetching price data:", err);
      setError("Failed to fetch price data. Please try again later.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Function to fetch Uniswap volume data
  const fetchVolumeData = async () => {
    try {
      setVolumeLoading(true);
      
      // Fetch trading volume data
      const volumeData = await fetchUniswapVolume();
      setVolumeData(volumeData);
      
      setVolumeError(null);
    } catch (err) {
      console.error("Error fetching volume data:", err);
      setVolumeError("Failed to fetch ETH/USDC trading volume data. Please try again later.");
    } finally {
      setVolumeLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchAllData();
    fetchVolumeData();
  };

  // Fetch data on initial load only - no more automatic refresh
  useEffect(() => {
    fetchAllData();
    fetchVolumeData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Ethereum Price Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-sm text-gray-500 mr-2">
            <InfoIcon className="h-4 w-4 mr-1" />
            <span>CoinGecko API limits: 10-30 calls/minute</span>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing || loading}
            variant="outline"
            className="px-3 py-1"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      ) : loading && !priceData ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priceData && (
              <>
                <PriceCard 
                  title="Current Price" 
                  value={`$${priceData.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  change={priceData.priceChangePercentage24h} 
                  icon="dollar" 
                />
                <PriceCard 
                  title="24h High" 
                  value={`$${priceData.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon="trending-up" 
                />
                <PriceCard 
                  title="24h Low" 
                  value={`$${priceData.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon="trending-down" 
                />
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">24 Hour Price History</h3>
            <div className="h-80">
              {historicalData.length > 0 ? (
                <PriceChart data={historicalData} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading chart data...
                </div>
              )}
            </div>
          </div>
          
          {/* Volume Chart Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">24 Hour ETH/USDC Trading Volume</h3>
            <div className="h-80">
              {volumeError ? (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                  {volumeError}
                </div>
              ) : volumeLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading volume data...
                </div>
              ) : volumeData.length > 0 ? (
                <VolumeChart data={volumeData} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No volume data available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
