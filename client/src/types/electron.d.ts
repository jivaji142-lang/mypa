interface ElectronAPI {
  isElectron: boolean;
  platform: NodeJS.Platform;
  showNotification: (title: string, body: string) => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
