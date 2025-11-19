import React, { useState, useEffect } from 'react';
import { MonitorConfig } from '../types';
import { X, HelpCircle, BellOff } from 'lucide-react';
import {v4 as uuidv4} from "uuid";


interface MonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (monitor: Omit<MonitorConfig, 'history' | 'currentValue' | 'status' | 'lastCheck' | 'lastAlertTime'>) => void;
  initialData?: MonitorConfig;
}

const MonitorModal: React.FC<MonitorModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
  const [responseKey, setResponseKey] = useState('price');
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  
  // New Fields
  const [minThreshold, setMinThreshold] = useState(0);
  const [maxThreshold, setMaxThreshold] = useState(200);
  const [silencePeriodMinutes, setSilencePeriodMinutes] = useState(6);
  
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setUrl(initialData.url);
      setResponseKey(initialData.responseKey);
      setIntervalSeconds(initialData.intervalSeconds);
      setMinThreshold(initialData.minThreshold ?? 0);
      setMaxThreshold(initialData.maxThreshold ?? 100);
      setSilencePeriodMinutes(initialData.silencePeriodMinutes ?? 6);
      setWebhookUrl(initialData.webhookUrl);
    } else {
      // Defaults
      setName('');
      setUrl('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
      setResponseKey('price');
      setIntervalSeconds(5);
      setMinThreshold(90);
      setMaxThreshold(110);
      setSilencePeriodMinutes(6);
      setWebhookUrl('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || uuidv4(),
      name: name || 'Untitled Monitor',
      url,
      responseKey,
      intervalSeconds,
      minThreshold,
      maxThreshold,
      silencePeriodMinutes,
      webhookUrl,
      isActive: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Monitor' : 'New Price Monitor'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Monitor Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. SOL/USDT Tracker"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">API URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.example.com/price"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                JSON Path Key 
                <span title="The key in the JSON response containing the price." className="cursor-help text-slate-600"><HelpCircle size={12} /></span>
              </label>
              <input
                type="text"
                value={responseKey}
                onChange={e => setResponseKey(e.target.value)}
                placeholder="price"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
                required
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Check Interval (sec)</label>
              <input
                type="number"
                min="2"
                value={intervalSeconds}
                onChange={e => setIntervalSeconds(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-700 pb-2 mb-2">Alert Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Min Price (Lower Limit)</label>
                <input
                  type="number"
                  value={minThreshold}
                  onChange={e => setMinThreshold(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  step="any"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Price (Upper Limit)</label>
                <input
                  type="number"
                  value={maxThreshold}
                  onChange={e => setMaxThreshold(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="bg-slate-700 p-2 rounded-lg text-slate-400">
                <BellOff size={18} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Silence Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={silencePeriodMinutes}
                  onChange={e => setSilencePeriodMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Wait this long before alerting again.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Webhook URL (Optional)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://www.baojing.com/api/call"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
            >
              {initialData ? 'Update Monitor' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonitorModal;