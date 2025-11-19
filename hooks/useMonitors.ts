
import { useState, useEffect } from 'react';
import { MonitorConfig, LogType } from '../types';

const API_URL = 'http://localhost:3001/api';

type LogFunction = (type: LogType, message: string, monitorName?: string, details?: string) => void;

export const useMonitors = (addLog: LogFunction) => {
  const [monitors, setMonitors] = useState<MonitorConfig[]>([]);

  // Initial Fetch
  const refreshMonitors = async () => {
    try {
      const res = await fetch(`${API_URL}/monitors`);
      if (res.ok) {
        const data = await res.json();
        setMonitors(data);
      }
    } catch (e) {
      console.error("Failed to fetch monitors from server", e);
    }
  };

  useEffect(() => {
    refreshMonitors();
  }, []);

  const addMonitor = async (config: Omit<MonitorConfig, 'history' | 'currentValue' | 'status' | 'lastCheck' | 'lastAlertTime'>) => {
    try {
      const res = await fetch(`${API_URL}/monitors`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config)
      });
      if (res.ok) refreshMonitors();
    } catch (e) {
      console.error("Add failed", e);
    }
  };

  const updateMonitor = async (config: Omit<MonitorConfig, 'history' | 'currentValue' | 'status' | 'lastCheck' | 'lastAlertTime'>) => {
    try {
      const res = await fetch(`${API_URL}/monitors/${config.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(config)
      });
      if (res.ok) refreshMonitors();
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const deleteMonitor = async (id: string) => {
    try {
      await fetch(`${API_URL}/monitors/${id}`, { method: 'DELETE' });
      setMonitors(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const toggleMonitor = async (id: string) => {
    try {
      await fetch(`${API_URL}/monitors/${id}/toggle`, { method: 'POST' });
      // We don't manually update state here, the polling hook will pick up the change
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  return {
    monitors,
    setMonitors,
    addMonitor,
    updateMonitor,
    deleteMonitor,
    toggleMonitor
  };
};
