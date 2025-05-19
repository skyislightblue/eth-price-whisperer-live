
import React, { useEffect, useRef } from 'react';

interface VolumeChartProps {
  data: {
    timestamp: number;
    volumeUSD: number;
  }[];
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const loadPlotly = async () => {
      try {
        const Plotly = await import('plotly.js-dist-min');
        
        // Format timestamps for display
        const timestamps = data.map(item => {
          const date = new Date(item.timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        
        const volumes = data.map(item => item.volumeUSD);
        
        const trace = {
          x: timestamps,
          y: volumes,
          type: 'bar',
          marker: {
            color: 'rgb(75, 192, 192)',
          },
          name: 'ETH/USDC Volume',
          hovertemplate: '$%{y:.2f}<extra></extra>'
        };
        
        const layout = {
          height: 300,
          margin: { t: 10, r: 30, l: 100, b: 60 }, // Increased left margin for y-axis labels
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
              standoff: 30, // Increased standoff
            },
            tickprefix: '$',
            tickformat: ',.0f', // Changed to simpler format without decimals
            tickfont: {
              size: 10, // Smaller font size
            },
            nticks: 8, // Limit number of ticks to avoid overcrowding
          },
          barmode: 'group',
          bargap: 0.15,
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

export default VolumeChart;
