import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  showNotification: (title: string, body: string) => {
    return ipcRenderer.invoke('show-notification', title, body);
  },
});
