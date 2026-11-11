import React, { createContext, useContext, useEffect, useState } from 'react';
import { MediaItem, WatchProgress } from '../types';

interface WatchlistContextType {
  watchlist: MediaItem[];
  watchProgress: Record<string, WatchProgress>;
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (item: MediaItem) => void;
  removeFromWatchlist: (id: string) => void;
  saveProgress: (mediaId: string, title: string, timestamp: number, duration: number, posterUrl?: string) => void;
  getProgress: (mediaId: string) => WatchProgress | undefined;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  watchProgress: {},
  isInWatchlist: () => false,
  toggleWatchlist: () => {},
  removeFromWatchlist: () => {},
  saveProgress: () => {},
  getProgress: () => undefined,
});

const WATCHLIST_STORAGE_KEY = 'streamx_watchlist';
const PROGRESS_STORAGE_KEY = 'streamx_watch_progress';

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Failed to save watchlist to localStorage', e);
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(watchProgress));
    } catch (e) {
      console.warn('Failed to save watch progress to localStorage', e);
    }
  }, [watchProgress]);

  const isInWatchlist = (id: string): boolean => {
    return watchlist.some((item) => item.id === id);
  };

  const toggleWatchlist = (item: MediaItem) => {
    setWatchlist((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [item, ...prev];
      }
    });
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((i) => i.id !== id));
  };

  const saveProgress = (
    mediaId: string,
    title: string,
    timestamp: number,
    duration: number,
    posterUrl?: string
  ) => {
    if (timestamp < 5) return; // Don't save first 5 seconds
    setWatchProgress((prev) => ({
      ...prev,
      [mediaId]: {
        mediaId,
        title,
        timestamp,
        duration,
        posterUrl,
        lastWatchedAt: Date.now(),
      },
    }));
  };

  const getProgress = (mediaId: string): WatchProgress | undefined => {
    return watchProgress[mediaId];
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        watchProgress,
        isInWatchlist,
        toggleWatchlist,
        removeFromWatchlist,
        saveProgress,
        getProgress,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => useContext(WatchlistContext);
