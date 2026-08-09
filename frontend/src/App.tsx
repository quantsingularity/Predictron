import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { DashboardLayout } from "./components/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Prediction from "./pages/Prediction";
import Staking from "./pages/Staking";
import Leaderboard from "./pages/Leaderboard";
import Referrals from "./pages/Referrals";
import Admin from "./pages/Admin";

// "/" is the public homepage — connecting a wallet and signing the SIWE
// message both happen from there (or from the header on any dashboard
// page). Everything under /dashboard is wrapped in RequireAuth, which
// redirects back to "/" if there's no valid session. There's no separate
// /login route and no /signup flow: the first time an address signs a
// SIWE message, the backend creates its user row on the spot (see
// code/backend/src/services/siwe.service.ts) — sign-in and sign-up are the
// same wallet action.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<RequireAuth />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/prediction" element={<Prediction />} />
            <Route path="/dashboard/staking" element={<Staking />} />
            <Route path="/dashboard/leaderboard" element={<Leaderboard />} />
            <Route path="/dashboard/referrals" element={<Referrals />} />
            <Route path="/dashboard/admin" element={<Admin />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
