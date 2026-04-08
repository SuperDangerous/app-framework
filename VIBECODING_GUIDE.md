# Vibecoding with SuperDangerous App Framework

A guide for AI agents building production apps with this framework. Read this before you start writing any code.

---

## What this framework gives you

The framework pre-wires the infrastructure layer so you focus on business logic. Here is an exact accounting of what is provided versus what you supply:

**Framework provides:**
- HTTP server (Express) with JSON body parsing, CORS, trust-proxy, error handling
- WebSocket server (Socket.IO) with connection/disconnection lifecycle
- Graceful shutdown on SIGTERM/SIGINT
- Winston logging with daily rotation, file + console output, archive
- Settings persistence to disk (JSON) with validation and auto-save
- Background job queue with priority, retries, concurrency control
- Email delivery via Resend API or SMTP/Nodemailer
- AI provider abstraction (OpenAI; mock for testing)
- Health check endpoints at `/health` and `/api/health`
- Request logging middleware
- Desktop/Electron integration (auto-detected)
- File storage and path utilities
- 20+ React UI components (DataTable, LogViewer, ConnectionStatus, SettingsFramework, Wizard, etc.)

**You provide:**
- Your application routes (`app.get`, `app.post`, etc.)
- Your business logic
- Your data models
- Your service integrations (database drivers, third-party APIs)
- Your registered settings categories
- Your job handlers

---

## Starting a new app

### 1. Install

```bash
npm install @superdangerous/app-framework
```

### 2. Create your server entry point

```typescript
import { StandardServer } from '@superdangerous/app-framework';

const server = new StandardServer({
  appName: 'my-app',
  appVersion: '1.0.0',
  description: 'What this app does',
  port: 3000,
  enableWebSocket: true,           // default: true
  enableRequestLogging: true,      // default: true
  gracefulShutdownSignals: ['SIGTERM', 'SIGINT'],  // default

  onInitialize: async (app, io) => {
    // Register your routes here
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // io is the WebSocketServer instance — use it for real-time
  },

  onStart: async () => {
    // Called after the server is listening
    // Good place for: loading initial data, starting cron jobs, etc.
  },
});

await server.start();
```

### 3. StandardServerConfig reference

```typescript
interface StandardServerConfig {
  appName: string;              // required
  appVersion: string;           // required
  description?: string;
  port?: number;                // default: 8080
  webPort?: number;             // optional separate UI port
  host?: string;                // default: localhost (dev) / 0.0.0.0 (prod)
  environment?: string;         // default: process.env.NODE_ENV
  enableWebSocket?: boolean;    // default: true
  enableRequestLogging?: boolean; // default: true
  bodyLimit?: string | number;  // default: '10mb'
  corsOrigins?: string[];       // additional CORS origins
  onInitialize?: (app: Express, io?: WebSocketServer) => Promise<void>;
  onStart?: () => Promise<void>;
  exitOnStartupError?: boolean; // default: true (false in test env)
  enableDesktopIntegration?: boolean;  // auto-detected from Electron
  appId?: string;               // desktop app identifier
}
```

### 4. Get the Express app and WebSocket server

```typescript
// Inside onInitialize you receive both:
onInitialize: async (app, io) => {
  // app is the Express instance
  // io is the WebSocketServer instance (see WebSocket section)
}

// After construction, you can also access:
const expressApp = server.getApp();
const httpServer = server.getServer();
```

---

## Adding real-time features

### Server side

The `io` parameter passed to `onInitialize` is a `WebSocketServer` instance.

```typescript
onInitialize: async (app, io) => {
  // Broadcast to ALL connected clients
  io.broadcast('my-event', { key: 'value' });

  // Broadcast to subscribers of a specific simulator/channel
  io.broadcastToSimulator('simulator-id', 'data:update', { values: { temp: 22.5 } });

  // Access the raw Socket.IO Server instance for full control
  const socketIO = io.getIO();
  if (socketIO) {
    socketIO.on('connection', (socket) => {
      socket.on('my:client-event', (data) => {
        // Handle client event
        io.broadcast('my:server-event', { ...data, serverTime: Date.now() });
      });
    });
  }

  // Get connection stats
  const stats = io.getStats();
  // stats.totalClients, stats.totalSubscriptions, stats.simulatorSubscriptions
}
```

