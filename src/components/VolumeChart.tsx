
import React, { useEffect, useRef } from 'react';

interface VolumeChartProps {
  data: {
    timestamp: number;
    volumeUSD: number;
    buyVolume?: number;
    sellVolume?: number;
    swapCount?: number;
  }[];
  whaleMode?: boolean;
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data, whaleMode = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    
    console.log(`VolumeChart: Rendering with ${data.length} data points, whaleMode=${whaleMode}`);
    console.log(`Sample data point: ${JSON.stringify(data[0])}`);

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Format timestamps for display
        const timestamps = data.map(item => {
          const date = new Date(item.timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        
        // For symmetrical chart, buy volumes are positive and sell volumes are negative
        const buyVolumes = data.map(item => item.buyVolume || 0);
        const sellVolumes = data.map(item => -(item.sellVolume || 0)); // Negate sell volumes
        
        const buyTrace = {
          x: timestamps,
          y: buyVolumes,
          type: 'bar',
          name: 'Buy ETH',
          marker: {
            color: 'rgba(75, 192, 75, 0.8)', // Green for buys
          },
          hovertemplate: '$%{y:.2f}<extra>Buy ETH</extra>'
        };
        
        const sellTrace = {
          x: timestamps,
          y: sellVolumes,
          type: 'bar',
          name: 'Sell ETH',
          marker: {
            color: 'rgba(255, 99, 99, 0.8)', // Red for sells
          },
          hovertemplate: '$%{y:.2f}<extra>Sell ETH</extra>'
        };
        
        const title = whaleMode ? 
          'Uniswap ETH Whale Trading Volume (From Uniswap V3)' : 
          'Uniswap ETH Trading Volume (From Uniswap V3)';
        
        const layout = {
          height: 300,
          margin: { t: 30, r: 30, l: 100, b: 60 },
          title: {
            text: title,
            font: {
              size: 14,
            }
          },
          xaxis: {
            title: {
              text: 'Time (Hourly)',
              standoff: 10,
            },
            tickangle: -45
          },
          yaxis: {
            title: {
              text: 'Volume (USD)',
              standoff: 30,
            },
            tickprefix: '$',
            tickformat: ',.0f',
            tickfont: {
              size: 10,
            },
            nticks: 8,
            zeroline: true,
            zerolinecolor: '#888',
            zerolinewidth: 1,
          },
          barmode: 'relative', // Use relative mode for symmetrical bars
          bargap: 0.15,
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
          legend: {
            orientation: 'h', 
            xanchor: 'center',
            x: 0.5,
            y: 1.05
          }
        };
        
        const config = {
          responsive: true,
          displayModeBar: false,
        };
        
        Plotly.newPlot(chartRef.current, [buyTrace, sellTrace], layout, config);
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering Plotly:', err);
      }
    };
    
    loadPlotly();
  }, [data, whaleMode]);

  return <div ref={chartRef} className="w-full h-full" />;
};

export default VolumeChart;
