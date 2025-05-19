import { VolumeDataItem, FormattedDataItem } from './types';

export const MAX_RATIO_DISPLAY = 10;

export const formatVolumeData = (data: VolumeDataItem[]): FormattedDataItem[] => {
  // Calculate max ratio for the current data set
  let maxRatio = 0;
  
  const formattedData = data.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const buyVolume = item.buyVolume || 0;
    const sellVolume = item.sellVolume || 0.001; // Prevent division by zero
    const ratio = buyVolume / sellVolume;
    
    // Keep track of max ratio for dynamic scaling
    maxRatio = Math.max(maxRatio, ratio);
    
    const totalVolume = buyVolume + sellVolume;
    const swapCount = item.swapCount || 0;
    
    return {
      timestamp: timeStr,
      ratio,
      displayRatio: ratio, // We'll cap this below after calculating the max
      buyVolume,
      sellVolume,
      totalVolume,
      exceededCap: false, // We'll set this below
      swapCount
    };
  });
  
  console.log(`Max ratio in current data: ${maxRatio}`);
  
  // Now that we know the max ratio, cap the display values
  return formattedData.map(item => ({
    ...item,
    displayRatio: Math.min(item.ratio, MAX_RATIO_DISPLAY),
    exceededCap: item.ratio > MAX_RATIO_DISPLAY
  }));
};
