import { Capacitor } from "@capacitor/core";
import { createContext, useContext } from "react";
import {
  Show as NativeShow,
  useAuth as useNativeAuth,
  useClerk as useNativeClerk,
  useUser as useNativeUser,
} from "capacitor-clerk";
import {
  Show as WebShow,
  useAuth as useWebAuth,
  useClerk as useWebClerk,
  useUser as useWebUser,
} from "@clerk/react";

const isNative = () => Capacitor.isNativePlatform();
const ClerkBridgeContext = createContext(null);

const NativeClerkBridge = ({ children }) => {
  const auth = useNativeAuth();
  const clerk = useNativeClerk();
  const user = useNativeUser();

  return (
    <ClerkBridgeContext.Provider value={{ auth, clerk, isNative: true, user }}>
      {children}
    </ClerkBridgeContext.Provider>
  );
};

const WebClerkBridge = ({ children }) => {
  const auth = useWebAuth();
  const clerk = useWebClerk();
  const user = useWebUser();

  return (
    <ClerkBridgeContext.Provider value={{ auth, clerk, isNative: false, user }}>
      {children}
    </ClerkBridgeContext.Provider>
  );
};

export const ClerkHooksBridge = ({ children }) => {
  if (isNative()) {
    return <NativeClerkBridge>{children}</NativeClerkBridge>;
  }

  return <WebClerkBridge>{children}</WebClerkBridge>;
};

const useBridge = () => {
  const bridge = useContext(ClerkBridgeContext);

  if (!bridge) {
    throw new Error("Clerk hooks must be used inside ClerkHooksBridge.");
  }

  return bridge;
};

export const Show = ({ when, children }) => {
  if (useBridge().isNative) {
    return <NativeShow when={when}>{children}</NativeShow>;
  }

  return <WebShow when={when}>{children}</WebShow>;
};

export const useAuth = () => useBridge().auth;

export const useClerk = () => useBridge().clerk;

export const useUser = () => useBridge().user;