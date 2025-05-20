
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
          .map((point) => {
            const index = combinedData.findIndex(d => d.timestamp.getTime() === point.timestamp.getTime());
            const price = prices[index];
            
            return {
              x: point.timestamp,
              y: price,
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
              bgcolor: point.divergenceType === DivergenceType.INFLOW_PRICE_DOWN ? '#ea384c' : '#2e7d32',
              bordercolor: "#ffffff",
              borderwidth: 1,
              borderpad: 5,
              font: { color: '#ffffff', size: 16 },
              captureevents: true,
              hovertext: point.divergenceMessage,
            };
          });
        
        // Define layout
        const layout: Partial<PlotlyTypes.Layout> = {
          title: null, // Remove title from chart itself - will be in parent component
          height: 400,
          margin: { t: 30, r: 80, l: 80, b: 70 }, 
          xaxis: {
            title: {
              text: 'Time (UTC)',
              standoff: 20,
              font: {
                size: 13,
                color: '#666'
              }
            },
            showgrid: false,
            zeroline: false
          },
          yaxis: {
            title: {
              text: 'ETH Price (USD)',
              standoff: 20,
              font: {
                size: 13,
                color: '#F97316'
              }
            },
            titlefont: { color: '#F97316' },
            tickfont: { color: '#F97316' },
            side: 'left',
            zeroline: false,
            gridcolor: 'rgba(255,255,255,0.1)',
            fixedrange: false
          },
          yaxis2: {
            title: {
              text: 'Net Inflow Ratio (Buy/Sell)',
              standoff: 20,
              font: {
                size: 13,
                color: '#9b87f5'
              }
            },
            titlefont: { color: '#9b87f5' },
            tickfont: { color: '#9b87f5' },
            side: 'right',
            overlaying: 'y',
            showgrid: false,
            range: [0, 1], // Fixed range from 0 to 1 for normalized values
            fixedrange: false
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.2,
            x: 0.5,
            xanchor: 'center',
            yanchor: 'top',
            bgcolor: 'rgba(255,255,255,0.5)',
            bordercolor: 'rgba(0,0,0,0.1)',
            borderwidth: 1,
            font: { size: 12 }
          },
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
          annotations: annotations,
          shapes: [] as Array<Partial<PlotlyTypes.Shape>>
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
              line: { width: 0 }
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

  return <div ref={chartRef} className="w-full h-full" />;
};

export default NetFlowPlotlyChart;
