import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';

const PerformanceChart = ({ machineId }) => {
  const [logData, setLogData] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/machine/logs/${machineId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogData(res.data);
      } catch (error) {
        console.error("Error fetching logs", error);
      }
    };

    fetchLogs();
    
    // Refresh chart data every 5 seconds to match simulator
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [machineId]);

  if (logData.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Waiting for data...</div>;
  }

  const times = logData.map(log => {
      const d = new Date(log.recordedAt);
      return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
  });
  
  const temps = logData.map(log => log.temperature);

  const data = {
    labels: times,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: temps,
        borderColor: 'rgba(59, 130, 246, 1)', // primary blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 0, // hide points for smoother look
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4 // smooth curves
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#cbd5e1',
        bodyColor: '#fff',
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 5,
          color: '#64748b',
          font: { size: 10 }
        }
      },
      y: {
        min: 0,
        max: 120, // max expected temp for scaling
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          stepSize: 30
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return <Line options={options} data={data} />;
};

export default PerformanceChart;
