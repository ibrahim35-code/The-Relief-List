import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Verifying session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check user role
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    const defaultRoute = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={defaultRoute} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
