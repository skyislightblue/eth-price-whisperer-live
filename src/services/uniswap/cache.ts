
import { VolumeData } from './types';

// Cache for volume data to avoid redundant API calls
interface VolumeDataCache {
  regular: VolumeData[] | null;
  whale: VolumeData[] | null;
  timestamp: number;
}

// Initialize the cache
export const volumeDataCache: VolumeDataCache = {
  regular: null,
  whale: null,
  timestamp: 0
};

// Check if the cache is valid (not expired)
export const isCacheValid = (cacheKey: 'regular' | 'whale'): boolean => {
  const now = Date.now();
  return (
    volumeDataCache[cacheKey] !== null && 
    (now - volumeDataCache.timestamp) < 300000 // 5 minute cache
  );
};

// Update the cache with new data
export const updateCache = (cacheKey: 'regular' | 'whale', data: VolumeData[]): void => {
  volumeDataCache[cacheKey] = data;
  volumeDataCache.timestamp = Date.now();
};
