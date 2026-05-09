import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import App from "./App";
import { useTerminalStore } from "./store";
import { SERVER } from "./lib/server";
import "./index.css";

// Prepend Render server to every relative /api call
axios.interceptors.request.use((config) => {
  if (config.url?.startsWith("/")) {
    config.url = `${SERVER}${config.url}`;
  }
  return config;
});

// On a 401, either clear Kite auth (expired session) or app token (invalid app login)
axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      if (err.response.data?.kiteAuthExpired) {
        useTerminalStore.getState().setAuth(false);
      } else {
        useTerminalStore.getState().setAppToken(null);
      }
    }
    return Promise.reject(err);
  }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
