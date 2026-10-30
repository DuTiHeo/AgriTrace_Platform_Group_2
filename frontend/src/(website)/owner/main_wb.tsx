import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App_wb";
import AppErrorBoundary from "../../components/owner/AppErrorBoundary_wb";
import "../../styles/mobile_palette_wb.css";
import "../../styles/theme_wb.css";
import "../../styles/global_wb.css";
import "../../styles/layout_wb.css";
import "../../styles/shared_wb.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
