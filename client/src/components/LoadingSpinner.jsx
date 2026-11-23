import React from 'react';

const LoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <div className="w-14 h-14 rounded-full border-4 border-indigo-100 animate-pulse"></div>
        {/* Animated spinner */}
        <div className="w-14 h-14 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600 tracking-wide animate-pulse">
        {text}
      </p>
    </div>
  );
};

export default LoadingSpinner;
