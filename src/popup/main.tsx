import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./popup.css";

const rootElement = document.getElementById("root");
document.documentElement.lang = chrome.i18n.getUILanguage();

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
