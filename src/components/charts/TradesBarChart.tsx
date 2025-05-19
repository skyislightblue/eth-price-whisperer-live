
import React, { useEffect, useRef } from 'react';
import { FormattedDataItem } from './types';

interface TradesBarChartProps {
  formattedData: FormattedDataItem[];
  title: string;
}

const TradesBarChart: React.FC<TradesBarChartProps> = ({ formattedData, title }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || formattedData.length === 0) return;
    
    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Extract the data we need for the chart
        const timestamps = formattedData.map(item => item.timestamp);
        const swapCounts = formattedData.map(item => item.swapCount);
        
        console.log(`Trade counts for chart: ${JSON.stringify(swapCounts)}`);
        
        const barLayout = {
          height: 320, // Increased from 300 to give more space
          margin: { t: 60, r: 40, l: 60, b: 100 }, // Increased top margin to ensure title is visible
          title: {
            text: title.includes("Uniswap") ? title : `${title} (Uniswap)`, // Add Uniswap label if not already present
            font: {
              size: 14,
            },
            y: 0.95 // Move title down a bit from the top
          },
          xaxis: {
            title: {
              text: 'Time (Hourly)',
              standoff: 50, // Increased standoff from 40 to 50
            },
            tickangle: -45,
            // Match the x-axis of the ratio chart
            tickvals: timestamps,
            ticktext: timestamps
          },
          yaxis: {
            title: {
              text: 'Trade Count',
              standoff: 20,
            },
            rangemode: 'tozero',
          },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
        };
        
        const barTrace = {
          x: timestamps,
          y: swapCounts,
          type: 'bar',
          name: 'Trade Count',
          marker: {
            color: 'rgba(75, 100, 192, 0.7)'
          },
          hovertemplate: '<b>Time</b>: %{x}<br>' +
                        '<b>Trades</b>: %{y}<br>' +
                        '<extra></extra>'
        };
        
        Plotly.newPlot(chartRef.current, [barTrace], barLayout, {
          responsive: true,
          displayModeBar: false
        });
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering trade count chart:', err);
      }
    };
    
    loadPlotly();
  }, [formattedData, title]);

  return <div ref={chartRef} className="w-full h-80" />; // Increased height from h-72 to h-80
};

export default TradesBarChart;
