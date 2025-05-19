
import { VolumeData } from '@/services/uniswapService';
import { HistoricalPrice } from '@/services/priceService';
import { CombinedDataPoint, DivergenceType } from './types';

// Function to calculate net inflow per hour
export const calculateNetInflow = (data: VolumeData[]) => {
  return data.map(item => {
    const buyVolume = item.buyVolume || 0;
    const sellVolume = item.sellVolume || 0;
    const netInflow = buyVolume - sellVolume;
    return {
      timestamp: item.timestamp,
      netInflow,
    };
  });
};

// Function to normalize data using min-max scaling
export const normalizeData = (values: number[]): number[] => {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Avoid division by zero
  if (max === min) return values.map(() => 0.5);
  
  return values.map(value => (value - min) / (max - min));
};

// Function to find similar timestamps between volume and price data
export const findMatchingDataPoints = (
  netFlowData: { timestamp: number; netInflow: number }[], 
  priceData: HistoricalPrice[]
) => {
  // Make sure we have data to work with
  if (netFlowData.length === 0 || priceData.length === 0) {
    return { combinedData: [] };
  }

  // Sort both datasets by timestamp
  const sortedNetFlow = [...netFlowData].sort((a, b) => a.timestamp - b.timestamp);
  const sortedPrices = [...priceData].sort((a, b) => a.timestamp - b.timestamp);

  // Find overlap period (last 24 hours)
  const startTime = Math.max(
    sortedNetFlow[0].timestamp,
    sortedPrices[0].timestamp
  );
  const endTime = Math.min(
    sortedNetFlow[sortedNetFlow.length - 1].timestamp,
    sortedPrices[sortedPrices.length - 1].timestamp
  );

  // Filter data to common period
  const filteredNetFlow = sortedNetFlow.filter(
    item => item.timestamp >= startTime && item.timestamp <= endTime
  );
  const filteredPrices = sortedPrices.filter(
    item => item.timestamp >= startTime && item.timestamp <= endTime
  );

  // Initialize array for combined data
  const combinedData: CombinedDataPoint[] = [];

  // Map each netflow point to nearest price point
  filteredNetFlow.forEach(netFlowPoint => {
    const closestPricePoint = filteredPrices.reduce((closest, current) => {
      return Math.abs(current.timestamp - netFlowPoint.timestamp) < 
              Math.abs(closest.timestamp - netFlowPoint.timestamp) ? 
              current : closest;
    }, filteredPrices[0]);
    
    // Only add if price point is within reasonable time range (e.g., 30 minutes)
    if (Math.abs(closestPricePoint.timestamp - netFlowPoint.timestamp) <= 30 * 60 * 1000) {
      combinedData.push({
        timestamp: new Date(netFlowPoint.timestamp),
        netFlow: netFlowPoint.netInflow,
        price: closestPricePoint.price
      });
    }
  });

  // Calculate normalized net flows after all points are collected
  const netFlows = combinedData.map(point => point.netFlow);
  const normalizedNetFlows = normalizeData(netFlows);
  
  // Apply normalized values back to combined data
  combinedData.forEach((point, index) => {
    point.normalizedNetFlow = normalizedNetFlows[index];
  });

  // Detect divergences (when net flow and price move in opposite directions)
  // Improved detection logic to better match the reference image
  for (let i = 1; i < combinedData.length; i++) {
    const netFlowDelta = combinedData[i].normalizedNetFlow! - combinedData[i - 1].normalizedNetFlow!;
    const priceDelta = combinedData[i].price - combinedData[i - 1].price;
    
    // Check for significant opposite movements
    if (Math.abs(netFlowDelta) > 0.05 && Math.abs(priceDelta) > 2) {
      if (netFlowDelta > 0 && priceDelta < 0) {
        // Positive net inflow but price dropping
        combinedData[i].divergence = true;
        combinedData[i].divergenceType = DivergenceType.INFLOW_PRICE_DOWN;
        combinedData[i].divergenceMessage = `Divergence: High buying volume but price dropping`;
      } else if (netFlowDelta < 0 && priceDelta > 0) {
        // Negative net flow (outflow) but price rising
        combinedData[i].divergence = true;
        combinedData[i].divergenceType = DivergenceType.OUTFLOW_PRICE_UP;
        combinedData[i].divergenceMessage = `Divergence: High selling volume but price rising`;
      }
    }
  }

  return { combinedData };
};
