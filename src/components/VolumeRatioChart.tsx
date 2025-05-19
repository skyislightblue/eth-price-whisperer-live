
import React, { useEffect, useRef } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface VolumeRatioChartProps {
  data: {
    timestamp: number;
    buyVolume?: number;
    sellVolume?: number;
    swapCount?: number; // Number of trades in this hour
  }[];
  whaleMode?: boolean;
}

const VolumeRatioChart: React.FC<VolumeRatioChartProps> = ({ data, whaleMode = false }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  // Maximum ratio to display on the y-axis
  const MAX_RATIO_DISPLAY = 10;

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
          const totalVolume = buyVolume + sellVolume;
          
          // Cap the displayed ratio for the chart
          const displayRatio = Math.min(ratio, MAX_RATIO_DISPLAY);
          
          return {
            timestamp: timeStr,
            ratio,
            displayRatio,
            buyVolume,
            sellVolume,
            totalVolume,
            exceededCap: ratio > MAX_RATIO_DISPLAY
          };
        });
        
        const timestamps = formattedData.map(item => item.timestamp);
        const ratios = formattedData.map(item => item.displayRatio);
        const exceededCap = formattedData.map(item => item.exceededCap);
        
        const title = whaleMode ? 
          'ETH/USDC Buy/Sell Volume Ratio - Whale Trades Only (From Uniswap V3)' : 
          'ETH/USDC Buy/Sell Volume Ratio (From Uniswap V3)';
        
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
            range: [0, MAX_RATIO_DISPLAY + 1], // Set Y-axis cap
            tickvals: [0, 0.5, 1, 2, 5, MAX_RATIO_DISPLAY],
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
        
        // Generate bar chart for trade count
        if (barChartRef.current) {
          const swapCounts = data.map(item => item.swapCount || 0);
          
          const barLayout = {
            height: 150,
            margin: { t: 10, r: 30, l: 60, b: 60 },
            title: {
              text: 'Number of Trades Per Hour',
              font: {
                size: 14,
              }
            },
            xaxis: {
              title: {
                text: 'Time (Hourly)',
                standoff: 10,
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
          
          Plotly.newPlot(barChartRef.current, [barTrace], barLayout, config);
        }
        
        // Cleanup
        return () => {
          if (chartRef.current) Plotly.purge(chartRef.current);
          if (barChartRef.current) Plotly.purge(barChartRef.current);
        };
      } catch (err) {
        console.error('Error loading or rendering Plotly:', err);
      }
    };
    
    loadPlotly();
  }, [data, whaleMode]);

  return (
    <div className="space-y-2">
      <div ref={chartRef} className="w-full h-full" />
      
      <div className="flex items-center justify-between text-sm text-gray-500 px-2">
        <div className="flex items-center">
          <InfoIcon className="h-4 w-4 mr-1" />
          <span>Buy/Sell Ratio can spike due to very low sell volume</span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-4 w-4 ml-2 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Buy/Sell Ratio can spike due to very low sell volume — interpret alongside total volume.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            {ratios > MAX_RATIO_DISPLAY ? `Some ratios exceed ${MAX_RATIO_DISPLAY}x (shown with ↑)` : ''}
          </span>
        </div>
      </div>
      
      <div ref={barChartRef} className="w-full h-36 mt-2" />
    </div>
  );
};

export default VolumeRatioChart;