### Client side (React)

```typescript
import { useSocketIO } from '@superdangerous/app-framework/react';
import { useEffect, useState } from 'react';

function MyComponent() {
  const [messages, setMessages] = useState<any[]>([]);
  const [{ connected }, { on, off, emit }] = useSocketIO({ autoConnect: true });

  useEffect(() => {
    const handler = (data: any) => setMessages(prev => [...prev, data]);
    on('my:server-event', handler);
    return () => off('my:server-event', handler);
  }, [on, off]);

  const sendMessage = (text: string) => {
    emit('my:client-event', { text });
  };

  return (
    <div>
      <ConnectionStatus connected={connected} label="Live" />
      {/* ... */}
    </div>
  );
}
```

The hook returns `[state, actions]`:
- `state.connected` — boolean
- `state.socketId` — string | null
- `actions.on(event, handler)` — subscribe
- `actions.off(event, handler)` — unsubscribe
- `actions.emit(event, data)` — send to server

---

## Building your UI

All UI components are React and imported from the framework's react sub-package.

### Key components

| Component | Purpose |
|-----------|---------|
| `ConnectionStatus` | Animated connection dot + label |
| `LogViewer` | Real-time filterable log display |
| `DataTable` | Paginated/sortable table with column definitions |
| `SettingsFramework` | Auto-renders settings categories |
| `Wizard` | Multi-step form with progress |
| `StatusBar` | App-level status strip |
| `MacWindow` | macOS-style window chrome wrapper |

### ConnectionStatus

```tsx
import { ConnectionStatus } from '@superdangerous/app-framework/react';

<ConnectionStatus connected={connected} label="WebSocket" />
```

### LogViewer

```tsx
import { LogViewer } from '@superdangerous/app-framework/react';

// Minimal — polls /api/logs endpoint
<LogViewer />

// With config
<LogViewer
  maxLines={200}
  refreshInterval={2000}
  defaultFilter="info"
/>
```

### DataTable

```tsx
import { DataTable } from '@superdangerous/app-framework/react';

const columns = [
  { key: 'name',     label: 'Name',   sortable: true },
  { key: 'status',   label: 'Status', render: (val) => <Badge variant={val} /> },
  { key: 'updated',  label: 'Updated' },
];

<DataTable
  columns={columns}
  data={rows}
  pageSize={25}
  onRowClick={(row) => navigate(`/detail/${row.id}`)}
/>
```

---

## Adding data tables

### Server-side data for DataTable

Create an endpoint that returns paginated data:

```typescript
app.get('/api/records', async (req, res) => {
  const page = parseInt(String(req.query.page ?? '0'));
  const limit = parseInt(String(req.query.limit ?? '25'));
  const sort = String(req.query.sort ?? 'updatedAt');
  const dir = String(req.query.dir ?? 'desc');

  // Your data fetching logic here
  const { rows, total } = await db.getRecords({ page, limit, sort, dir });

  res.json({ rows, total, page, limit });
});
```

### Client-side pagination

```typescript
const [data, setData] = useState<{ rows: any[]; total: number }>({ rows: [], total: 0 });
const [page, setPage] = useState(0);

useEffect(() => {
  fetch(`/api/records?page=${page}&limit=25`)
    .then(r => r.json())
    .then(setData);
}, [page]);

<DataTable
  columns={columns}
  data={data.rows}
  total={data.total}
  page={page}
  pageSize={25}
  onPageChange={setPage}
/>
```

---

## Settings and configuration

### SettingsService (server-side)

