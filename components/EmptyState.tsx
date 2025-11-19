
import React from 'react';
import { BellRing, Plus, Activity, Server } from 'lucide-react';

interface EmptyStateProps {
  onCreateClick: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
      <div className="bg-slate-800 p-6 rounded-full mb-6 animate-pulse-fast relative">
        <BellRing className="w-12 h-12 text-slate-500" />
        <div className="absolute -bottom-1 -right-1 bg-blue-900 p-1 rounded-full border border-slate-700">
            <Activity size={16} className="text-blue-400"/>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">No active monitors</h2>
      <div className="flex items-center gap-2 text-slate-400 mb-8 bg-slate-800/50 px-4 py-2 rounded-full">
        <Server size={14} />
        <span className="text-sm">Server backend required</span>
      </div>
      <button
        onClick={onCreateClick}
        className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 border border-slate-700"
      >
        <Plus size={20} /> Create Monitor
      </button>
    </div>
  );
};

export default EmptyState;
