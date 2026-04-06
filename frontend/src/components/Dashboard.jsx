import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MachineCard from './MachineCard';
import MachineFormModal from './MachineFormModal';
import { LogOut, Activity, AlertTriangle, Cpu, Plus, Wifi } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';
const POLL_INTERVAL = 5000; // 5 seconds — matches simulator interval

const Dashboard = ({ setAuth }) => {
  const [machines, setMachines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const prevMachinesRef = useRef([]);
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user?.role === 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(false);
  };

  const showAlert = (message) => {
    const alertData = { message, id: Date.now() };
    setAlerts(prev => [...prev, alertData]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alertData.id)), 5000);
  };

  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/machines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const incoming = res.data;
      setIsConnected(true);

      // Detect critical alerts from temperature changes
      const prev = prevMachinesRef.current;
      incoming.forEach(machine => {
        const prevMachine = prev.find(m => m.machineId === machine.machineId);
        if (
          machine.health === 'Critical' &&
          (!prevMachine || prevMachine.health !== 'Critical')
        ) {
          showAlert(`⚠️ High Temp Alert: ${machine.machineName} is CRITICAL (${machine.temperature?.toFixed(1)}°C)`);
        }
      });

      prevMachinesRef.current = incoming;
      setMachines(incoming);
    } catch (err) {
      setIsConnected(false);
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        showAlert(err.response?.data?.message || 'Failed to connect to server');
      }
    }
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-200 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 glass-panel p-4 md:px-8">
        <div className="flex items-center gap-3 w-full md:w-auto mb-4 md:mb-0">
          <Activity className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Smart IoT Control Center</h1>
            <p className="text-xs text-slate-400 font-mono">Operations Dashboard</p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t border-slate-700/50 pt-4 md:border-t-0 md:pt-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              )}
            </span>
            <span className="text-sm text-slate-300 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {isConnected ? 'Live (polling 5s)' : 'Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-700 md:pl-6 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-xs text-primary">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-dark-700/50 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors border border-slate-600/50"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-xl shadow-lg shadow-red-900/20 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <p className="font-semibold">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-slate-400" /> Connected Machines
            <span className="bg-dark-700 text-xs px-2 py-1 rounded-full">{machines.length}</span>
          </h2>

          {isAdmin && (
            <button
              onClick={() => { setEditingMachine(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-emerald-500 text-dark-900 font-bold rounded-lg transition-all shadow-lg shadow-accent/20 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Machine
            </button>
          )}
        </div>

        {machines.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400 max-w-2xl mx-auto mt-12">
            <Cpu className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No machines connected.</p>
            <p className="text-sm mt-1">Start the IoT Simulator to see machines appear here automatically.</p>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 w-full max-w-7xl">
              {machines.map(machine => (
                <MachineCard
                  key={machine._id || machine.machineId}
                  machine={machine}
                  userRole={user?.role}
                  onEdit={() => { setEditingMachine(machine); setIsModalOpen(true); }}
                  onActionDone={fetchMachines}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <MachineFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machineToEdit={editingMachine}
        onSave={() => { setIsModalOpen(false); fetchMachines(); }}
      />
    </div>
  );
};

export default Dashboard;
