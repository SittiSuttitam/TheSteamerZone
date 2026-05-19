const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tsz', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  connectTiktok: (username) => ipcRenderer.invoke('connect-tiktok', username),
  getPaths: () => ipcRenderer.invoke('get-paths'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  restartConnector: () => ipcRenderer.invoke('restart-connector'),
  onLog: (cb) => {
    ipcRenderer.on('log', (_e, line) => cb(line));
  },
  onConnectorStopped: (cb) => {
    ipcRenderer.on('connector-stopped', (_e, code) => cb(code));
  },
});
