
import React, { useState } from 'react';
import { MonitorConfig } from './types';
import MonitorCard from './components/MonitorCard';
import MonitorModal from './components/MonitorModal';
import Header from './components/Header';
import EmptyState from './components/EmptyState';
import LogViewer from './components/LogViewer';
import { useMonitors } from './hooks/useMonitors';
import { useMonitorPolling } from './hooks/useMonitorPolling';
import { useLogs } from './hooks/useLogs';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<MonitorConfig | undefined>(undefined);
  
  // Initialize Logging
  const { logs, addLog, clearLogs, isLogViewerOpen, setIsLogViewerOpen } = useLogs();

  // Custom Hooks
  const { 
    monitors, 
    setMonitors, 
    addMonitor, 
    updateMonitor, 
    deleteMonitor, 
    toggleMonitor 
  } = useMonitors(addLog);

  // Initialize Polling Service
  useMonitorPolling(monitors, setMonitors, addLog);

  const handleSaveMonitor = (monitorConfig: Omit<MonitorConfig, 'history' | 'currentValue' | 'status' | 'lastCheck' | 'lastAlertTime'>) => {
    if (editingMonitor) {
      updateMonitor(monitorConfig);
    } else {
      addMonitor(monitorConfig);
    }
    setEditingMonitor(undefined);
  };

  const handleEdit = (monitor: MonitorConfig) => {
    setEditingMonitor(monitor);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingMonitor(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <Header 
        onAddClick={handleAddClick} 
        onLogsClick={() => setIsLogViewerOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {monitors.length === 0 ? (
          <EmptyState onCreateClick={() => setIsModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {monitors.map(monitor => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onDelete={deleteMonitor}
                onToggle={toggleMonitor}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </main>

      <MonitorModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingMonitor(undefined); }}
        onSave={handleSaveMonitor}
        initialData={editingMonitor}
      />

      <LogViewer 
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
        logs={logs}
        onClear={clearLogs}
      />
    </div>
  );
}

export default App;