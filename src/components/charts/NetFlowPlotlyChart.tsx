
import React, { useEffect, useRef } from 'react';
import { CombinedDataPoint, DivergenceType } from './types';
import * as PlotlyTypes from 'plotly.js-dist-min';

interface NetFlowPlotlyChartProps {
  combinedData: CombinedDataPoint[];
  whaleMode?: boolean;
}

const NetFlowPlotlyChart: React.FC<NetFlowPlotlyChartProps> = ({ 
  combinedData, 
  whaleMode = false 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || combinedData.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Extract data for plotting
        const timestamps = combinedData.map(d => d.timestamp);
        const netFlows = combinedData.map(d => d.netFlow / 1000000); // Convert to millions
        const normalizedNetFlows = combinedData.map(d => d.normalizedNetFlow || 0);
        const prices = combinedData.map(d => d.price);
        
        // Create traces for Plotly
        const priceTrace = {
          x: timestamps,
          y: prices,
          name: 'ETH Price',
          yaxis: 'y',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: '#F97316', // Orange color for price
            width: 2,
          },
          hovertemplate: 'Price: $%{y:.2f}<br>Time: %{x}<extra></extra>'
        };
        
        const netFlowTrace = {
          x: timestamps,
          y: normalizedNetFlows, // Use normalized values for better visualization
          name: 'Net Inflow (Buy/Sell)',
          yaxis: 'y2',
          type: 'scatter',
          mode: 'lines',
          line: {
            color: '#9b87f5', // Purple color for net inflow
            width: 2,
          },
          hovertemplate: 'Net Inflow: $%{text:.2f}M<br>Time: %{x}<extra></extra>',
          text: netFlows, // Show the actual values in tooltips
        };
        
        // Create annotations for divergences
        const annotations = combinedData
          .filter(point => point.divergence)
          .map((point) => ({
            x: point.timestamp,
            y: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? 
                prices[combinedData.findIndex(d => d.timestamp === point.timestamp)] : 
                prices[combinedData.findIndex(d => d.timestamp === point.timestamp)],
            xref: 'x',
            yref: 'y',
            text: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '↓' : '↑',
            showarrow: true,
            arrowhead: 6,
            arrowsize: 1.5,
            arrowwidth: 2,
            arrowcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '#ea384c' : '#2e7d32',
            ax: 0,
            ay: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? -30 : 30,
            hovertext: point.divergenceMessage,
            hoverlabel: { 
              bgcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '#ea384c' : '#2e7d32',
              font: { color: '#ffffff' }
            },
            font: {
              size: 18,
              color: 'white'
            }
          }));
        
        // Define layout with proper typing for shapes
        const layout: Partial<PlotlyTypes.Layout> = {
          title: {
            text: 'Net ETH Flow vs Price',
            font: {
              size: 20,
              family: 'system-ui, sans-serif'
            },
            y: 0.98,
          },
          height: 400, // Increased height for better readability
          margin: { t: 60, r: 70, l: 70, b: 120 }, // Adjusted margins for better spacing
          xaxis: {
            title: {
              text: 'Time (UTC)',
              standoff: 40, // Increased standoff for more space
              font: {
                size: 14,
              }
            },
            showgrid: false,
          },
          yaxis: {
            title: {
              text: 'ETH Price (USD)',
              standoff: 10,
              font: {
                size: 14,
                color: '#F97316'
              }
            },
            titlefont: { color: '#F97316' },
            tickfont: { color: '#F97316' },
            side: 'left',
            zeroline: true,
            zerolinecolor: '#ccc',
            gridcolor: 'rgba(245, 158, 11, 0.1)',
          },
          yaxis2: {
            title: {
              text: 'Net Inflow Ratio (Buy/Sell)',
              standoff: 10,
              font: {
                size: 14,
                color: '#9b87f5'
              }
            },
            titlefont: { color: '#9b87f5' },
            tickfont: { color: '#9b87f5' },
            side: 'right',
            overlaying: 'y',
            showgrid: false,
            range: [0, 1], // Fixed range from 0 to 1 for normalized values
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.17, // Position legend at the bottom
            x: 0.5, // Centered
            xanchor: 'center',
            yanchor: 'top',
            font: {
              size: 14
            }
          },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
          annotations: annotations,
          shapes: [] as Array<Partial<PlotlyTypes.Shape>> // Initialize with empty array with proper typing
        };

        // Add shapes for divergence zones
        const shapes = combinedData.reduce((acc: Array<Partial<PlotlyTypes.Shape>>, point, i, arr) => {
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
  }, [combinedData, whaleMode]);

  return (
    <div ref={chartRef} className="w-full h-full" />
  );
};

export default NetFlowPlotlyChart;
