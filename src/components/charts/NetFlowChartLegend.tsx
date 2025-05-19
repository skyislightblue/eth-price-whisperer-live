
import React from 'react';

interface NetFlowChartLegendProps {
  hasData: boolean;
  whaleMode?: boolean;
}

const NetFlowChartLegend: React.FC<NetFlowChartLegendProps> = ({ 
  hasData, 
  whaleMode = false 
}) => {
  if (!hasData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
        {whaleMode ? "No whale trades found in this period" : "Insufficient data"}
      </div>
    );
  }

  return (
    <div className="mt-4 text-sm text-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
            <span>Buying pressure but price falling</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-1"></span>
            <span>Selling pressure but price rising</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetFlowChartLegend;
