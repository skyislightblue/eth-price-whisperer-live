
import React, { useEffect, useRef } from 'react';
import { FormattedDataItem } from './types';

interface RatioLineChartProps {
  formattedData: FormattedDataItem[];
  title: string;
  maxRatioDisplay: number;
}

const RatioLineChart: React.FC<RatioLineChartProps> = ({ 
  formattedData, 
  title,
  maxRatioDisplay
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || formattedData.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        const timestamps = formattedData.map(item => item.timestamp);
        const ratios = formattedData.map(item => item.displayRatio);
        const exceededCap = formattedData.map(item => item.exceededCap);
        
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
            },
            symbol: exceededCap.map(exceeded => exceeded ? 'triangle-up' : 'circle')
          },
          hovertemplate: '<b>Time</b>: %{x}<br>' +
                        '<b>Buy/Sell Ratio</b>: %{customdata[0]:.2f}<br>' +
                        '<b>Total Volume</b>: $%{customdata[1]:,.2f}<br>' +
                        '<extra></extra>',
          customdata: formattedData.map(item => [
            item.ratio, // Original uncapped ratio
            item.totalVolume, // Total volume
          ])
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

        // Add grid lines at 0.5 and 2.0
        const gridLine05 = {
          x: timestamps,
          y: Array(timestamps.length).fill(0.5),
          type: 'scatter',
          mode: 'lines',
          name: '0.5x',
          line: {
            color: 'rgba(200, 200, 200, 0.5)',
            width: 1,
            dash: 'dot'
          },
          hoverinfo: 'none',
          showlegend: false
        };

        const gridLine2 = {
          x: timestamps,
          y: Array(timestamps.length).fill(2),
          type: 'scatter',
          mode: 'lines',
          name: '2x',
          line: {
            color: 'rgba(200, 200, 200, 0.5)',
            width: 1,
            dash: 'dot'
          },
          hoverinfo: 'none',
          showlegend: false
        };
        
        const layout = {
          height: 300,
          margin: { t: 30, r: 30, l: 60, b: 60 },
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
              text: 'Buy/Sell Ratio',
              standoff: 20,
            },
            tickformat: '.2f',
            hoverformat: '.2f',
            rangemode: 'tozero',
            range: [0, maxRatioDisplay + 1], // Set Y-axis cap
            tickvals: [0, 0.5, 1, 2, 5, maxRatioDisplay],
          },
          annotations: formattedData.map((item, i) => {
            if (item.exceededCap) {
              return {
                x: timestamps[i],
                y: item.displayRatio,
                text: '↑',
                showarrow: false,
                font: {
                  size: 16,
                  color: 'red'
                },
                yshift: -15
              };
            }
            return null;
          }).filter(Boolean),
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
        
        Plotly.newPlot(chartRef.current, [ratioTrace, referenceLine, gridLine05, gridLine2], layout, config);
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering ratio chart:', err);
      }
    };
    
    loadPlotly();
  }, [formattedData, title, maxRatioDisplay]);

  return <div ref={chartRef} className="w-full h-full" />;
};

export default RatioLineChart;
