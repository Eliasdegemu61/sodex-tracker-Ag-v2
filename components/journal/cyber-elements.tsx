'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function CyberCard({ 
    children, 
    className, 
    variant = 'default',
    onClick
}: { 
    children: React.ReactNode; 
    className?: string;
    variant?: 'default' | 'accent' | 'slim';
    onClick?: () => void;
}) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "relative transition-all duration-300",
                onClick && "cursor-pointer",
                variant === 'default' && "p-6 rounded-2xl bg-black/40 border border-white/5",
                variant === 'accent' && "p-6 rounded-2xl bg-black/60 border border-white/10",
                variant === 'slim' && "p-4 rounded-xl bg-black/40 border border-white/5",
                className
            )}>
            <div className="relative z-10">{children}</div>
        </div>
    );
}

export function GlowLine({ 
    vertical = false, 
    className,
}: { 
    vertical?: boolean; 
    className?: string;
}) {
    return (
        <div className={cn(
            "bg-white/5 transition-all duration-1000",
            vertical ? "w-px h-full" : "h-px w-full",
            className
        )} />
    );
}

export function CyberButton({
    children,
    onClick,
    disabled,
    className,
    variant = 'primary'
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "relative py-2.5 px-6 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none",
                variant === 'primary' && "bg-white text-black hover:bg-white/90",
                variant === 'secondary' && "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10",
                variant === 'ghost' && "bg-transparent text-white/40 hover:text-white/80",
                className
            )}
        >
            <div className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </div>
        </button>
    );
}

export function VerticalBadge({ text }: { text: string }) {
    return (
        <div className="py-4 px-2 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest select-none">
                {text}
            </span>
        </div>
    );
}
