
import React, { useState } from 'react';
import { LogEntry, LogType } from '../types';
import { X, Trash2, Filter, Activity, AlertTriangle, Settings, Database } from 'lucide-react';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClear: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ isOpen, onClose, logs, onClear }) => {
  const [filter, setFilter] = useState<LogType | 'all'>('all');

  if (!isOpen) return null;

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={14} className="text-red-500" />;
      case 'error': return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'action': return <Settings size={14} className="text-blue-400" />;
      case 'poll': return <Activity size={14} className="text-slate-500" />;
      default: return <Database size={14} />;
    }
  };

  const getTypeColor = (type: LogType) => {
    switch (type) {
      case 'alert': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'error': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'action': return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'poll': return 'text-slate-400'; // Minimal style for noise
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <Database className="text-blue-500" />
            <h2 className="text-lg font-bold text-white">System Logs</h2>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
              {logs.length} events
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClear}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Clear Logs"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-900/50">
          <Filter size={14} className="text-slate-500 ml-1" />
          {(['all', 'action', 'alert', 'poll', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full capitalize border transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white border-blue-500' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto font-mono text-sm p-2 space-y-1 bg-[#0f172a]">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 italic">
              No logs found for this filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`grid grid-cols-[auto_auto_1fr_auto] gap-3 items-start p-2 rounded hover:bg-white/5 ${getTypeColor(log.type)}`}
              >
                <span className="text-slate-500 whitespace-nowrap text-xs mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
                
                <span className="mt-0.5" title={log.type}>{getTypeIcon(log.type)}</span>
                
                <div className="break-all">
                  <span className="font-semibold mr-2">
                    {log.monitorName ? `[${log.monitorName}]` : '[System]'}
                  </span>
                  {log.message}
                </div>

                {log.details && (
                  <span className="text-xs bg-black/20 px-2 py-0.5 rounded border border-white/5 text-slate-300 whitespace-nowrap">
                    {log.details}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
