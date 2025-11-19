
import { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogType } from '../types';

const API_URL = 'http://47.86.34.245:3001/api';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);

  // Poll for logs
  useEffect(() => {
    if (!isLogViewerOpen) return;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_URL}/logs`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error("Failed to fetch logs", e);
      }
    };

    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [isLogViewerOpen]);

  // This is now just a placeholder as logs are generated server-side mostly
  // But we keep it for client-side actions if needed
  const addLog = useCallback((type: LogType, message: string, monitorName?: string, details?: string) => {
    // In server mode, we assume the server logs most things. 
    // However, for UI actions that don't hit the API yet, we could log locally, 
    // but simplistically we rely on server logs for consistency.
  }, []);

  const clearLogs = useCallback(async () => {
    await fetch(`${API_URL}/logs/clear`, { method: 'POST' });
    setLogs([]);
  }, []);

  return {
    logs,
    addLog,
    clearLogs,
    isLogViewerOpen,
    setIsLogViewerOpen
  };
};