```typescript
import { SettingsService } from '@superdangerous/app-framework';

const settings = new SettingsService({
  storagePath: './data/settings.json',  // where to persist
  autoSave: true,                        // default: true
  saveDebounce: 1000,                    // ms between auto-saves
});

// Register a category
settings.registerCategory({
  id: 'server',
  label: 'Server',
  description: 'Server configuration',
  icon: 'Server',
  order: 1,
  fields: [
    {
      key: 'server.port',
      label: 'Port',
      type: 'number',
      defaultValue: 3000,
      min: 1,
      max: 65535,
      required: true,
    },
    {
      key: 'server.debug',
      label: 'Debug Mode',
      type: 'boolean',
      defaultValue: false,
    },
  ],
});

// Load persisted settings
await settings.load();

// Read a value
const port = settings.get<number>('server.port', 3000);

// Write a value (triggers auto-save)
await settings.set('server.debug', true);

// Bulk update
await settings.update({ 'server.port': 4000, 'server.debug': false });

// Get all values
const all = settings.getAll();

// Reset a category to defaults
settings.reset('server');

// Listen for changes
settings.on('change', ({ key, value, previous }) => {
  console.log(`${key} changed: ${previous} → ${value}`);
});
```

### SettingsField types

```typescript
type FieldType =
  | 'text' | 'number' | 'boolean' | 'select' | 'multiselect'
  | 'json' | 'password' | 'email' | 'url' | 'color'
  | 'date' | 'time' | 'datetime';
```

### Wire settings to HTTP endpoints

Expose settings over the API so the frontend can read/write them:

```typescript
app.get('/api/settings', async (req, res) => {
  res.json({
    categories: settings.getCategories(),
    values: settings.getAll(),
  });
});

app.put('/api/settings', async (req, res) => {
  await settings.update(req.body);
  res.json({ success: true, values: settings.getAll() });
});

app.post('/api/settings/reset/:categoryId', async (req, res) => {
  settings.reset(req.params.categoryId);
  res.json({ success: true });
});
```

### SettingsFramework (React component)

```tsx
import { SettingsFramework } from '@superdangerous/app-framework/react';

function SettingsPage() {
  return (
    <SettingsFramework
      onSave={async (values) => {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      }}
      onLoad={async () => {
        const res = await fetch('/api/settings');
        const data = await res.json();
        return data.values;
      }}
      categories={categories}  // SettingsCategory[] from server
    />
  );
}
```

### Pre-built settings categories

```typescript
import { CommonSettingsCategories } from '@superdangerous/app-framework';

settings.registerCategory(CommonSettingsCategories.general());
settings.registerCategory(CommonSettingsCategories.server());
settings.registerCategory(CommonSettingsCategories.logging());
```

---

## Background jobs

### QueueService setup

```typescript
import { QueueService } from '@superdangerous/app-framework';

const queue = new QueueService({
  maxConcurrentJobs: 3,
  pollingInterval: 5000,   // ms
  maxRetries: 3,
  enablePersistence: false, // set true to survive restarts
});

// Register a handler for a job type
queue.registerHandler('send-email', async (job) => {
  const { to, subject, body } = job.data;
  await emailService.sendEmail({ to, subject, text: body });
});

queue.registerHandler('generate-report', async (job) => {
  const { userId, format } = job.data;
  const report = await generateReport(userId, format);
  await saveReport(report);
});

// Start processing
await queue.start();
```

### Adding jobs

```typescript
// Add a job (returns job ID)
const jobId = await queue.addJob('send-email', {
  to: 'user@example.com',
  subject: 'Your report is ready',
  body: 'Click here to download',
});

// Add with priority (higher number = higher priority, default: 0)
const urgentId = await queue.addJob('send-email', { to: 'admin@...' }, 10);

// Check job status
const job = queue.getJob(jobId);
// job.status: 'pending' | 'processing' | 'completed' | 'failed'

// Get all jobs
const allJobs = queue.getAllJobs();

// Queue stats
const stats = queue.getStats();
// { total, pending, processing, completed, failed, activeJobs }

// Clear completed and failed jobs
queue.clearFinishedJobs();
```

### Job events

```typescript
queue.on('job:added',     (job) => { /* ... */ });
queue.on('job:started',   (job) => { /* ... */ });
queue.on('job:completed', (job) => { /* ... */ });
queue.on('job:failed',    (job) => { /* ... */ });
queue.on('job:retry',     (job) => { /* ... */ });
```

### Expose queue over WebSocket for live updates

```typescript
queue.on('job:completed', (job) => {
  io.broadcast('queue:job-completed', { jobId: job.id, type: job.type });
});

queue.on('job:failed', (job) => {
  io.broadcast('queue:job-failed', { jobId: job.id, error: job.error });
});
```

