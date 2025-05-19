
import React, { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

interface PriceChartProps {
  data: {
    timestamp: number;
    price: number;
  }[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Extract timestamps and prices
        const timestamps = data.map(item => new Date(item.timestamp));
        const prices = data.map(item => item.price);
        
        // Find min and max prices for range
        const minPrice = Math.min(...prices) * 0.995; // Slight padding
        const maxPrice = Math.max(...prices) * 1.005; // Slight padding
        
        // Determine color based on price trend
        const lineColor = prices[prices.length - 1] >= prices[0] ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
        const fillColor = prices[prices.length - 1] >= prices[0] ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        
        const trace = {
          x: timestamps,
          y: prices,
          mode: 'lines',
          line: {
            color: lineColor,
            width: 2,
            shape: 'spline',
            smoothing: 1.3,
          },
          fill: 'tozeroy',
          fillcolor: fillColor,
          hoverinfo: 'x+y',
          name: 'ETH Price'
        };
        
        const layout = {
          height: 300,
          margin: { t: 10, r: 10, l: 50, b: 40 },
          xaxis: {
            showgrid: false,
            zeroline: false,
          },
          yaxis: {
            range: [minPrice, maxPrice],
            tickformat: '$.2f',
            title: {
              text: 'Price (USD)',
              standoff: 10,
            },
            fixedrange: true,
          },
          showlegend: false,
          plot_bgcolor: 'rgba(0,0,0,0)',
          paper_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'closest',
        };
        
        const config = {
          responsive: true,
          displayModeBar: false,
        };
        
        Plotly.newPlot(chartRef.current, [trace], layout, config);
        
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

export default PriceChart;
