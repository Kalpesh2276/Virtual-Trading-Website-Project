import { useState, useEffect, useRef } from 'react';
import { stockAPI } from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RANGES = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
];

function StockChart({ symbol }) {
  const [range, setRange] = useState('1mo');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchChart();
  }, [symbol, range]);

  const fetchChart = async () => {
    setLoading(true);
    try {
      const { data } = await stockAPI.getHistory(symbol, range);
      setChartData(data);
    } catch (err) {
      console.error('Chart fetch error:', err);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const isPositive = chartData.length >= 2
    ? chartData[chartData.length - 1].close >= chartData[0].close
    : true;

  const lineColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';

  const labels = chartData.map(d => {
    const date = new Date(d.date);
    if (range === '1d') {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (range === '1w' || range === '1mo') {
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Price',
        data: chartData.map(d => d.close),
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(13, 19, 33, 0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { size: 11 },
        bodyFont: { size: 14, weight: 'bold' },
        displayColors: false,
        callbacks: {
          label: (ctx) => `₹${ctx.parsed.y?.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxRotation: 0,
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: 'rgba(148, 163, 184, 0.06)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: (val) => `₹${val.toLocaleString('en-IN')}`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="stock-chart">
      <div className="chart-range-selector">
        {RANGES.map(r => (
          <button
            key={r.value}
            className={`chart-range-btn ${range === r.value ? 'chart-range-active' : ''}`}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="chart-canvas-container">
        {loading ? (
          <div className="loading-container" style={{ height: 300 }}>
            <div className="spinner"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="loading-container" style={{ height: 300 }}>
            <p>No chart data available for this range</p>
          </div>
        ) : (
          <Line ref={chartRef} data={data} options={options} />
        )}
      </div>
    </div>
  );
}

export default StockChart;
