'use client';

import React, { useState, useEffect } from 'react';
import { Search, Folder, Database, FileJson, User, Globe, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchingAnimation({ message = "Searching Registry..." }: { message?: string }) {
  const [dots, setDots] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Scanning SoDex nodes...",
    "Crawling registry...",
    "Matching address...",
    "Finalizing user data...",
  ];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const statusInterval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % statuses.length);
    }, 2000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full relative overflow-hidden bg-card/5 py-20 px-4 rounded-[2rem] border border-border/10">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Floating Icons Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-flowing-icon opacity-10"
            style={{
              top: `${Math.random() * 100}%`,
              left: `-50px`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          >
            {i % 3 === 0 ? <Folder className="w-6 h-6" /> : i % 3 === 1 ? <FileJson className="w-6 h-6" /> : <Database className="w-6 h-6" />}
          </div>
        ))}
      </div>

      {/* Central Animation */}
      <div className="relative z-10">
        {/* Orbitals */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/20 rounded-full animate-spin-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-accent/20 border-dashed rounded-full animate-reverse-spin" />
        
        {/* Core Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative z-10 w-16 h-16 bg-card dark:bg-zinc-900 border border-border/50 rounded-2xl flex items-center justify-center shadow-2xl">
            <Search className="w-8 h-8 text-primary animate-bounce-subtle" />
          </div>
          
          {/* Scanning Beam */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
        </div>
      </div>

      {/* Messaging */}
      <div className="mt-12 text-center space-y-3 z-10">
        <h3 className="text-xl font-bold tracking-tight text-foreground/90 transition-all duration-500">
          {statuses[statusIndex]}
          <span className="inline-block w-6 text-left">{dots}</span>
        </h3>
        <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest animate-pulse max-w-[280px] mx-auto">
          Searching for wallet match in registry...
        </p>
      </div>

      <style jsx global>{`
        @keyframes flowing-icon {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(${Math.random() * 100 - 50}px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes reverse-spin {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-flowing-icon {
          animation: flowing-icon linear infinite;
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-reverse-spin {
          animation: reverse-spin 12s linear infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
