import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      try {
        const response = await api.get('/auth/me');
        if (isMounted && response.data?.user) {
          setUser(response.data.user);
        }
      } catch (err) {
        // If 401 or network issue, user is unauthenticated
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login method
  const login = async (email, password, rememberMe = false) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      const loggedInUser = response.data.user;
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        'Failed to log in. Please check your credentials.';
      setError(errorMessage);
      throw err;
    }
  };

  // Register method
  const register = async (name, email, password, confirmPassword) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
      });

      const newUser = response.data.user;
      setUser(newUser);
      return newUser;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        'Failed to create account. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  // Logout method
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setUser,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
