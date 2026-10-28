import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApi, publicApi } from "@/lib/api";

const MeCtx = createContext(null);

export function MeProvider({ children }) {
  const api = useApi();
  const [me, setMe] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/me");
      setMe(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [api]);

  useEffect(() => {
    refresh();
    publicApi.get("/config").then((r) => setConfig(r.data));
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  return <MeCtx.Provider value={{ me, config, refresh, api, error }}>{children}</MeCtx.Provider>;
}

export const useMe = () => useContext(MeCtx);
