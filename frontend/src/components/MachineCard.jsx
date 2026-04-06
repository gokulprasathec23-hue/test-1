import { useState, useEffect } from 'react';
import axios from 'axios';
import { Power, RotateCcw, AlertOctagon, Activity, Thermometer, Zap, Clock, Edit2, Trash2 } from 'lucide-react';
import PerformanceChart from './PerformanceChart';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';

const MachineCard = ({ machine, userRole, onEdit, onActionDone }) => {
  const [loadingAction, setLoadingAction] = useState(false);
  const [uptime, setUptime] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    let interval;
    if (machine.status === 'Running' && machine.startedAt) {
      const updateUptime = () => {
        const start = new Date(machine.startedAt);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        
        if (diff < 0) return setUptime('0s');
        
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        
        const hDisplay = h > 0 ? h + "h " : "";
        const mDisplay = m > 0 ? m + "m " : "";
        const sDisplay = s + "s";
        setUptime(hDisplay + mDisplay + sDisplay);
      };
      
      updateUptime();
      interval = setInterval(updateUptime, 1000);
    } else {
      setUptime('Offline');
    }
    
    return () => clearInterval(interval);
  }, [machine.status, machine.startedAt]);
  
  const isAdmin = userRole === 'Admin';

  const sendCommand = async (command) => {
    if (!isAdmin) return alert("Operator permission restricted for control actions.");
    
    setLoadingAction(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/machine/${command}`, 
        { machineId: machine.machineId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || `Failed to send ${command} command`);
    } finally {
      setLoadingAction(false);
      if (onActionDone) onActionDone();
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to delete machine ${machine.machineName}?`)) return;

    setLoadingAction(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/machines/${machine.machineId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to delete machine');
      setLoadingAction(false);
    }
    if (onActionDone) onActionDone();
  };

  const statusColor = 
    machine.status === 'Running' ? 'bg-accent text-accent' :
    machine.status === 'Stopped' ? 'bg-slate-500 text-slate-400' :
    machine.status === 'Error' ? 'bg-red-500 text-red-500' : 'bg-yellow-500 text-yellow-500';

  const healthColor = 
    machine.health === 'Good' ? 'text-accent' :
    machine.health === 'Warning' ? 'text-yellow-400' :
    'text-red-500 animate-pulse';

  return (
    <div className="glass-panel overflow-hidden transition-all duration-300 hover:border-slate-600/80">
      {/* Card Header */}
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-dark-800/50">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 group">
            {machine.machineName}
            {machine.health !== 'Good' && <AlertOctagon className={`w-4 h-4 ${healthColor}`} />}
            {isAdmin && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                <button 
                  onClick={onEdit} 
                  disabled={loadingAction}
                  className="p-1 text-slate-400 hover:text-accent disabled:opacity-50"
                  title="Edit Machine"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleDelete} 
                  disabled={loadingAction}
                  className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-50"
                  title="Delete Machine"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {machine.machineId}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900/50 border border-white/5">
             <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
             <span className={`text-xs font-semibold ${statusColor.replace('bg-', 'text-').split(' ')[1]}`}>
               {machine.status.toUpperCase()}
             </span>
          </div>
          {machine.status === 'Running' && uptime !== 'Offline' && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-widest mr-1 opacity-80">
              <Clock className="w-3 h-3" /> UP: {uptime}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricBox icon={<Thermometer className="w-4 h-4 text-orange-400" />} label="Temp" value={`${machine.temperature.toFixed(1)}°C`} />
          <MetricBox icon={<Activity className="w-4 h-4 text-blue-400" />} label="Speed" value={`${machine.rpm.toFixed(0)} RPM`} />
          <MetricBox icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Voltage" value={`${machine.voltage.toFixed(0)} V`} />
          <MetricBox icon={<Zap className="w-4 h-4 text-purple-400" />} label="Draw" value={`${machine.current.toFixed(1)} A`} />
        </div>

        {/* Chart Area */}
        <div className="h-48 mb-6 bg-dark-900/30 rounded-xl p-2 border border-white/5 relative">
           <PerformanceChart machineId={machine.machineId} />
        </div>

        {/* Controls */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              {machine.status !== 'Running' ? (
                <button 
                  onClick={() => sendCommand('start')} 
                  disabled={loadingAction || !isAdmin}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 btn-primary !bg-accent hover:!bg-emerald-500 disabled:opacity-50"
                >
                  <Power className="w-4 h-4" /> Start
                </button>
              ) : (
                <button 
                  onClick={() => sendCommand('stop')} 
                  disabled={loadingAction || !isAdmin}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 btn-primary !bg-slate-700 hover:!bg-slate-600 disabled:opacity-50"
                >
                  <Power className="w-4 h-4" /> Stop
                </button>
              )}
              
              <button 
                onClick={() => sendCommand('restart')} 
                disabled={loadingAction || !isAdmin || machine.status === 'Error'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-dark-700 hover:bg-dark-600 text-white font-medium py-2 px-4 rounded-lg transition-all active:scale-95 disabled:opacity-50 border border-slate-600"
              >
                <RotateCcw className="w-4 h-4" /> Restart
              </button>
            </div>
            
            <button 
              onClick={() => sendCommand('emergency-stop')} 
              disabled={loadingAction || !isAdmin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 btn-danger disabled:opacity-50"
            >
              <AlertOctagon className="w-4 h-4" /> E-STOP
            </button>
          </div>
          {!isAdmin && <p className="text-xs text-center text-slate-500 mt-3 pt-1 border-t border-slate-700/50">Admin privileges required to control machines</p>}
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ icon, label, value }) => (
  <div className="bg-dark-900/50 rounded-lg p-3 border border-white/5 flex flex-col items-center justify-center text-center">
    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-bold text-white tracking-tight">{value}</span>
  </div>
);

export default MachineCard;