---

## Desktop app (Electron)

### When to add Electron

Add Electron when you need: file system access, system tray, native notifications, offline capability, or a packaged installer.

### Configuration

The framework auto-detects Electron via `process.versions.electron`. You can also force it:

```typescript
const server = new StandardServer({
  appName: 'my-desktop-app',
  appVersion: '1.0.0',
  enableDesktopIntegration: true,
  appId: 'com.mycompany.myapp',      // used for data path
  desktopDataPath: '/custom/path',    // optional override
  webPort: 3001,                      // Vite dev server port
  corsOrigins: ['http://localhost:3001'],
});
```

### Desktop data paths

```typescript
// Get the platform-appropriate data directory
const dataPath = server.getDataPath();
// macOS:   ~/Library/Application Support/com.mycompany.myapp
// Windows: %APPDATA%/com.mycompany.myapp
// Linux:   ~/.local/share/com.mycompany.myapp

// In your code, use this as the base for all persistent storage:
const dbPath = path.join(server.getDataPath(), 'database.db');
const settingsPath = path.join(server.getDataPath(), 'settings.json');
```

### IPC patterns

```typescript
// main.ts — start the backend server in the main process
import { app, BrowserWindow, ipcMain } from 'electron';

app.whenReady().then(async () => {
  await server.start();

  const win = new BrowserWindow({
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  win.loadURL('http://localhost:3001');  // your React app
});

// Expose native capabilities via ipcMain
ipcMain.handle('show-open-dialog', async (event, options) => {
  const { dialog } = await import('electron');
  return dialog.showOpenDialog(options);
});
```

---

## Health monitoring

### Built-in health endpoints

Every app automatically gets:
- `GET /health` — basic alive check (returns `{ status: 'ok' }`)
- `GET /api/health` — detailed health with system metrics

### Custom health checks

```typescript
import { createHealthCheckRouter, getHealthCheckService } from '@superdangerous/app-framework';

onInitialize: async (app) => {
  const healthService = getHealthCheckService();

  // Register custom checks
  healthService.registerCheck('database', async () => {
    const connected = await db.ping();
    return {
      healthy: connected,
      message: connected ? 'Database connected' : 'Database unreachable',
    };
  });

  healthService.registerCheck('external-api', async () => {
    try {
      const res = await fetch('https://api.example.com/ping');
      return { healthy: res.ok, message: `API responded ${res.status}` };
    } catch {
      return { healthy: false, message: 'API unreachable' };
    }
  });

  // Mount the health router
  app.use('/api/health', createHealthCheckRouter());
}
```

---

## Logging

### createLogger

```typescript
import { createLogger } from '@superdangerous/app-framework';

// Create a named logger for your module
const logger = createLogger('MyService');

logger.info('Server started');
logger.warn('Slow query detected', { duration: 340, query: 'SELECT ...' });
logger.error('Connection failed', { host: 'db.example.com', error: err.message });
logger.debug('Request received', { method: req.method, path: req.url });
```

Log levels (in order of severity): `error` > `warn` > `info` > `http` > `verbose` > `debug` > `silly`

### Log file location

Logs are written to:
- **Standard app:** `./data/logs/app-YYYY-MM-DD.log`
- **Desktop app:** `~/Library/Application Support/{appId}/logs/app-YYYY-MM-DD.log`

Logs rotate daily. Files older than 14 days are compressed and archived.

### Log management API

```typescript
// Built-in logs API router — mount this to expose log endpoints
import { logsRouter } from '@superdangerous/app-framework';
app.use('/api/logs', logsRouter);

// Available endpoints after mounting:
// GET  /api/logs          — recent log entries
// GET  /api/logs/files    — list log files
// GET  /api/logs/stats    — size and file count
// POST /api/logs/compact  — archive old logs
// POST /api/logs/clear    — clear all logs
```

### LogViewer component

```tsx
// The LogViewer component connects to /api/logs automatically
<LogViewer />

// Or with custom config:
<LogViewer
  apiEndpoint="/api/logs"
  refreshInterval={3000}
  maxLines={500}
/>
```

---

## AI integration

### AIService setup

