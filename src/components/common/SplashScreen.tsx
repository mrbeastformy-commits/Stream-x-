import React, { useEffect, useState } from 'react';
import { StreamxLogo } from './StreamxLogo';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, durationMs = 2000 }) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const interval = 30;
    const step = 100 / (durationMs / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setIsFadingOut(true);
          setTimeout(onFinish, 400);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#080A12] flex flex-col items-center justify-center p-6 transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/3 w-72 h-72 rounded-full bg-[#713CFF]/20 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 w-72 h-72 rounded-full bg-[#247BFF]/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center space-y-8 max-w-sm w-full text-center">
        {/* Animated Logo */}
        <div className="transform scale-110 sm:scale-125 transition-transform duration-700 animate-in fade-in zoom-in">
          <StreamxLogo size="xl" showTagline={true} className="items-center" />
        </div>

        {/* Animated Loading Bar */}
        <div className="w-48 sm:w-56 space-y-2">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#713CFF] via-[#a855f7] to-[#247BFF] transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-500 font-mono">
            <span>Loading Experience</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
