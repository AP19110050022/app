import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { publicApi } from "@/lib/api";

const sessionId = () => {
  let id = sessionStorage.getItem("hmf_sid");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("hmf_sid", id); }
  return id;
};

const NAMES = [
  [/^\/$/, "Landing"], [/^\/sign-in/, "Sign in"], [/^\/sign-up/, "Sign up"], [/^\/app\/?$/, "Discover"], [/^\/app\/search/, "Search"],
  [/^\/app\/creator\//, "Creator profile"], [/^\/app\/business\//, "Business profile"], [/^\/app\/chat\/.+/, "Chat room"], [/^\/app\/chat/, "Chat list"],
  [/^\/app\/deals/, "Deals"], [/^\/app\/jobs/, "Jobs"], [/^\/app\/saved/, "Saved"], [/^\/app\/notifications/, "Notifications"],
  [/^\/app\/upgrade/, "Upgrade to Pro"], [/^\/app\/profile/, "My profile"], [/^\/app\/settings/, "Settings"], [/^\/app\/posts/, "My posts"],
];

export const track = (page) => {
  const last = sessionStorage.getItem("hmf_last");
  const stamp = `${page}|${Math.floor(Date.now() / 2000)}`;
  if (last === stamp) return;
  sessionStorage.setItem("hmf_last", stamp);
  publicApi.post("/track", { session_id: sessionId(), page }).catch(() => {});
};

export const authEvent = (kind) => {
  const key = `hmf_auth_${kind}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  publicApi.post("/auth-events", { session_id: sessionId(), kind, host: window.location.host }).catch(() => {});
};

export function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/app/setup")) return;
    const hit = NAMES.find(([rx]) => rx.test(pathname));
    if (hit) track(hit[1]);
  }, [pathname]);
  return null;
}
