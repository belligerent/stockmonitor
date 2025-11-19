
import React from 'react';
import { LayoutDashboard, Plus, ScrollText } from 'lucide-react';

interface HeaderProps {
  onAddClick: () => void;
  onLogsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddClick, onLogsClick }) => {
  return (
    <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
            <LayoutDashboard className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Monitor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogsClick}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700"
          >
            <ScrollText size={18} />
            <span className="hidden sm:inline">Logs</span>
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Monitor</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;