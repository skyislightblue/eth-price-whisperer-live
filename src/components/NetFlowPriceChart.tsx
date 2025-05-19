
import React, { useEffect, useState } from 'react';
import { VolumeData } from '@/services/uniswapService';
import { HistoricalPrice } from '@/services/priceService';
import { CombinedDataPoint } from './charts/types';
import { calculateNetInflow, findMatchingDataPoints } from './charts/netFlowChartUtils';
import NetFlowPlotlyChart from './charts/NetFlowPlotlyChart';
import NetFlowChartLegend from './charts/NetFlowChartLegend';

interface NetFlowPriceChartProps {
  volumeData: VolumeData[];
  priceData: HistoricalPrice[];
  whaleMode?: boolean;
}

const NetFlowPriceChart: React.FC<NetFlowPriceChartProps> = ({ 
  volumeData, 
  priceData,
  whaleMode = false 
}) => {
  const [combinedData, setCombinedData] = useState<CombinedDataPoint[]>([]);
  
  useEffect(() => {
    if (volumeData.length === 0 || priceData.length === 0) return;

    // Calculate net inflow data
    const netFlowData = calculateNetInflow(volumeData);
    
    // Find matching data points
    const { combinedData: newCombinedData } = findMatchingDataPoints(netFlowData, priceData);
    
    setCombinedData(newCombinedData);
  }, [volumeData, priceData]);

  const hasData = volumeData.length > 0 && priceData.length > 0;

  return (
    <div className="h-full flex flex-col relative">
      {/* Chart title moved here from plotly component */}
      <h3 className="text-xl font-medium text-gray-800 mb-2 text-center">
        Net ETH Flow vs Price
      </h3>
      
      <div className="flex-grow">
        {hasData && combinedData.length > 0 ? (
          <NetFlowPlotlyChart 
            combinedData={combinedData} 
            whaleMode={whaleMode}
          />
        ) : null}
      </div>
      <NetFlowChartLegend 
        hasData={hasData && combinedData.length > 0} 
        whaleMode={whaleMode}
      />
    </div>
  );
};

export default NetFlowPriceChart;
