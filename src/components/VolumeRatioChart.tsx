
import React, { useEffect, useRef } from 'react';

interface VolumeRatioChartProps {
  data: {
    timestamp: number;
    buyVolume?: number;
    sellVolume?: number;
  }[];
}

const VolumeRatioChart: React.FC<VolumeRatioChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Format timestamps for display and calculate ratios
        const formattedData = data.map(item => {
          const date = new Date(item.timestamp);
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const buyVolume = item.buyVolume || 0;
          const sellVolume = item.sellVolume || 0.001; // Prevent division by zero
          const ratio = buyVolume / sellVolume;
          
          return {
            timestamp: timeStr,
            ratio: ratio
          };
        });
        
        const timestamps = formattedData.map(item => item.timestamp);
        const ratios = formattedData.map(item => item.ratio);
        
        const ratioTrace = {
          x: timestamps,
          y: ratios,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Buy/Sell Ratio',
          line: {
            color: 'rgba(75, 192, 192, 1)',
            width: 2
          },
          marker: {
            size: 6,
            color: 'rgba(75, 192, 192, 0.8)',
            line: {
              color: 'rgba(75, 192, 192, 1)',
              width: 1
            }
          },
          hovertemplate: 'Buy/Sell Ratio: %{y:.2f}<extra></extra>'
        };
        
        const referenceLine = {
          x: timestamps,
          y: Array(timestamps.length).fill(1),
          type: 'scatter',
          mode: 'lines',
          name: 'Equal Buy/Sell',
          line: {
            color: 'rgba(128, 128, 128, 0.7)',
            width: 1,
            dash: 'dash'
          },
          hoverinfo: 'none'
        };
        
        const layout = {
          height: 300,
          margin: { t: 30, r: 30, l: 60, b: 60 },
          title: {
            text: 'ETH/USDC Buy/Sell Volume Ratio',
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
              text: 'Buy/Sell Ratio',
              standoff: 20,
            },
            tickformat: '.2f',
            hoverformat: '.2f',
            rangemode: 'tozero',
          },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
          showlegend: true,
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
        
        Plotly.newPlot(chartRef.current, [ratioTrace, referenceLine], layout, config);
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering Plotly:', err);
      }
    };
    
    loadPlotly();
  }, [data]);

  return <div ref={chartRef} className="w-full h-full" />;
};

export default VolumeRatioChart;
