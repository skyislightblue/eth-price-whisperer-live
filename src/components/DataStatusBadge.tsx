import React from 'react';

interface DataStatusBadgeProps {
  isMockData: boolean;
}

const DataStatusBadge: React.FC<DataStatusBadgeProps> = ({ isMockData }) => {
  return (
    <div className="absolute top-0 right-0 flex flex-col items-end">
      <div className={`
        inline-flex items-center px-2 py-1 rounded text-xs font-medium
        ${isMockData ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
      `}>
        {isMockData ? (
          <>🟡 Showing mock data due to API rate limit</>
        ) : (
          <>🟢 Live data from CoinGecko</>
        )}
      </div>
      {isMockData && (
        <span className="text-xs text-gray-500 mt-1">
          Please try refreshing later
        </span>
      )}
    </div>
  );
};

export default DataStatusBadge;
