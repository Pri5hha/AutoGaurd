import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applicants from "./pages/Applicants";
import ApplicantDetail from "./pages/ApplicantDetail";
import Alerts from "./pages/Alerts";
import CaseManager from "./pages/CaseManager";
import NetworkGraph from "./pages/NetworkGraph";
import AuditRoom from "./pages/AuditRoom";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import BlockchainLog from "./pages/BlockchainLog";
import { useAuth } from "./context/AuthContext";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot-loader">Authorizing session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/applicants" element={<Applicants />} />
                <Route path="/applicants/:id" element={<ApplicantDetail />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/cases" element={<CaseManager />} />
                <Route path="/network" element={<NetworkGraph />} />
                <Route path="/audit-room" element={<AuditRoom />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/blockchain" element={<BlockchainLog />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
