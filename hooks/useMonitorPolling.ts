
import { useEffect } from 'react';
import { MonitorConfig, LogType } from '../types';

const API_URL = 'http://47.86.34.245:3001/api';

type LogFunction = (type: LogType, message: string, monitorName?: string, details?: string) => void;

export const useMonitorPolling = (
  monitors: MonitorConfig[],
  setMonitors: React.Dispatch<React.SetStateAction<MonitorConfig[]>>,
  addLog: LogFunction
) => {
  
  // When running in background mode, this hook simply polls the backend
  // to get the latest state of all monitors (values, history, status).
  // The backend does the heavy lifting.

  useEffect(() => {
    const syncState = async () => {
      try {
        const res = await fetch(`${API_URL}/monitors`);
        if (!res.ok) return; // Server might be down
        
        const serverData: MonitorConfig[] = await res.json();
        
        setMonitors(prev => {
          // Merge logic to prevent UI jitter if needed, or just replace.
          // Replacing is simpler.
          return serverData;
        });

      } catch (e) {
        // Silent fail if server is offline, user will see EmptyState or stale data
        console.debug("Sync failed", e);
      }
    };

    const intervalId = setInterval(syncState, 1000);
    return () => clearInterval(intervalId);
  }, [setMonitors]);
};
