import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Show } from "@clerk/react";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { MeProvider } from "@/context/MeContext";
import AppShell from "@/components/layout/AppShell";
import Landing from "@/pages/Landing";
import { SignInPage, SignUpPage } from "@/pages/AuthPages";
import Discover from "@/pages/Discover";
import CreatorProfile from "@/pages/CreatorProfile";
import CreatorSetup from "@/pages/CreatorSetup";
import BusinessSetup from "@/pages/BusinessSetup";
import Deals from "@/pages/Deals";
import ChatList from "@/pages/ChatList";
import DealRoom from "@/pages/DealRoom";
import Notifications from "@/pages/Notifications";
import Saved from "@/pages/Saved";
import Upgrade from "@/pages/Upgrade";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

const Protected = () => (
  <>
    <Show when="signed-in"><MeProvider><AppShell /></MeProvider></Show>
    <Show when="signed-out"><Navigate to="/" replace /></Show>
  </>
);

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<Discover />} />
            <Route path="search" element={<Discover search />} />
            <Route path="creator/:id" element={<CreatorProfile />} />
            <Route path="setup/creator" element={<CreatorSetup />} />
            <Route path="setup/business" element={<BusinessSetup />} />
            <Route path="deals" element={<Deals />} />
            <Route path="chat" element={<ChatList />} />
            <Route path="chat/:id" element={<DealRoom />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="saved" element={<Saved />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </ClerkAuthProvider>
    </BrowserRouter>
  );
}

export default App;
