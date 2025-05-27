
import React, { useState, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import RatioLineChart from './charts/RatioLineChart';
import TradesBarChart from './charts/TradesBarChart';
import InfoSection from './charts/InfoSection';
import { formatVolumeData, MAX_RATIO_DISPLAY } from './charts/formatVolumeData';
import { VolumeDataItem, FormattedDataItem } from './charts/types';

interface VolumeRatioChartProps {
  data: VolumeDataItem[];
  whaleMode?: boolean;
}

const VolumeRatioChart: React.FC<VolumeRatioChartProps> = ({ data, whaleMode = false }) => {
  const [formattedData, setFormattedData] = useState<FormattedDataItem[]>([]);
  
  useEffect(() => {
    if (data.length === 0) return;
    
    console.log(`VolumeRatioChart: Rendering with ${data.length} data points, whaleMode=${whaleMode}`);
    console.log(`First data point swapCount: ${data[0]?.swapCount || 0}`);
    
    // Format the data
    const newFormattedData = formatVolumeData(data);
    setFormattedData(newFormattedData);
  }, [data, whaleMode]);

  const hasExceededCap = formattedData.some(item => item.exceededCap);
  const ratioChartTitle = whaleMode ? 
    'ETH/USDC Buy/Sell Volume Ratio - Whale Trades Only (from Uniswap V3)' : 
    'ETH/USDC Buy/Sell Volume Ratio (from Uniswap V3)';
  
  const tradeChartTitle = whaleMode ? 
    'Number of Whale Trades Per Hour (Uniswap)' : 
    'Number of Trades Per Hour (Uniswap)';

  return (
    <TooltipProvider>
      <div className="space-y-8"> {/* 增加间距从y-6到y-8 */}
        {formattedData.length > 0 && (
          <>
            <RatioLineChart 
              formattedData={formattedData} 
              title={ratioChartTitle}
              maxRatioDisplay={MAX_RATIO_DISPLAY}
            />
            
            <InfoSection 
              hasExceededCap={hasExceededCap}
              maxRatioDisplay={MAX_RATIO_DISPLAY}
            />
            
            <TradesBarChart 
              formattedData={formattedData} 
              title={tradeChartTitle}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default VolumeRatioChart;
