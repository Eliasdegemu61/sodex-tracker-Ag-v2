'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle, Heart, Repeat2, RefreshCw, AlertCircle, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PulseData {
  lastUpdated: string;
  barometer: {
    overallScore: number;
    label: string;
    trend: string;
    color: string;
    subMetrics: Array<{
      name: string;
      score: number;
      weight: number;
    }>;
  };
  detailedSummary: string;
  topEngagedPosts: Array<{
    username: string;
    content: string;
    engagement: {
      likes: number;
      reposts: number;
      replies: number;
    };
    postLink: string;
  }>;
  summary: string;
  timestamp: string;
}

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GaugeMeter = ({ score, color, label }: { score: number, color: string, label: string }) => {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const angle = (normalizedScore / 100) * 180;
  
  return (
    <div className="relative w-72 h-40 overflow-hidden mx-auto mt-4">
      <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="xMidYMax meet">
        {/* Background gradient from red to green (Fear to Greed style) */}
        <defs>
          <linearGradient id="fearGreed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="#2a2a2a" strokeWidth="10" strokeLinecap="round" />
        <path 
           d="M 10 45 A 35 35 0 0 1 90 45" 
           fill="none" 
           stroke="url(#fearGreed)" 
           strokeWidth="10" 
           strokeDasharray="110" 
           strokeDashoffset={110 - (angle / 180) * 110} 
           strokeLinecap="round" 
           className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Needle pointing (anchor bottom center) */}
      <div 
        className="absolute bottom-[2px] left-1/2 w-1.5 h-20 origin-bottom rounded-t-full transition-transform duration-1000 ease-out"
        style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)`, backgroundColor: 'currentColor' }}
      >
        <div className="absolute -bottom-1 -left-1.5 w-4 h-4 bg-inherit rounded-full border-2 border-background" />
      </div>

      <div className="absolute -bottom-2 left-0 w-full text-center">
        <div className="text-4xl font-black tabular-nums tracking-tighter" style={{ color }}>{score}</div>
      </div>
    </div>
  )
}

export function PulseDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 py-24 animate-in fade-in duration-500">
      <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-border flex items-center justify-center">
        <XLogo className="w-5 h-5 text-muted-foreground/40" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Community Pulse</h1>
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-bold">Coming Soon</p>
      </div>
      <div className="h-px w-16 bg-border" />
      <p className="text-xs text-muted-foreground/40 text-center max-w-xs font-medium leading-relaxed">
        Live sentiment analysis and trending discussions from the SoDex community on X.
      </p>
    </div>
  );
}
