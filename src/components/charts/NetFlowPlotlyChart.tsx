
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
          .map((point) => ({
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
        
        // Define layout with proper typing for shapes
        const layout: Partial<PlotlyTypes.Layout> = {
          title: whaleMode ? 
            'ETH Net Inflow vs Price (Whale Trades Only)' : 
            'ETH Net Inflow vs Price (24h)',
          height: 350,
          margin: { t: 40, r: 70, l: 70, b: 100 }, // Increased bottom margin to 100
          xaxis: {
            title: {
              text: 'Time (UTC)',
              standoff: 40, // Increased standoff to create more space
            },
            showgrid: false,
          },
          yaxis: {
            title: {
              text: 'ETH Net Flow (scaled)',
              titlefont: { color: '#9b87f5' },
              tickfont: { color: '#9b87f5' },
              side: 'left',
              zeroline: true,
              zerolinecolor: '#ccc',
              gridcolor: 'rgba(155, 135, 245, 0.1)',
              range: [-0.1, 1.1], // Add some padding to normalized range
            },
          },
          yaxis2: {
            title: {
              text: 'ETH Price (USD)',
              titlefont: { color: '#F97316' },
              tickfont: { color: '#F97316' },
              side: 'right',
              overlaying: 'y',
              showgrid: false,
            },
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.20, // Moved legend down to keep it within the white box
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center'
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
