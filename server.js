import express from "express";

import cors from "cors";

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- In-Memory Database ---
let monitors = [];
let logs = [];

// --- Helper Functions ---
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const addLog = (type, message, monitorName, details) => {
  const log = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    monitorName,
    message,
    details
  };
  logs.unshift(log);
  if (logs.length > 1000) logs = logs.slice(0, 1000);
};

// --- Polling Logic (Runs in Background) ---
const pollMonitor = async (monitor) => {
  if (!monitor.isActive) return;

  const now = Date.now();
  const elapsed = (now - monitor.lastCheck) / 1000;
  if (elapsed < monitor.intervalSeconds) return;

  // Update lastCheck immediately to prevent double polling
  monitor.lastCheck = now;

  try {
    const response = await fetch(monitor.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const json = await response.json();
    const valRaw = getNestedValue(json, monitor.responseKey);
    const val = parseFloat(valRaw);

    if (isNaN(val)) throw new Error(`Invalid number at key: ${monitor.responseKey}`);

    // Update Value
    monitor.currentValue = val;
    monitor.errorMessage = undefined; // Clear error
    monitor.history.push({ timestamp: now, value: val });
    if (monitor.history.length > 50) monitor.history.shift();

    // Check Logic
    const isLow = val < monitor.minThreshold;
    const isHigh = val > monitor.maxThreshold;
    
    if (isLow || isHigh) {
      // Check Silence
      const silenceDurationMs = (monitor.silencePeriodMinutes || 6) * 60 * 1000;
      const isSilenced = (now - monitor.lastAlertTime) < silenceDurationMs;

      if (!isSilenced) {
        // FIRE ALERT
        monitor.status = 'alert';
        monitor.lastAlertTime = now;
        
        const direction = isLow ? 'Low' : 'High';
        const msg = `Price ${val} outside range (${monitor.minThreshold}-${monitor.maxThreshold})`;
        
        addLog('alert', `Triggered ${direction} Alert`, monitor.name, msg);
        console.log(`[ALERT] ${monitor.name}: ${msg}`);

        // Webhook
        if (monitor.webhookUrl) {
          fetch(monitor.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              monitorId: monitor.id,
              name: monitor.name,
              value: val,
              alert: direction,
              timestamp: now
            })
          }).catch(e => console.error(`Webhook failed for ${monitor.name}:`, e.message));
        }
      } else {
        // Silenced
        monitor.status = 'alert'; // Keep visual alert
      }
    } else {
      monitor.status = 'ok';
    }

  } catch (error) {
    monitor.status = 'error';
    monitor.errorMessage = error.message;
    addLog('error', 'Poll failed', monitor.name, error.message);
  }
};

// Global Polling Loop
setInterval(() => {
  monitors.forEach(m => pollMonitor(m));
}, 1000);

// --- API Routes ---

// Get all monitors (Snapshot)
app.get('/api/monitors', (req, res) => {
  res.json(monitors);
});

// Add Monitor
app.post('/api/monitors', (req, res) => {
  const config = req.body;
  const newMonitor = {
    ...config,
    id: config.id || crypto.randomUUID(),
    history: [],
    currentValue: null,
    status: 'ok',
    lastCheck: 0,
    lastAlertTime: 0,
    isActive: true
  };
  monitors.push(newMonitor);
  addLog('action', 'Created monitor', newMonitor.name);
  res.json(newMonitor);
});

// Update Monitor
app.put('/api/monitors/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = monitors.findIndex(m => m.id === id);
  if (index !== -1) {
    // Preserve state but update config
    const oldName = monitors[index].name;
    monitors[index] = {
      ...monitors[index],
      ...updates,
      // Reset silence on edit
      lastAlertTime: 0 
    };
    addLog('action', 'Updated monitor', oldName, 'Silence period reset');
    res.json(monitors[index]);
  } else {
    res.status(404).json({ error: 'Monitor not found' });
  }
});

// Delete Monitor
app.delete('/api/monitors/:id', (req, res) => {
  const { id } = req.params;
  const m = monitors.find(x => x.id === id);
  if (m) {
    monitors = monitors.filter(x => x.id !== id);
    addLog('action', 'Deleted monitor', m.name);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Toggle Monitor
app.post('/api/monitors/:id/toggle', (req, res) => {
  const { id } = req.params;
  const m = monitors.find(x => x.id === id);
  if (m) {
    m.isActive = !m.isActive;
    addLog('action', m.isActive ? 'Resumed' : 'Paused', m.name);
    res.json(m);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Get Logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.post('/api/logs/clear', (req, res) => {
  logs = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`--------------------------------------------------`);
  console.log(`  Monitor Server running on http://localhost:${PORT}`);
  console.log(`  Background monitoring is active.`);
  console.log(`--------------------------------------------------`);
});
