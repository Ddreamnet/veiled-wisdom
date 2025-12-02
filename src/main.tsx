import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPrefetch } from "./lib/routePrefetch";

// Initialize prefetch optimizations
initPrefetch();

createRoot(document.getElementById("root")!).render(<App />);
