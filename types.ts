export interface PricePoint {
  timestamp: number;
  value: number;
}

export interface MonitorConfig {
  id: string;
  name: string;
  url: string;
  responseKey: string; // e.g. "price" or "data.amount"
  intervalSeconds: number;
  
  // Range Logic
  minThreshold: number;
  maxThreshold: number;
  
  // Silence/Cooldown Logic
  silencePeriodMinutes: number;
  lastAlertTime: number; // timestamp

  webhookUrl: string;
  isActive: boolean;
  lastCheck: number;
  history: PricePoint[];
  currentValue: number | null;
  status: 'ok' | 'alert' | 'error';
  errorMessage?: string;
}

export type LogType = 'action' | 'poll' | 'alert' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  monitorName?: string;
  message: string;
  details?: string;
}