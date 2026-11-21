import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const appearance = {
  variables: {
    colorPrimary: "#7C3AED",
    colorPrimaryForeground: "#FFFFFF",
    colorForeground: "#0F172A",
    colorBorder: "#E2E8F0",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    formFieldInput: "border-2 border-slate-500 shadow-sm focus:border-violet-600 focus:ring-2 focus:ring-violet-300",
    socialButtonsBlockButton: "border-2 border-slate-500 shadow-sm hover:border-violet-600",
  },
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Starts Clerk from the backend's runtime config, so deploy's live keys need no rebuild.
export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle;
    CapacitorApp.addListener("appUrlOpen", (event) => {
      if (!event.url.startsWith("co.hireavatar.app://")) return;

      const callback = new URL(event.url);
      const destination = callback.pathname === "/app" ? `/app${callback.search}${callback.hash}` : "/app";
      navigate(destination, { replace: true });
    }).then((listener) => { handle = listener; });

    return () => handle?.remove();
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = await (await fetch(`${BACKEND_URL}/api/clerk/config`)).json();
        if (cfg.enabled) return cancelled || setConfig(cfg);
      } catch {}
      if (cancelled) return;
      if (attempt >= 20) return setUnavailable(true);
      setTimeout(() => load(attempt + 1), 1500);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const isNative = Capacitor.isNativePlatform();

  if (unavailable) return (
    <div className="grid min-h-screen place-items-center px-6 text-center text-white" data-testid="signin-unavailable">
      <div className="glass max-w-sm rounded-[28px] p-8">
        <p className="text-xl font-extrabold">Sign-in is unavailable right now</p>
        <p className="mt-1 text-sm text-white/75">We couldn't reach the sign-in service.</p>
        <button onClick={() => window.location.reload()} className="mt-5 h-11 rounded-full bg-white px-6 text-sm font-extrabold text-[#3B25A8]" data-testid="signin-unavailable-retry">Try again</button>
      </div>
    </div>
  );
  if (!config) return null;
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      localization={{
        signIn: { start: { title: "Continue to HireAvatar", titleCombined: "Continue to HireAvatar" } },
        signUp: { start: { title: "Create your HireAvatar account", titleCombined: "Create your HireAvatar account" } },
      }}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl={isNative ? "co.hireavatar.app://auth/callback" : "/app"}
      signUpFallbackRedirectUrl={isNative ? "co.hireavatar.app://auth/callback" : "/app"}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
