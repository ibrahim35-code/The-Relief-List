import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const RedirectIfAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  if (user) {
    const destination = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
};

export default RedirectIfAuth;
