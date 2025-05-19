
import React, { useEffect, useState } from "react";
import PriceCard from "./PriceCard";
import PriceChart from "./PriceChart";
import VolumeChart from "./VolumeChart";
import VolumeRatioChart from "./VolumeRatioChart";
import NetFlowPriceChart from "./NetFlowPriceChart";
import { fetchCurrentPrice, fetchHistoricalData, HistoricalPrice } from "@/services/priceService";
import { fetchUniswapVolume, VolumeData, WHALE_THRESHOLD } from "@/services/uniswapService";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// Define types for our price data
interface PriceData {
  current: number;
  high24h: number;
  low24h: number;
  priceChangePercentage24h: number;
}

const Dashboard = () => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [volumeLoading, setVolumeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [whaleMode, setWhaleMode] = useState<boolean>(false);

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
  const fetchVolumeData = async (whaleMode: boolean = false) => {
    try {
      setVolumeLoading(true);
      
      console.log(`Fetching volume data with whale mode: ${whaleMode}, threshold: ${WHALE_THRESHOLD}`);
      
      // Fetch fresh data from API and force a refresh regardless of cache
      const volumeData = await fetchUniswapVolume(whaleMode, true);
      
      console.log(`Received ${volumeData.length} data points, first point swapCount: ${volumeData[0]?.swapCount || 0}`);
      console.log(`Sample volume data:`, volumeData.slice(0, 2));
      
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
    fetchVolumeData(whaleMode);
  };

  // Toggle whale mode
  const handleToggleWhaleMode = () => {
    const newWhaleMode = !whaleMode;
    setWhaleMode(newWhaleMode);
    setVolumeLoading(true);
    
    // Show toast notification
    toast(newWhaleMode ? "Whale Mode Activated" : "Whale Mode Deactivated", {
      description: newWhaleMode ? 
        `Only showing trades > $${(WHALE_THRESHOLD/1000).toFixed(0)}K` : 
        "Showing all trading activity"
    });
    
    // Always fetch fresh data when toggling whale mode to ensure proper filtering
    fetchVolumeData(newWhaleMode);
  };

  // Fetch data on initial load only - no more automatic refresh
  useEffect(() => {
    fetchAllData();
    fetchVolumeData(whaleMode);
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
          
          {/* New Net Inflow vs Price Chart Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                Net ETH Flow vs Price
                {whaleMode && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Whale Mode Active</span>}
              </h3>
            </div>
            
            <div className="h-80">
              {volumeError ? (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                  {volumeError}
                </div>
              ) : volumeLoading || historicalData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading net flow and price data...
                </div>
              ) : volumeData.length > 0 ? (
                <NetFlowPriceChart 
                  volumeData={volumeData} 
                  priceData={historicalData}
                  whaleMode={whaleMode}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  {whaleMode ? "No whale trades found in this period" : "No volume data available"}
                </div>
              )}
            </div>
          </div>
          
          {/* Volume Charts Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                24 Hour ETH/USDC Trading Volume
                {whaleMode && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Whale Mode Active</span>}
              </h3>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Whale Mode</span>
                <Switch 
                  id="whale-mode" 
                  checked={whaleMode} 
                  onCheckedChange={handleToggleWhaleMode}
                />
                <span className="text-xs text-gray-500 ml-2">{`(>${(WHALE_THRESHOLD/1000).toFixed(0)}K USD)`}</span>
              </div>
            </div>
            
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
                <VolumeChart data={volumeData} whaleMode={whaleMode} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  {whaleMode ? "No whale trades found in this period" : "No volume data available"}
                </div>
              )}
            </div>
          </div>
          
          {/* Volume Ratio Chart Section */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                ETH/USDC Buy/Sell Volume Ratio
                {whaleMode && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">Whale Mode Active</span>}
              </h3>
            </div>
            
            <div>
              {volumeError ? (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                  {volumeError}
                </div>
              ) : volumeLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Loading ratio data...
                </div>
              ) : volumeData.length > 0 ? (
                <VolumeRatioChart data={volumeData} whaleMode={whaleMode} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  {whaleMode ? "No whale trades found in this period" : "No ratio data available"}
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
