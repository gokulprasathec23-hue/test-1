import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Check, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';

const MachineFormModal = ({ isOpen, onClose, machineToEdit, onSave }) => {
  const [formData, setFormData] = useState({
    machineId: '',
    machineName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (machineToEdit) {
      setFormData({
        machineId: machineToEdit.machineId,
        machineName: machineToEdit.machineName,
      });
    } else {
      setFormData({
        machineId: '',
        machineName: '',
      });
    }
    setError(null);
  }, [machineToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!machineToEdit;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    
    try {
      if (isEditing) {
        await axios.put(`${API_BASE_URL}/api/machines/${machineToEdit.machineId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/machines`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred while saving the machine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">
            {isEditing ? 'Edit Machine' : 'Add New Machine'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="machineId" className="block text-sm font-medium text-slate-300 mb-1">
                Machine ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="machineId"
                name="machineId"
                value={formData.machineId}
                onChange={handleChange}
                disabled={isEditing || loading}
                required
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. M-101"
              />
              {isEditing && <p className="text-xs text-slate-500 mt-1">Machine ID cannot be changed.</p>}
            </div>

            <div>
              <label htmlFor="machineName" className="block text-sm font-medium text-slate-300 mb-1">
                Machine Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="machineName"
                name="machineName"
                value={formData.machineName}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. CNC Router Alpha"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-emerald-500 text-dark-900 font-bold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Machine
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineFormModal;
