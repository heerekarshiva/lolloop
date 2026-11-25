'use client';

import React from 'react';

interface LoadingProps {
  progress?: number;
  message?: string;
}

export default function Loading({ progress = 0, message }: LoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#191B1F]">
      {/* Logo */}
      <div className="mb-10 text-3xl font-black tracking-tight">
        <span className="text-white">LOL</span>
        <span className="text-[#FFB800]">LOOP</span>
      </div>

      {/* Spinner */}
      <div className="relative mb-8 h-16 w-16">
        {/* Outer ring */}
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#FFB800]" />
        {/* Inner ring */}
        <div
          className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-t-white"
          style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}
        />
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#FFB800] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Message */}
      {message && (
        <p className="text-sm text-white/50">{message}</p>
      )}
    </div>
  );
}
