import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Capacitor packages are native-only; provide empty stubs when they can't be resolved
// (e.g. on Vercel where native SDKs aren't installed). All usage is guarded by
// Capacitor.isNativePlatform() checks so the stubs are never actually called at runtime.
const capacitorModules = new Set([
  "@capacitor/app",
  "@capacitor/browser",
  "@capacitor/splash-screen",
  "@capacitor/status-bar",
  "@capacitor/local-notifications",
  "@capacitor/push-notifications",
  "@capacitor-community/text-to-speech",
]);

function capacitorStubPlugin(): Plugin {
  // At startup, check which Capacitor packages are actually missing
  const missing: string[] = [];
  capacitorModules.forEach((mod) => {
    try {
      require.resolve(mod);
    } catch {
      missing.push(mod);
    }
  });

  if (missing.length > 0) {
    console.log(`[vite] Stubbing missing Capacitor modules: ${missing.join(", ")}`);
  }

  return {
    name: "capacitor-stub",
    enforce: "pre",
    resolveId(source) {
      if (missing.includes(source)) {
        return `\0capacitor-stub:${source}`;
      }
      return null;
    },
    load(id) {
      if (id.startsWith("\0capacitor-stub:")) {
        return `
          const handler = {
            get(_, prop) {
              if (prop === '__esModule') return true;
              if (prop === 'default') return new Proxy({}, handler);
              return (...args) => Promise.resolve();
            }
          };
          const stub = new Proxy({}, handler);
          export default stub;
          export const App = stub;
          export const Browser = stub;
          export const SplashScreen = stub;
          export const StatusBar = stub;
          export const Style = {};
          export const LocalNotifications = stub;
          export const PushNotifications = stub;
          export const TextToSpeech = stub;
        `;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    capacitorStubPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.ELECTRON === 'true' ? './' : '/',
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
