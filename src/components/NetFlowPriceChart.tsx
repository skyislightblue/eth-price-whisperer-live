
import React, { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VolumeData } from '@/services/uniswapService';
import { HistoricalPrice } from '@/services/priceService';

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

  // Function to find similar timestamps between volume and price data
  const findMatchingDataPoints = (netFlowData: { timestamp: number; netInflow: number }[], priceData: HistoricalPrice[]) => {
    // Make sure we have data to work with
    if (netFlowData.length === 0 || priceData.length === 0) {
      return { timestamps: [], netFlows: [], prices: [] };
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

    // Initialize arrays for chart data
    const timestamps: Date[] = [];
    const netFlows: number[] = [];
    const prices: number[] = [];

    // Map each netflow point to nearest price point
    filteredNetFlow.forEach(netFlowPoint => {
      const closestPricePoint = filteredPrices.reduce((closest, current) => {
        return Math.abs(current.timestamp - netFlowPoint.timestamp) < 
               Math.abs(closest.timestamp - netFlowPoint.timestamp) ? 
               current : closest;
      }, filteredPrices[0]);
      
      // Only add if price point is within reasonable time range (e.g., 30 minutes)
      if (Math.abs(closestPricePoint.timestamp - netFlowPoint.timestamp) <= 30 * 60 * 1000) {
        timestamps.push(new Date(netFlowPoint.timestamp));
        netFlows.push(netFlowPoint.netInflow);
        prices.push(closestPricePoint.price);
      }
    });

    // Detect divergences (when net flow and price move in opposite directions)
    const divergences = [];
    for (let i = 1; i < timestamps.length; i++) {
      const netFlowDelta = netFlows[i] - netFlows[i - 1];
      const priceDelta = prices[i] - prices[i - 1];
      // Check if significant enough movement and in opposite directions
      if (Math.abs(netFlowDelta) > 100000 && Math.abs(priceDelta) > 5 && 
          (netFlowDelta > 0 && priceDelta < 0) || (netFlowDelta < 0 && priceDelta > 0)) {
        divergences.push({
          index: i,
          timestamp: timestamps[i],
          message: `Divergence: Net flow ${netFlowDelta > 0 ? 'up' : 'down'} but price ${priceDelta > 0 ? 'up' : 'down'}`
        });
      }
    }

    return { timestamps, netFlows, prices, divergences };
  };

  useEffect(() => {
    if (!chartRef.current || volumeData.length === 0 || priceData.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Calculate net inflow data
        const netFlowData = calculateNetInflow(volumeData);
        
        // Find matching data points
        const { timestamps, netFlows, prices, divergences } = findMatchingDataPoints(netFlowData, priceData);
        
        if (timestamps.length === 0) {
          console.warn("No matching data points found between volume and price data");
          return;
        }

        // Convert netInflows to millions for better readability
        const netFlowsInMillions = netFlows.map(value => value / 1000000);
        
        // Create traces for Plotly
        const netFlowTrace = {
          x: timestamps,
          y: netFlowsInMillions,
          name: 'Net Inflow (Buy-Sell)',
          yaxis: 'y',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: 'rgb(33, 150, 243)',
            width: 2,
          },
          hovertemplate: 'Net Inflow: $%{y:.2f}M<br>Time: %{x}<extra></extra>'
        };
        
        const priceTrace = {
          x: timestamps,
          y: prices,
          name: 'ETH Price',
          yaxis: 'y2',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: 'rgb(255, 152, 0)',
            width: 2,
          },
          hovertemplate: 'Price: $%{y:.2f}<br>Time: %{x}<extra></extra>'
        };
        
        // Create annotations for divergences
        const annotations = divergences.map(div => ({
          x: div.timestamp,
          y: netFlowsInMillions[div.index],
          xref: 'x',
          yref: 'y',
          text: '!',
          showarrow: true,
          arrowhead: 4,
          arrowsize: 1,
          arrowwidth: 2,
          arrowcolor: '#e91e63',
          ax: 0,
          ay: -40,
          hovertext: div.message,
          hoverlabel: { bgcolor: '#e91e63' }
        }));
        
        // Define layout
        const layout = {
          title: whaleMode ? 
            'ETH Net Inflow vs Price (Whale Trades Only)' : 
            'ETH Net Inflow vs Price (24h)',
          height: 350,
          margin: { t: 40, r: 70, l: 70, b: 40 },
          xaxis: {
            title: 'Time',
            showgrid: false,
          },
          yaxis: {
            title: 'Net Inflow (millions USD)',
            titlefont: { color: 'rgb(33, 150, 243)' },
            tickfont: { color: 'rgb(33, 150, 243)' },
            side: 'left',
            zeroline: true,
            zerolinecolor: '#ccc',
            gridcolor: 'rgba(33, 150, 243, 0.1)',
          },
          yaxis2: {
            title: 'ETH Price (USD)',
            titlefont: { color: 'rgb(255, 152, 0)' },
            tickfont: { color: 'rgb(255, 152, 0)' },
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
      ) : null}
    </div>
  );
};

export default NetFlowPriceChart;
