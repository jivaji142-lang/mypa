import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeCapacitor } from "./lib/capacitor";

initializeCapacitor().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
