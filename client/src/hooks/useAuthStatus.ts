import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTerminalStore } from "../store";

export function useAuthStatus() {
  const setAuth = useTerminalStore((s) => s.setAuth);

  const { data } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => axios.get("/api/auth/status").then((r) => r.data),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) {
      setAuth(data.authenticated, data.profile);
    }
  }, [data]);

  return data;
}
