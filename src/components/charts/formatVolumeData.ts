
import { VolumeDataItem, FormattedDataItem } from './types';

export const MAX_RATIO_DISPLAY = 10;

export const formatVolumeData = (data: VolumeDataItem[]): FormattedDataItem[] => {
  return data.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const buyVolume = item.buyVolume || 0;
    const sellVolume = item.sellVolume || 0.001; // Prevent division by zero
    const ratio = buyVolume / sellVolume;
    const totalVolume = buyVolume + sellVolume;
    const swapCount = item.swapCount || 0;
    
    // Cap the displayed ratio for the chart
    const displayRatio = Math.min(ratio, MAX_RATIO_DISPLAY);
    
    return {
      timestamp: timeStr,
      ratio,
      displayRatio,
      buyVolume,
      sellVolume,
      totalVolume,
      exceededCap: ratio > MAX_RATIO_DISPLAY,
      swapCount
    };
  });
};
