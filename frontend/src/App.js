import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Appointments from "./pages/Appointments";
import NewAppointment from "./pages/NewAppointment";
import Instructions from "./pages/Instructions";
import Reminders from "./pages/Reminders";
import FollowUps from "./pages/FollowUps";
import PatientPortal from "./pages/PatientPortal";
import AuthCallback from "./pages/AuthCallback";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse-teal">
          <div className="w-12 h-12 rounded-full bg-teal-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "patient" ? "/portal" : "/dashboard"} replace />;
  }

  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // Check for session_id in URL hash synchronously
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Staff Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/patients" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <Patients />
        </ProtectedRoute>
      } />
      <Route path="/patients/:patientId" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <PatientDetails />
        </ProtectedRoute>
      } />
      <Route path="/appointments" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <Appointments />
        </ProtectedRoute>
      } />
      <Route path="/appointments/new" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <NewAppointment />
        </ProtectedRoute>
      } />
      <Route path="/instructions" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <Instructions />
        </ProtectedRoute>
      } />
      <Route path="/reminders" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <Reminders />
        </ProtectedRoute>
      } />
      <Route path="/followups" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <FollowUps />
        </ProtectedRoute>
      } />
      
      {/* Patient Routes */}
      <Route path="/portal" element={
        <ProtectedRoute allowedRoles={["patient"]}>
          <PatientPortal />
        </ProtectedRoute>
      } />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
