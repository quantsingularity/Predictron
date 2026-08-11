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

// Everything under /dashboard is wrapped in RequireAuth. No separate
// /login or /signup route: the first SIWE signature creates the account.
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
