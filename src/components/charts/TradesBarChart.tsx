
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
          height: 250, // Increased from 150 to make the chart taller
          margin: { t: 10, r: 30, l: 60, b: 80 }, // Increased bottom margin from 60 to 80
          title: {
            text: title,
            font: {
              size: 14,
            }
          },
          xaxis: {
            title: {
              text: 'Time (Hourly)',
              standoff: 30, // Increased standoff to create more space
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

  return <div ref={chartRef} className="w-full h-64" />; // Increased height from h-36 to h-64
};

export default TradesBarChart;
