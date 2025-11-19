import React, { useEffect, useState } from 'react';
import { MonitorConfig } from '../types';
import PriceChart from './PriceChart';
import { Trash2, Edit2, Play, Square, AlertTriangle, BellOff } from 'lucide-react';

interface MonitorCardProps {
  monitor: MonitorConfig;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (monitor: MonitorConfig) => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ monitor, onDelete, onToggle, onEdit }) => {
  const isAlerting = monitor.status === 'alert';
  const isError = monitor.status === 'error';
  const borderColor = isAlerting ? 'border-red-500' : isError ? 'border-yellow-500' : 'border-slate-700';
  const glowClass = isAlerting ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' : '';

  // Calculate silence status for UI
  const [isSilenced, setIsSilenced] = useState(false);

  useEffect(() => {
    const checkSilence = () => {
        if (!monitor.lastAlertTime) {
            setIsSilenced(false);
            return;
        }
        const now = Date.now();
        const silenceDurationMs = (monitor.silencePeriodMinutes || 6) * 60 * 1000;
        const timeLeft = silenceDurationMs - (now - monitor.lastAlertTime);
        setIsSilenced(timeLeft > 0);
    };
    
    checkSilence();
    const timer = setInterval(checkSilence, 1000); // Update UI every second
    return () => clearInterval(timer);
  }, [monitor.lastAlertTime, monitor.silencePeriodMinutes]);

  return (
    <div className={`bg-slate-800 rounded-xl border ${borderColor} ${glowClass} p-5 transition-all duration-300 relative overflow-hidden group`}>
      {/* Status Indicator Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAlerting ? 'bg-red-500 animate-pulse' : monitor.isActive ? 'bg-green-500' : 'bg-slate-600'}`}></div>

      <div className="flex justify-between items-start pl-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {monitor.name}
            {isAlerting && !isSilenced && <AlertTriangle className="text-red-500 w-5 h-5 animate-bounce" />}
            {isSilenced && (
                <span className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600" title="Alerts silenced (Cooldown)">
                    <BellOff size={12} /> Silenced
                </span>
            )}
          </h3>
          <div className="text-slate-400 text-xs font-mono mt-1 truncate max-w-[250px]" title={monitor.url}>
            {monitor.url}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onToggle(monitor.id)}
            className={`p-2 rounded-lg transition-colors ${monitor.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
            title={monitor.isActive ? "Pause Monitoring" : "Resume Monitoring"}
          >
            {monitor.isActive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button 
            onClick={() => onEdit(monitor)}
            className="p-2 rounded-lg bg-slate-700 text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Edit Configuration"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(monitor.id)}
            className="p-2 rounded-lg bg-slate-700 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Delete Monitor"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Value Display */}
      <div className="mt-6 flex items-baseline gap-2 pl-3">
        <span className={`text-4xl font-bold tracking-tight ${isAlerting ? 'text-red-400' : 'text-white'}`}>
          {monitor.currentValue !== null ? monitor.currentValue.toLocaleString() : '---'}
        </span>
        <span className="text-slate-500 text-sm font-medium">
          Current Value
        </span>
      </div>

      {/* Conditions */}
      <div className="mt-2 pl-3 text-sm text-slate-400 flex flex-wrap gap-2">
        <span className="bg-slate-900/50 px-2 py-1 rounded text-xs border border-slate-700 flex items-center gap-1">
          Alert if <span className="text-red-400 font-mono">&lt;{monitor.minThreshold}</span> or <span className="text-red-400 font-mono">&gt;{monitor.maxThreshold}</span>
        </span>
        <span className="bg-slate-900/50 px-2 py-1 rounded text-xs border border-slate-700">
           {monitor.intervalSeconds}s interval
        </span>
      </div>

      {/* Error Message */}
      {monitor.errorMessage && (
        <div className="mt-2 ml-3 p-2 bg-yellow-900/20 border border-yellow-900/50 text-yellow-500 text-xs rounded">
          Error: {monitor.errorMessage}
        </div>
      )}

      {/* Chart */}
      <PriceChart data={monitor.history} color={isAlerting ? '#ef4444' : '#10b981'} />
    </div>
  );
};

export default MonitorCard;