```typescript
import { AIService } from '@superdangerous/app-framework';

const aiService = new AIService();

// Register a provider
aiService.registerProvider('openai', {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',          // default chat model
  temperature: 0.7,
  maxTokens: 2000,
  enableLogging: true,
  models: {
    chat: 'gpt-4o-mini',
    template: 'gpt-4-turbo-preview',
    fileAnalysis: 'gpt-4-turbo',
    validation: 'gpt-3.5-turbo',
  },
});

// Register a mock provider for development/testing
aiService.registerProvider('mock', {
  provider: 'mock',
});

aiService.setDefaultProvider('openai');
```

### Analyze (single prompt)

```typescript
const response = await aiService.analyze(
  'Summarize this document in 3 bullet points: ' + content,
  {
    temperature: 0.3,
    maxTokens: 500,
    systemPrompt: 'You are a concise technical writer.',
  }
);

console.log(response.content);
console.log(response.usage?.totalTokens);
console.log(response.cost);
```

### Chat (conversation)

```typescript
import { AIMessage } from '@superdangerous/app-framework';

const messages: AIMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: 'Paris.' },
  { role: 'user', content: 'And Germany?' },
];

const response = await aiService.chat(messages, {
  temperature: 0.5,
});
```

### Analyze a file

```typescript
const response = await aiService.analyzeFile(
  fileContent,    // string content
  'csv',          // file type
  { name: 'Sales Data 2024', manufacturer: 'Internal' },
  { maxTokens: 4000 }
);

console.log(response.analysis);
console.log(response.dataPoints);  // parsed JSON data points if found
```

### Caching

```typescript
// Responses are cached by content hash by default
// Pass useCache: false to skip:
const response = await aiService.analyze(prompt, { useCache: false });

// Clear cache manually:
aiService.clearCache();
```

### AIService events

```typescript
aiService.on('analysis:start',    ({ prompt, provider }) => { /* ... */ });
aiService.on('analysis:complete', ({ response, provider }) => { /* ... */ });
aiService.on('analysis:error',    ({ error, provider }) => { /* ... */ });
aiService.on('chat:start',        ({ messages, provider }) => { /* ... */ });
aiService.on('chat:complete',     ({ response, provider }) => { /* ... */ });
```

---

## Email service

### Setup

```typescript
import { createEmailService } from '@superdangerous/app-framework';

const emailService = await createEmailService({
  enabled: true,
  provider: 'resend',        // or 'smtp'
  resend: {
    apiKey: process.env.RESEND_API_KEY!,
  },
  from: 'MyApp <noreply@myapp.com>',
  to: ['admin@myapp.com'],   // default recipients
  appName: 'MyApp',
  appTitle: 'My Application',
  brandColor: '#FF0050',
});
```

### Sending emails

```typescript
// Simple email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to MyApp',
  text: 'Thanks for signing up.',
  html: '<p>Thanks for signing up.</p>',
});

// Structured notification
await emailService.notify('success', 'Export Complete', {
  filename: 'report-2024.csv',
  rows: 1247,
  duration: '3.2s',
});

// Error alert
await emailService.notifyError('Database connection lost', {
  host: 'db.example.com',
  port: 5432,
});

// Startup notification
await emailService.notifyStartup({ environment: 'production', version: '2.1.0' });
```

---

## From idea to production: the pattern

Follow this sequence for any new app:

### 1. Define your data model

Sketch what data your app stores and serves. Don't write code yet — just answer: what are the records? What fields do they have? How do they relate?

### 2. Create your server and routes

```typescript
const server = new StandardServer({ ... });

server.config.onInitialize = async (app, io) => {
  // CRUD endpoints for your core model
  app.get('/api/items', listItems);
  app.get('/api/items/:id', getItem);
  app.post('/api/items', createItem);
  app.put('/api/items/:id', updateItem);
  app.delete('/api/items/:id', deleteItem);

  // Mount built-in routers
  app.use('/api/logs', logsRouter);
};
```

### 3. Wire up your UI

Build the React pages that call your API. Use `DataTable` for lists, `SettingsFramework` for settings, `LogViewer` for logs, `ConnectionStatus` for WebSocket state.

### 4. Add real-time if needed

