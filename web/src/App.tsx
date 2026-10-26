import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { useAuth } from "./hooks/useAuth";
import AppLayout from "./components/layout/AppLayout";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import NewListingPage from "./pages/farmer/NewListingPage";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import ListingDetailPage from "./pages/buyer/ListingDetailPage";
import OfficerDashboard from "./pages/officer/OfficerDashboard"; // <-- IMPORTED HERE

function AdminDashboard() { return <div className="text-center mt-10"><h1 className="text-3xl font-bold text-brand-700">Admin Control</h1></div>; }

function DashboardRouter() {
  const { userData, loading } = useAuth();

  if (loading) return <div className="text-center mt-20">Loading profile...</div>;
  if (!userData) return <Navigate to="/login" replace />;

  switch (userData.role) {
    case "farmer": return <FarmerDashboard />;
    case "buyer": return <BuyerDashboard />;
    case "officer": return <OfficerDashboard />; // <-- ADDED HERE
    case "admin": return <AdminDashboard />;
    default: return <div>Unknown role</div>;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardRouter />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/farmer/new-listing" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <NewListingPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/dashboard/listing/:id" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <ListingDetailPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}