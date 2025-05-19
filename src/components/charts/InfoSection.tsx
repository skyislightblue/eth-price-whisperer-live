
import React from 'react';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface InfoSectionProps {
  hasExceededCap: boolean;
  maxRatioDisplay: number;
}

const InfoSection: React.FC<InfoSectionProps> = ({ hasExceededCap, maxRatioDisplay }) => {
  return (
    <div className="flex items-center justify-between text-sm text-gray-500 px-2">
      <div className="flex items-center">
        <InfoIcon className="h-4 w-4 mr-1" />
        <span>Buy/Sell Ratio can spike due to very low sell volume</span>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="h-4 w-4 ml-2 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Buy/Sell Ratio can spike due to very low sell volume — interpret alongside total volume.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          {hasExceededCap ? `Some ratios exceed ${maxRatioDisplay}x (shown with ↑)` : ''}
        </span>
      </div>
    </div>
  );
};

export default InfoSection;