If your app needs live updates (dashboards, monitoring, collaboration), wire WebSocket events in `onInitialize` and use `useSocketIO` on the client.

### 5. Configure settings

Create a `SettingsService`, register your categories, expose `/api/settings`, and drop in `<SettingsFramework>` in your settings page.

### 6. Add background jobs if needed

If you have work that should happen asynchronously (email batching, report generation, data sync), create a `QueueService`, register handlers, and call `queue.addJob()` from your routes.

### 7. Deploy

```bash
# Standard Node.js deployment
NODE_ENV=production npm start

# Docker
FROM node:20-alpine
COPY . .
RUN npm ci --production
CMD ["node", "dist/index.js"]
```

The server binds to `0.0.0.0` in production automatically. Health checks are live at `/health`. Graceful shutdown is handled on SIGTERM.

---

## Common patterns

### Pattern: Route + WebSocket broadcast

```typescript
// POST creates record AND notifies connected clients
app.post('/api/items', async (req, res) => {
  const item = await db.createItem(req.body);
  io.broadcast('item:created', item);
  res.status(201).json(item);
});
```

### Pattern: Paginated list endpoint

```typescript
app.get('/api/items', async (req, res) => {
  const page  = parseInt(String(req.query.page  ?? '0'));
  const limit = parseInt(String(req.query.limit ?? '25'));
  const sort  = String(req.query.sort ?? 'createdAt');

  const items = await db.list({ page, limit, sort });
  const total = await db.count();

  res.json({ items, total, page, limit });
});
```

### Pattern: Job with real-time progress

```typescript
queue.registerHandler('process-file', async (job) => {
  const { fileId } = job.data;
  const file = await db.getFile(fileId);

  // Update progress via WebSocket
  io.broadcast('job:progress', { jobId: job.id, percent: 0 });

  const result = await processFile(file, (percent) => {
    io.broadcast('job:progress', { jobId: job.id, percent });
  });

  await db.saveResult(fileId, result);
  io.broadcast('job:done', { jobId: job.id, fileId });
});
```

### Pattern: Settings-aware service

```typescript
// Initialize a service using current settings
async function initDatabaseService() {
  const host = settings.get<string>('db.host', 'localhost');
  const port = settings.get<number>('db.port', 5432);
  const db = new DatabaseService({ host, port });
  await db.connect();
  return db;
}

// Reconnect when settings change
settings.on('change', async ({ key }) => {
  if (key.startsWith('db.')) {
    await db.disconnect();
    db = await initDatabaseService();
  }
});
```

---

## Things NOT to do

- Do not install and configure `cors` manually — the framework does it via `corsOrigins` config
- Do not install `winston` directly — use `createLogger()` from the framework
- Do not write your own graceful shutdown handler — `gracefulShutdownSignals` handles this
- Do not implement your own health endpoints — use `logsRouter` and the built-in `/health`
- Do not create a second `WebSocketServer` — there is exactly one instance per process, accessed via the `io` parameter in `onInitialize`
- Do not call `settings.save()` manually in most cases — `autoSave: true` handles debounced persistence

---

## Package exports reference

```typescript
// Core
import { StandardServer, createStandardServer } from '@superdangerous/app-framework';
import type { StandardServerConfig } from '@superdangerous/app-framework';

// Services
import { SettingsService, CommonSettingsCategories } from '@superdangerous/app-framework';
import { QueueService } from '@superdangerous/app-framework';
import { AIService, aiService } from '@superdangerous/app-framework';
import { createEmailService, getEmailService, EmailService } from '@superdangerous/app-framework';
import { createWebSocketServer, getWebSocketServer } from '@superdangerous/app-framework';

// Logging
import { createLogger } from '@superdangerous/app-framework';
import { logsRouter } from '@superdangerous/app-framework';

// Health
import { createHealthCheckRouter, getHealthCheckService } from '@superdangerous/app-framework';

// API response helpers
import { sendSuccess, sendError, sendNotFound, sendCreated, asyncHandler } from '@superdangerous/app-framework';

// Middleware
import { validate, schemas } from '@superdangerous/app-framework';

// Testing
import { TestServer, createTestServer, setupTestServer } from '@superdangerous/app-framework';
```
