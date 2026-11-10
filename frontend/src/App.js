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
import Profile from "@/pages/Profile";
import AdminShell from "@/pages/admin/AdminShell";
import Pricing from "@/pages/admin/Pricing";
import { RouteTracker, authEvent } from "@/lib/track";
import AdminDashboard from "@/pages/admin/Dashboard";
import Approvals from "@/pages/admin/Approvals";
import AdminUsers from "@/pages/admin/Users";
import UserDetail from "@/pages/admin/UserDetail";
import Content from "@/pages/admin/Content";
import AdminDeals from "@/pages/admin/AdminDeals";
import Reports from "@/pages/admin/Reports";
import Team from "@/pages/admin/Team";
import Activity from "@/pages/admin/Activity";
import SettingsPage from "@/pages/Settings";
import Posts from "@/pages/Posts";
import Jobs from "@/pages/Jobs";
import BusinessProfile from "@/pages/BusinessProfile";

const SignedOut = ({ to }) => {
  const at = Number(sessionStorage.getItem("hmf_auth_attempt") || 0);
  if (at && Date.now() - at < 180000) authEvent("bounced");
  return <Navigate to={to} replace />;
};

const Protected = () => (
  <>
    <Show when="signed-in"><MeProvider><AppShell /></MeProvider></Show>
    <Show when="signed-out"><SignedOut to="/" /></Show>
  </>
);

const ProtectedAdmin = () => (
  <>
    <Show when="signed-in"><MeProvider><AdminShell /></MeProvider></Show>
    <Show when="signed-out"><SignedOut to="/sign-in" /></Show>
  </>
);

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
        <RouteTracker />
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
            <Route path="upgrade" element={<Navigate to="/app/profile" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Navigate to="/admin" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="posts" element={<Posts />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="business/:id" element={<BusinessProfile />} />
          </Route>
          <Route path="/admin" element={<ProtectedAdmin />}>
            <Route index element={<AdminDashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="content" element={<Content />} />
            <Route path="deals" element={<AdminDeals />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<Team />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="activity" element={<Activity />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </ClerkAuthProvider>
    </BrowserRouter>
  );
}

export default App;
