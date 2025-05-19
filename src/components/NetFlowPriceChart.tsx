
import React, { useEffect, useRef, useState } from 'react';
import { VolumeData } from '@/services/uniswapService';
import { HistoricalPrice } from '@/services/priceService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { CombinedDataPoint, DivergenceType } from './charts/types';

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
  const chartRef = useRef<HTMLDivElement>(null);
  const [divergenceCount, setDivergenceCount] = useState<{
    inflowDown: number;
    outflowUp: number;
    total: number;
  }>({ inflowDown: 0, outflowUp: 0, total: 0 });

  // Function to calculate net inflow per hour
  const calculateNetInflow = (data: VolumeData[]) => {
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
  const normalizeData = (values: number[]): number[] => {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Avoid division by zero
    if (max === min) return values.map(() => 0.5);
    
    return values.map(value => (value - min) / (max - min));
  }

  // Function to find similar timestamps between volume and price data
  const findMatchingDataPoints = (netFlowData: { timestamp: number; netInflow: number }[], priceData: HistoricalPrice[]) => {
    // Make sure we have data to work with
    if (netFlowData.length === 0 || priceData.length === 0) {
      return { combinedData: [], divergenceCounts: { inflowDown: 0, outflowUp: 0, total: 0 } };
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
    let inflowDownCount = 0;
    let outflowUpCount = 0;

    for (let i = 1; i < combinedData.length; i++) {
      const netFlowDelta = combinedData[i].netFlow - combinedData[i - 1].netFlow;
      const priceDelta = combinedData[i].price - combinedData[i - 1].price;
      
      // Check if significant enough movement and in opposite directions
      const isSignificantNetFlow = Math.abs(netFlowDelta) > 100000; // $100K change
      const isSignificantPrice = Math.abs(priceDelta) > 5; // $5 price change
      
      if (isSignificantNetFlow && isSignificantPrice) {
        if (netFlowDelta > 0 && priceDelta < 0) {
          // Positive net inflow but price dropping
          combinedData[i].divergence = true;
          combinedData[i].divergenceType = DivergenceType.INFLOW_PRICE_DOWN;
          combinedData[i].divergenceMessage = `Divergence: High buying volume but price dropping`;
          inflowDownCount++;
        } else if (netFlowDelta < 0 && priceDelta > 0) {
          // Negative net flow (outflow) but price rising
          combinedData[i].divergence = true;
          combinedData[i].divergenceType = DivergenceType.OUTFLOW_PRICE_UP;
          combinedData[i].divergenceMessage = `Divergence: High selling volume but price rising`;
          outflowUpCount++;
        }
      }
    }

    return { 
      combinedData, 
      divergenceCounts: {
        inflowDown: inflowDownCount,
        outflowUp: outflowUpCount,
        total: inflowDownCount + outflowUpCount
      }
    };
  };

  useEffect(() => {
    if (!chartRef.current || volumeData.length === 0 || priceData.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Calculate net inflow data
        const netFlowData = calculateNetInflow(volumeData);
        
        // Find matching data points
        const { combinedData, divergenceCounts } = findMatchingDataPoints(netFlowData, priceData);
        
        if (combinedData.length === 0) {
          console.warn("No matching data points found between volume and price data");
          return;
        }

        // Update divergence count state
        setDivergenceCount(divergenceCounts);
        
        // Extract data for plotting
        const timestamps = combinedData.map(d => d.timestamp);
        const netFlows = combinedData.map(d => d.netFlow / 1000000); // Convert to millions
        const normalizedNetFlows = combinedData.map(d => d.normalizedNetFlow || 0);
        const prices = combinedData.map(d => d.price);
        
        // Create traces for Plotly
        const netFlowTrace = {
          x: timestamps,
          y: normalizedNetFlows, // Use normalized values for better visualization
          name: 'Net Inflow (Buy-Sell)',
          yaxis: 'y',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: '#9b87f5', // Primary purple color
            width: 2,
          },
          hovertemplate: 'Net Inflow: $%{text:.2f}M<br>Time: %{x}<extra></extra>',
          text: netFlows, // Show the actual values in tooltips
        };
        
        const priceTrace = {
          x: timestamps,
          y: prices,
          name: 'ETH Price',
          yaxis: 'y2',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: '#F97316', // Bright orange color
            width: 2,
          },
          hovertemplate: 'Price: $%{y:.2f}<br>Time: %{x}<extra></extra>'
        };
        
        // Create annotations for divergences
        const annotations = combinedData
          .filter(point => point.divergence)
          .map((point, index) => ({
            x: point.timestamp,
            y: point.normalizedNetFlow,
            xref: 'x',
            yref: 'y',
            text: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '↓' : '↑',
            showarrow: true,
            arrowhead: 4,
            arrowsize: 1,
            arrowwidth: 2,
            arrowcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '#ea384c' : '#2e7d32',
            ax: 0,
            ay: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? -40 : 40,
            hovertext: point.divergenceMessage,
            hoverlabel: { 
              bgcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '#ea384c' : '#2e7d32',
              font: { color: '#ffffff' }
            },
            font: {
              size: 16,
              color: 'white'
            }
          }));
        
        // Define layout
        const layout = {
          title: whaleMode ? 
            'ETH Net Inflow vs Price (Whale Trades Only)' : 
            'ETH Net Inflow vs Price (24h)',
          height: 350,
          margin: { t: 40, r: 70, l: 70, b: 40 },
          xaxis: {
            title: 'Time (UTC)',
            showgrid: false,
          },
          yaxis: {
            title: 'ETH Net Flow (scaled)',
            titlefont: { color: '#9b87f5' },
            tickfont: { color: '#9b87f5' },
            side: 'left',
            zeroline: true,
            zerolinecolor: '#ccc',
            gridcolor: 'rgba(155, 135, 245, 0.1)',
            range: [-0.1, 1.1], // Add some padding to normalized range
          },
          yaxis2: {
            title: 'ETH Price (USD)',
            titlefont: { color: '#F97316' },
            tickfont: { color: '#F97316' },
            side: 'right',
            overlaying: 'y',
            showgrid: false,
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.2
          },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
          annotations: annotations
        };

        // Add shapes for divergence zones
        const shapes = combinedData.reduce((acc: any[], point, i, arr) => {
          if (point.divergence && i > 0) {
            const startTime = arr[i-1].timestamp;
            const endTime = point.timestamp;
            
            acc.push({
              type: 'rect',
              xref: 'x',
              yref: 'paper',
              x0: startTime,
              y0: 0,
              x1: endTime,
              y1: 1,
              fillcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? 
                'rgba(234, 56, 76, 0.1)' : 'rgba(46, 125, 50, 0.1)',
              line: {
                width: 0
              }
            });
          }
          return acc;
        }, []);
        
        layout.shapes = shapes;
        
        // Configuration
        const config = {
          responsive: true,
          displayModeBar: false,
        };
        
        Plotly.newPlot(chartRef.current, [netFlowTrace, priceTrace], layout, config);
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering Plotly:', err);
      }
    };
    
    loadPlotly();
  }, [volumeData, priceData, whaleMode]);

  return (
    <div className="h-full">
      <div ref={chartRef} className="w-full h-full" />
      {volumeData.length === 0 || priceData.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          {whaleMode ? "No whale trades found in this period" : "Insufficient data"}
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-help">
                      <InfoIcon className="h-4 w-4 text-gray-500 mr-1" />
                      <span>Divergence signals detected: {divergenceCount.total}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-64">
                    <p className="mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                      <strong>{divergenceCount.inflowDown}</strong> net inflow up but price down signals
                    </p>
                    <p>
                      <span className="inline-block w-3 h-3 rounded-full bg-green-600 mr-2"></span>
                      <strong>{divergenceCount.outflowUp}</strong> net outflow down but price up signals
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center text-xs space-x-4">
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
      )}
    </div>
  );
};

export default NetFlowPriceChart;
