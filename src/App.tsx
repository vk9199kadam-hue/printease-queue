import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeApp } from './utils/init';
import { Loader2 } from 'lucide-react';

import Landing from './pages/Landing';
import StudentLogin from './pages/student/Login';
import Profile from './pages/student/Profile';
import StudentDashboard from './pages/student/Dashboard';
import FileUpload from './pages/student/FileUpload';
import Payment from './pages/student/Payment';
import OrderConfirmed from './pages/student/OrderConfirmed';
import OrderTracking from './pages/student/OrderTracking';
import OrderHistory from './pages/student/OrderHistory';
import CapstoneUpload from './pages/student/CapstoneUpload';
import ShopLogin from './pages/shop/Login';
import ShopDashboard from './pages/shop/Dashboard';
import ShopSubmissions from './pages/shop/SubmissionsInbox';
import OrderDetail from './pages/shop/OrderDetail';
import CapstoneOrders from './pages/shop/CapstoneOrders';
import Analytics from './pages/shop/Analytics';
import ShopSettings from './pages/shop/Settings';
import AdminDashboard from './pages/admin/Dashboard';

function ProtectedStudentRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-primary" size={32} /></div>;
  if (!session || session.role !== 'student') return <Navigate to="/student/login" replace />;
  return <>{children}</>;
}

function ProtectedShopRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-primary" size={32} /></div>;
  if (!session || session.role !== 'shopkeeper') return <Navigate to="/shop/login" replace />;
  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-primary" size={32} /></div>;
  if (!session || session.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/profile" element={<Profile />} />
      <Route path="/student/dashboard" element={<ProtectedStudentRoute><StudentDashboard /></ProtectedStudentRoute>} />
      <Route path="/student/upload" element={<ProtectedStudentRoute><FileUpload /></ProtectedStudentRoute>} />
      <Route path="/student/capstone" element={<ProtectedStudentRoute><CapstoneUpload /></ProtectedStudentRoute>} />
      <Route path="/student/payment" element={<ProtectedStudentRoute><Payment /></ProtectedStudentRoute>} />
      <Route path="/student/confirmed" element={<ProtectedStudentRoute><OrderConfirmed /></ProtectedStudentRoute>} />
      <Route path="/student/track/:order_id" element={<ProtectedStudentRoute><OrderTracking /></ProtectedStudentRoute>} />
      <Route path="/student/history" element={<ProtectedStudentRoute><OrderHistory /></ProtectedStudentRoute>} />
      <Route path="/shop/login" element={<ShopLogin />} />
      <Route path="/shop/dashboard" element={<ProtectedShopRoute><ShopDashboard /></ProtectedShopRoute>} />
      <Route path="/shop/submissions" element={<ProtectedShopRoute><ShopSubmissions /></ProtectedShopRoute>} />
      <Route path="/shop/capstone" element={<ProtectedShopRoute><CapstoneOrders /></ProtectedShopRoute>} />
      <Route path="/shop/order/:order_id" element={<ProtectedShopRoute><OrderDetail /></ProtectedShopRoute>} />
      <Route path="/shop/analytics" element={<ProtectedShopRoute><Analytics /></ProtectedShopRoute>} />
      <Route path="/shop/settings" element={<ProtectedShopRoute><ShopSettings /></ProtectedShopRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => { initializeApp(); }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
