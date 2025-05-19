
// Common types for chart components

export interface VolumeDataItem {
  timestamp: number;
  buyVolume?: number;
  sellVolume?: number;
  swapCount?: number;
}

export interface FormattedDataItem {
  timestamp: string;
  ratio: number;
  displayRatio: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  exceededCap: boolean;
  swapCount: number;
}

export interface NetFlowDataPoint {
  timestamp: number;
  netFlow: number;
}

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface CombinedDataPoint {
  timestamp: Date;
  netFlow: number;
  price: number;
  divergence?: boolean;
  divergenceMessage?: string;
}
