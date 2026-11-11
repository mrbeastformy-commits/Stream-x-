import React, { useEffect, useState, useMemo } from 'react';
import {
  Home,
  Tv,
  Compass,
  Bookmark,
  User as UserIcon,
  Search,
  Play,
  Plus,
  Check,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  Film,
  Smile,
  Globe,
  Radio,
  Bell,
  X,
  Volume2,
  Lock,
  Upload,
  Crown,
  LogOut,
  Flag,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { StreamxLogo } from '../common/StreamxLogo';
import { VideoPlayer } from '../common/VideoPlayer';
import { AuthModal } from '../auth/AuthModal';
import { UserUploadModal } from './UserUploadModal';
import { MyUploadsDrawer } from './MyUploadsDrawer';
import { PremiumModal } from './PremiumModal';
import { ReportVideoModal } from './ReportVideoModal';
import { MediaItem, LiveChannel, Episode, PlatformNotification, UserVideo } from '../../types';
import {
  subscribePublishedMedia,
  subscribeLiveChannels,
  subscribeEpisodes,
  subscribeNotifications,
  subscribeApprovedUserVideos
} from '../../services/mediaService';
import { useWatchlist } from '../../context/WatchlistContext';
import { useAuth } from '../../context/AuthContext';

interface StreamxPlayerAppProps {
  onOpenAdmin: () => void;
}

export const MOVIE_CATEGORIES = [
  'All',
  'Pakistani',
  'Indian',
  'Hollywood',
  'South Indian',
  'Turkish',
  'Korean',
  'Chinese',
  'International'
];

export const CARTOON_CATEGORIES = [
  'All Cartoons',
  'Doraemon',
  'Shinchan',
  'Pokémon',
  'Tom and Jerry',
  'Oggy',
  'Motu Patlu',
  'Ninja Hattori',
  'Chhota Bheem',
  'Ben 10',
  'International Cartoons'
];

export const LIVE_TV_CATEGORIES = [
  'All Channels',
  'Pakistani Channels',
  'Indian Channels',
  'International Channels',
  'News',
  'Entertainment',
  'Sports',
  'Kids'
];

export const StreamxPlayerApp: React.FC<StreamxPlayerAppProps> = ({ onOpenAdmin }) => {
  const { watchlist, isInWatchlist, toggleWatchlist, watchProgress } = useWatchlist();
  const { isOwner, user, userProfile, isPremium, logout } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'livetv' | 'discover' | 'mylist' | 'profile'>('home');

  // Data from Firebase Firestore
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [approvedUserVideos, setApprovedUserVideos] = useState<UserVideo[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Active playing media / live stream
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);
  const [activeUserVideo, setActiveUserVideo] = useState<UserVideo | null>(null);

  // Episodes for series/cartoons
  const [activeEpisodes, setActiveEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMyUploads, setShowMyUploads] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [reportingVideo, setReportingVideo] = useState<{ id: string; title: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovieCat, setSelectedMovieCat] = useState('All');
  const [selectedCartoonCat, setSelectedCartoonCat] = useState('All Cartoons');
  const [selectedLiveCat, setSelectedLiveCat] = useState('All Channels');

  // Announcement modal / banner
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Subscribe to real-time published data from Firebase
  useEffect(() => {
    setIsLoadingMedia(true);

    const unsubMedia = subscribePublishedMedia((items) => {
      setMediaItems(items);
      setIsLoadingMedia(false);
    });

    const unsubChannels = subscribeLiveChannels(true, (channels) => {
      setLiveChannels(channels);
    });

    const unsubNotifs = subscribeNotifications(true, (notifs) => {
      setNotifications(notifs);
    });

    const unsubUserVids = subscribeApprovedUserVideos((vids) => {
      setApprovedUserVideos(vids);
    });

    return () => {
      unsubMedia();
      unsubChannels();
      unsubNotifs();
      unsubUserVids();
    };
  }, []);

  // Fetch episodes when an episodic media is selected
  useEffect(() => {
    if (activeMedia && (activeMedia.type === 'drama' || activeMedia.type === 'cartoon')) {
      const unsub = subscribeEpisodes(activeMedia.id, (eps) => {
        setActiveEpisodes(eps.filter(e => e.isPublished));
      });
      return () => unsub();
    } else {
      setActiveEpisodes([]);
      setSelectedEpisode(null);
    }
  }, [activeMedia]);

  // Featured Hero banner item
  const featuredItem = useMemo(() => {
    const featured = mediaItems.find((m) => m.isFeatured);
    return featured || mediaItems[0] || null;
  }, [mediaItems]);

  // Filtered lists
  const moviesAndDramas = useMemo(() => {
    return mediaItems.filter((m) => m.type === 'movie' || m.type === 'drama');
  }, [mediaItems]);

  const cartoons = useMemo(() => {
    return mediaItems.filter((m) => m.type === 'cartoon');
  }, [mediaItems]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const mediaMatches = mediaItems.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.genre && m.genre.toLowerCase().includes(q)) ||
        (m.language && m.language.toLowerCase().includes(q))
    );
    return mediaMatches;
  }, [mediaItems, searchQuery]);

  // Movies filtered by category
  const filteredMovies = useMemo(() => {
    if (selectedMovieCat === 'All') return moviesAndDramas;
    return moviesAndDramas.filter((m) => m.category === selectedMovieCat);
  }, [moviesAndDramas, selectedMovieCat]);

  // Cartoons filtered by category
  const filteredCartoons = useMemo(() => {
    if (selectedCartoonCat === 'All Cartoons') return cartoons;
    return cartoons.filter((m) => m.category === selectedCartoonCat);
  }, [cartoons, selectedCartoonCat]);

  // Channels filtered by category
  const filteredChannels = useMemo(() => {
    if (selectedLiveCat === 'All Channels') return liveChannels;
    return liveChannels.filter((c) => c.category === selectedLiveCat);
  }, [liveChannels, selectedLiveCat]);

  // Recent watched items with progress
  const continueWatchingItems = useMemo(() => {
    const progressKeys = Object.keys(watchProgress);
    if (!progressKeys.length) return [];
    return mediaItems.filter((m) => watchProgress[m.id] && watchProgress[m.id].timestamp > 10);
  }, [mediaItems, watchProgress]);

  // Active unread notifications
  const activeAnnouncements = useMemo(() => {
    return notifications.filter((n) => !dismissedNotifications.includes(n.id));
  }, [notifications, dismissedNotifications]);

  const handlePlayMedia = (item: MediaItem) => {
    setActiveMedia(item);
    setActiveChannel(null);
    setActiveUserVideo(null);
    setSelectedEpisode(null);
  };

  const handlePlayChannel = (channel: LiveChannel) => {
    setActiveChannel(channel);
    setActiveMedia(null);
    setActiveUserVideo(null);
  };

  const handlePlayUserVideo = (video: UserVideo) => {
    setActiveUserVideo(video);
    setActiveMedia(null);
    setActiveChannel(null);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#080A12] text-slate-100 flex flex-col antialiased selection:bg-[#713CFF] selection:text-white pb-20 md:pb-0">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-40 bg-[#080A12]/95 backdrop-blur-md border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Logo */}
          <div className="cursor-pointer" onClick={() => setActiveTab('home')}>
            <StreamxLogo size="md" showTagline={false} />
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {[
              { id: 'home', label: 'HOME', icon: Home },
              { id: 'livetv', label: 'LIVE TV', icon: Tv, badge: liveChannels.length > 0 ? `${liveChannels.length}` : null },
              { id: 'discover', label: 'DISCOVER', icon: Compass },
              { id: 'mylist', label: 'MY LIST', icon: Bookmark, badge: watchlist.length > 0 ? `${watchlist.length}` : null },
              { id: 'profile', label: 'PROFILE', icon: UserIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white shadow-md shadow-[#713CFF]/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: Upload Button, VIP Upgrade, Search, Notifications, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Upload Video Button for Players */}
            <button
              onClick={() => {
                if (!user) {
                  handleOpenAuth('register');
                } else {
                  setShowUploadModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition shadow-sm"
              title="Upload Video to STREAMX"
            >
              <Upload className="w-3.5 h-3.5 text-[#713CFF]" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* VIP Premium Upgrade Button / Badge */}
            <button
              onClick={() => setShowPremiumModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase transition shadow-md ${
                isPremium
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">{isPremium ? 'VIP Active' : 'Get VIP'}</span>
            </button>

            {/* Quick search button */}
            <button
              onClick={() => setActiveTab('discover')}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Search STREAMX"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications Alert */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {activeAnnouncements.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#713CFF] ring-2 ring-[#080A12] animate-pulse" />
                )}
              </button>

              {/* Notification Popover */}
              {showNotificationDrawer && (
                <div className="absolute right-0 mt-2 w-80 bg-[#171C2B] border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#713CFF]" /> Announcements
                    </h4>
                    <button
                      onClick={() => setShowNotificationDrawer(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No platform announcements right now.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white">{n.title}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{n.type}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auth / Profile Area */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#713CFF] to-[#247BFF] flex items-center justify-center text-white text-xs font-bold">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-white max-w-[80px] sm:max-w-[120px] truncate hidden md:inline">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenAuth('register')}
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-md hover:opacity-95 transition"
                >
                  Register
                </button>
              </div>
            )}

            {/* Owner Admin Switch */}
            {isOwner && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition shadow-sm"
                title="Switch to STREAMX Owner Admin"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Owner Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ================= PLATFORM ANNOUNCEMENT BANNER ================= */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-gradient-to-r from-[#713CFF]/20 via-[#247BFF]/20 to-[#713CFF]/20 border-b border-white/10 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#713CFF] text-[10px] font-bold text-white uppercase tracking-wider">
                STREAMX News
              </span>
              <span className="font-medium truncate max-w-xl">
                {activeAnnouncements[0].title}: {activeAnnouncements[0].message}
              </span>
            </div>
            <button
              onClick={() => setDismissedNotifications(prev => [...prev, activeAnnouncements[0].id])}
              className="text-slate-400 hover:text-white text-xs ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT VIEWS ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ==================== 1. HOME TAB ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            {/* Hero Banner */}
            {featuredItem ? (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-t from-[#080A12] via-transparent to-transparent border border-white/10 shadow-2xl min-h-[380px] md:min-h-[460px] flex items-end p-6 md:p-12 group">
                {/* Background Backdrop or Poster */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={featuredItem.backdropUrl || featuredItem.posterUrl || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=80'}
                    alt={featuredItem.title}
                    className="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-700 filter brightness-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080A12] via-[#080A12]/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#080A12] via-[#080A12]/40 to-transparent" />
                </div>

                {/* Hero Information */}
                <div className="relative z-10 max-w-2xl space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-[10px] font-black tracking-widest uppercase shadow-md shadow-[#713CFF]/40">
                      FEATURED PREMIERE
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-semibold backdrop-blur-sm">
                      {featuredItem.category}
                    </span>
                    {featuredItem.year && (
                      <span className="text-xs text-slate-400 font-mono">
                        {featuredItem.year}
                      </span>
                    )}
                    {featuredItem.language && (
                      <span className="text-xs text-slate-400">
                        • {featuredItem.language}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      FREE STREAM
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {featuredItem.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed drop-shadow">
                    {featuredItem.description || 'Watch high-quality streaming on STREAMX. Free, unlimited entertainment.'}
                  </p>

                  {/* Actions: Watch Now & Add to My List */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handlePlayMedia(featuredItem)}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#713CFF] via-[#8545ff] to-[#247BFF] text-white text-sm font-bold shadow-xl shadow-[#713CFF]/30 hover:opacity-95 active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Watch Now</span>
                    </button>

                    <button
                      onClick={() => toggleWatchlist(featuredItem)}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold backdrop-blur-sm border border-white/10 transition active:scale-95"
                    >
                      {isInWatchlist(featuredItem.id) ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>In My List</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>My List</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Community & Creator Uploads Rail (Approved Player Videos) */}
            {approvedUserVideos.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#713CFF]" />
                    <h2 className="text-lg font-bold text-white tracking-wide">Community & Creator Videos</h2>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      APPROVED RELEASES
                    </span>
                  </div>
                  {user && (
                    <button
                      onClick={() => setShowMyUploads(true)}
                      className="text-xs font-semibold text-[#713CFF] hover:underline"
                    >
                      My Uploads
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {approvedUserVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => handlePlayUserVideo(vid)}
                      className="group bg-[#171C2B] rounded-2xl overflow-hidden border border-white/5 hover:border-[#713CFF]/50 transition cursor-pointer flex flex-col shadow-lg"
                    >
                      <div className="aspect-video relative overflow-hidden bg-black">
                        <img
                          src={vid.thumbnailUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80'}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <div className="w-9 h-9 rounded-full bg-[#713CFF] flex items-center justify-center text-white">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-white truncate">{vid.title}</h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>{vid.userName || 'Community'}</span>
                          <span>{vid.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Continue Watching Rail */}
            {continueWatchingItems.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#713CFF]" />
                  <h2 className="text-lg font-bold text-white tracking-wide">Continue Watching</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {continueWatchingItems.map((item) => {
                    const prog = watchProgress[item.id];
                    const percent = prog ? Math.min(100, Math.round((prog.timestamp / (prog.duration || 1)) * 100)) : 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handlePlayMedia(item)}
                        className="group relative bg-[#171C2B] rounded-2xl overflow-hidden border border-white/5 hover:border-[#713CFF]/50 transition cursor-pointer shadow-lg hover:shadow-xl hover:shadow-[#713CFF]/10 flex flex-col"
                      >
                        <div className="aspect-video relative overflow-hidden bg-black/40">
                          <img
                            src={item.backdropUrl || item.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#713CFF] to-[#247BFF] flex items-center justify-center text-white shadow-lg">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                            <div className="h-full bg-gradient-to-r from-[#713CFF] to-[#247BFF]" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400">{percent}% watched</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Live TV Channels Quick Strip */}
            {liveChannels.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                    <h2 className="text-lg font-bold text-white tracking-wide">Live Broadcasts</h2>
                    <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      ON AIR NOW
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('livetv')}
                    className="text-xs font-semibold text-[#713CFF] hover:text-[#247BFF] flex items-center gap-1 transition"
                  >
                    View All Channels <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {liveChannels.slice(0, 6).map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => handlePlayChannel(ch)}
                      className="group p-3 rounded-2xl bg-[#171C2B] border border-white/5 hover:border-[#713CFF]/50 transition cursor-pointer flex flex-col items-center text-center shadow-md hover:shadow-[#713CFF]/20"
                    >
                      <div className="w-14 h-14 rounded-xl bg-black/40 p-2 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        {ch.logoUrl ? (
                          <img src={ch.logoUrl} alt={ch.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Tv className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white truncate w-full">{ch.name}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[10px] text-rose-400 font-semibold">{ch.status || 'LIVE'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Movies & Dramas Section */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#247BFF]" />
                  <h2 className="text-lg font-bold text-white tracking-wide">Movies & Dramas</h2>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {MOVIE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedMovieCat(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        selectedMovieCat === cat
                          ? 'bg-[#713CFF] text-white shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredMovies.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#171C2B]/50 border border-white/5 text-center space-y-2">
                  <Film className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                  <h3 className="text-sm font-bold text-slate-300">No Content Available Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {selectedMovieCat === 'All'
                      ? 'No movies or dramas have been published to STREAMX yet.'
                      : `No titles found under the "${selectedMovieCat}" category.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredMovies.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => handlePlayMedia(movie)}
                      className="group relative rounded-2xl bg-[#171C2B] overflow-hidden border border-white/5 hover:border-[#713CFF]/60 transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:shadow-2xl hover:shadow-[#713CFF]/20 hover:-translate-y-1"
                    >
                      <div className="aspect-[2/3] relative overflow-hidden bg-black/60">
                        <img
                          src={movie.posterUrl || movie.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#713CFF] px-3 py-1 rounded-full shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-current" /> Watch
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-slate-200 uppercase backdrop-blur-md">
                            {movie.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#247BFF] transition">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {movie.year && <span>{movie.year}</span>}
                            {movie.language && <span>• {movie.language}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Cartoons Section */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-400" />
                  <h2 className="text-lg font-bold text-white tracking-wide">Cartoons & Kids</h2>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {CARTOON_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCartoonCat(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        selectedCartoonCat === cat
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCartoons.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#171C2B]/50 border border-white/5 text-center space-y-2">
                  <Smile className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                  <h3 className="text-sm font-bold text-slate-300">No Content Available Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {selectedCartoonCat === 'All Cartoons'
                      ? 'No cartoon series have been published yet.'
                      : `No cartoon episodes found for "${selectedCartoonCat}".`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredCartoons.map((cartoon) => (
                    <div
                      key={cartoon.id}
                      onClick={() => handlePlayMedia(cartoon)}
                      className="group relative rounded-2xl bg-[#171C2B] overflow-hidden border border-white/5 hover:border-amber-400/50 transition-all duration-300 cursor-pointer flex flex-col shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
                    >
                      <div className="aspect-[2/3] relative overflow-hidden bg-black/60">
                        <img
                          src={cartoon.posterUrl || cartoon.backdropUrl || 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80'}
                          alt={cartoon.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 px-3 py-1 rounded-full shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-current" /> Watch
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/80 text-black uppercase backdrop-blur-md">
                            {cartoon.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition">
                            {cartoon.title}
                          </h4>
                          <span className="text-[10px] text-slate-400">{cartoon.language || 'English'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ==================== 2. LIVE TV TAB ==================== */}
        {activeTab === 'livetv' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h1 className="text-2xl font-black text-white tracking-tight">LIVE TV BROADCASTS</h1>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  High-definition authorized live television channels from Pakistan, India, and Worldwide.
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {LIVE_TV_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedLiveCat(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      selectedLiveCat === cat
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="p-16 rounded-3xl bg-[#171C2B]/50 border border-white/5 text-center space-y-3">
                <Tv className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                <h3 className="text-base font-bold text-slate-300">No Content Available Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {selectedLiveCat === 'All Channels'
                    ? 'No live TV channels have been added yet. When live channels are broadcast, they will appear here.'
                    : `No channels currently available under "${selectedLiveCat}".`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handlePlayChannel(channel)}
                    className="group bg-[#171C2B] rounded-2xl p-4 border border-white/5 hover:border-rose-500/50 transition-all duration-300 cursor-pointer flex flex-col items-center text-center shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-black/60 p-3 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-white/5">
                      {channel.logoUrl ? (
                        <img src={channel.logoUrl} alt={channel.name} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Tv className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white truncate w-full group-hover:text-rose-400 transition">
                      {channel.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <span>{channel.category}</span>
                      {channel.country && <span>• {channel.country}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>{channel.status || 'LIVE'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. DISCOVER / SEARCH TAB ==================== */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            <div className="relative max-w-2xl mx-auto">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search movies, dramas, cartoons, genres, actors, languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#171C2B] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#713CFF] focus:ring-2 focus:ring-[#713CFF]/30 transition shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-300">
                    Search Results ({searchResults.length})
                  </h3>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-[#171C2B]/50 border border-white/5 text-center space-y-2">
                    <Search className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                    <h4 className="text-sm font-bold text-slate-300">No matching titles found</h4>
                    <p className="text-xs text-slate-500">
                      Try searching by category (e.g. Pakistani, Doraemon, Hollywood) or title keyword.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handlePlayMedia(item)}
                        className="group bg-[#171C2B] rounded-2xl overflow-hidden border border-white/5 hover:border-[#713CFF] transition cursor-pointer flex flex-col shadow-lg"
                      >
                        <div className="aspect-[2/3] relative overflow-hidden bg-black">
                          <img
                            src={item.posterUrl || item.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400 capitalize">{item.type} • {item.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-3">Explore by Category</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[
                      { name: 'Pakistani Cinema', type: 'Pakistani', count: mediaItems.filter(m => m.category === 'Pakistani').length, color: 'from-emerald-600 to-teal-800' },
                      { name: 'Bollywood & Hindi', type: 'Indian', count: mediaItems.filter(m => m.category === 'Indian').length, color: 'from-orange-600 to-amber-700' },
                      { name: 'Hollywood Blockbusters', type: 'Hollywood', count: mediaItems.filter(m => m.category === 'Hollywood').length, color: 'from-blue-600 to-indigo-800' },
                      { name: 'South Indian Hits', type: 'South Indian', count: mediaItems.filter(m => m.category === 'South Indian').length, color: 'from-rose-600 to-pink-800' },
                      { name: 'Turkish Dramas', type: 'Turkish', count: mediaItems.filter(m => m.category === 'Turkish').length, color: 'from-red-600 to-red-900' },
                      { name: 'Korean K-Drama', type: 'Korean', count: mediaItems.filter(m => m.category === 'Korean').length, color: 'from-purple-600 to-violet-900' },
                      { name: 'Kids & Cartoons', type: 'cartoons', count: cartoons.length, color: 'from-amber-500 to-orange-600' },
                      { name: 'Live Television', type: 'live', count: liveChannels.length, color: 'from-rose-500 to-red-600' },
                    ].map((cat) => (
                      <div
                        key={cat.name}
                        onClick={() => {
                          if (cat.type === 'live') {
                            setActiveTab('livetv');
                          } else if (cat.type === 'cartoons') {
                            setActiveTab('home');
                            setSelectedCartoonCat('All Cartoons');
                          } else {
                            setActiveTab('home');
                            setSelectedMovieCat(cat.type);
                          }
                        }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${cat.color} p-5 cursor-pointer shadow-lg hover:scale-[1.02] transition-transform`}
                      >
                        <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                        <span className="text-[11px] text-white/80 font-medium">{cat.count} Available</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. MY LIST TAB ==================== */}
        {activeTab === 'mylist' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#713CFF]" />
                <h1 className="text-2xl font-black text-white">MY WATCHLIST</h1>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {watchlist.length} Saved Titles
              </span>
            </div>

            {watchlist.length === 0 ? (
              <div className="p-16 rounded-3xl bg-[#171C2B]/50 border border-white/5 text-center space-y-3">
                <Bookmark className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                <h3 className="text-base font-bold text-slate-300">Your Watchlist is Empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the "+ My List" button on any movie, drama or cartoon to save it here for quick access anytime.
                </p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-lg shadow-[#713CFF]/30 mt-2"
                >
                  Browse STREAMX
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-[#171C2B] rounded-2xl overflow-hidden border border-white/5 hover:border-[#713CFF] transition flex flex-col shadow-lg"
                  >
                    <div
                      onClick={() => handlePlayMedia(item)}
                      className="aspect-[2/3] relative overflow-hidden bg-black cursor-pointer"
                    >
                      <img
                        src={item.posterUrl || item.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <div className="w-10 h-10 rounded-full bg-[#713CFF] flex items-center justify-center text-white">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                      <button
                        onClick={() => toggleWatchlist(item)}
                        className="text-slate-400 hover:text-rose-400 text-xs p-1"
                        title="Remove from watchlist"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. PROFILE TAB ==================== */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-[#171C2B] rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6 shadow-xl">
              {/* Profile Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#713CFF] to-[#247BFF] flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {user?.displayName ? user.displayName[0].toUpperCase() : <UserIcon className="w-8 h-8" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        {user ? user.displayName || 'STREAMX Member' : 'Guest Viewer'}
                      </h2>
                      {isPremium && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Crown className="w-3 h-3 fill-current" /> VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {user ? user.email : 'Free standard access'}
                    </p>
                  </div>
                </div>

                {!user ? (
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-md"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    onClick={() => logout()}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* VIP Membership Status Card */}
              <div className={`p-5 rounded-2xl border transition-all ${
                isPremium
                  ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-500/30'
                  : 'bg-gradient-to-r from-[#713CFF]/15 via-[#247BFF]/10 to-transparent border-[#713CFF]/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className={`w-5 h-5 ${isPremium ? 'text-amber-400 fill-current' : 'text-[#713CFF]'}`} />
                    <span className="text-sm font-bold text-white">
                      {isPremium ? 'STREAMX VIP Membership Active' : 'Upgrade to STREAMX VIP'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {isPremium ? 'Active' : 'Optional'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isPremium
                    ? `Active VIP subscription${userProfile?.premiumPlanName ? ` (${userProfile.premiumPlanName})` : ''}. Enjoy ad-free streaming, 4K quality, and creator upload benefits.`
                    : 'Get ad-free viewing, extended creator video storage, and an exclusive VIP profile badge.'}
                </p>
                {isPremium && userProfile?.premiumExpiresAt && (
                  <div className="text-[11px] text-amber-300 font-mono pt-1">
                    Valid until: {new Date(userProfile.premiumExpiresAt).toLocaleDateString()}
                  </div>
                )}
                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black shadow-md hover:opacity-95"
                  >
                    {isPremium ? 'Manage VIP Plan & History' : 'Explore VIP Plans'}
                  </button>
                  <span className="text-[11px] text-slate-400">Cancel anytime</span>
                </div>
              </div>

              {/* Creator Uploads Section */}
              {user && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#713CFF]" /> Creator Video Hub
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload your own movies, skits, and videos for admin review.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMyUploads(true)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                    >
                      My Uploads
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#713CFF] hover:bg-[#8545ff] text-white text-xs font-bold"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Platform Info */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">About STREAMX</h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Platform</span>
                    <span className="font-semibold text-white">STREAMX OTT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Tagline</span>
                    <span className="font-semibold text-white">Entertainment Without Limits</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Standard Access</span>
                    <span className="font-semibold text-emerald-400">100% Free Streaming</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Streaming Formats</span>
                    <span className="font-semibold text-white">MP4, WebM, HLS, Official YouTube</span>
                  </div>
                </div>
              </div>

              {/* Owner Access Portal */}
              <div className="border-t border-white/5 pt-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#713CFF]" /> Platform Administration
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Private portal for authorized owner verification
                    </p>
                  </div>
                  <button
                    onClick={onOpenAdmin}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-md hover:opacity-95 transition"
                  >
                    Owner Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= VIDEO MODAL PLAYER OVERLAY ================= */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={selectedEpisode ? selectedEpisode.videoUrl : activeMedia.videoUrl}
              videoSource={selectedEpisode ? selectedEpisode.videoSource : activeMedia.videoSource}
              title={selectedEpisode ? `${activeMedia.title} - ${selectedEpisode.title}` : activeMedia.title}
              posterUrl={activeMedia.backdropUrl || activeMedia.posterUrl}
              mediaId={selectedEpisode ? `${activeMedia.id}_ep_${selectedEpisode.id}` : activeMedia.id}
              onClose={() => {
                setActiveMedia(null);
                setSelectedEpisode(null);
              }}
            />
          </div>

          {/* Episode Switcher (if drama or cartoon series with episodes) */}
          {activeEpisodes.length > 0 && (
            <div className="bg-[#171C2B] border-t border-white/10 p-4 max-h-48 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Episode ({activeEpisodes.length} Episodes)
                </h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {activeEpisodes.map((ep) => {
                    const isSelected = selectedEpisode?.id === ep.id || (!selectedEpisode && ep.episodeNumber === 1);
                    return (
                      <button
                        key={ep.id}
                        onClick={() => setSelectedEpisode(ep)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#713CFF] text-white shadow-lg'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ep {ep.episodeNumber}: {ep.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= LIVE TV CHANNEL PLAYER OVERLAY ================= */}
      {activeChannel && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={activeChannel.streamUrl}
              videoSource={activeChannel.streamUrl.includes('.m3u8') ? 'hls' : 'direct'}
              title={`LIVE: ${activeChannel.name}`}
              posterUrl={activeChannel.logoUrl}
              mediaId={activeChannel.id}
              onClose={() => setActiveChannel(null)}
            />
          </div>
        </div>
      )}

      {/* ================= USER UPLOADED VIDEO PLAYER OVERLAY ================= */}
      {activeUserVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={activeUserVideo.videoUrl}
              videoSource="direct"
              title={`Community: ${activeUserVideo.title}`}
              posterUrl={activeUserVideo.thumbnailUrl}
              mediaId={activeUserVideo.id}
              onClose={() => setActiveUserVideo(null)}
            />
          </div>
          {/* Action bar below user video: Report Video */}
          <div className="bg-[#171C2B] border-t border-white/10 p-3 flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="text-xs text-slate-300">
              Uploaded by <span className="font-semibold text-white">{activeUserVideo.userName || 'Community Member'}</span> • {activeUserVideo.category}
            </div>
            <button
              onClick={() => {
                if (!user) {
                  handleOpenAuth('login');
                } else {
                  setReportingVideo({ id: activeUserVideo.id, title: activeUserVideo.title });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report Video</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS & DRAWERS ================= */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />

      <UserUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => setShowMyUploads(true)}
      />

      <MyUploadsDrawer
        isOpen={showMyUploads}
        onClose={() => setShowMyUploads(false)}
        onOpenUploadModal={() => setShowUploadModal(true)}
        onPlayVideo={(v) => {
          setShowMyUploads(false);
          setActiveUserVideo(v);
        }}
      />

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onOpenAuth={() => handleOpenAuth('login')}
      />

      {reportingVideo && (
        <ReportVideoModal
          isOpen={true}
          onClose={() => setReportingVideo(null)}
          videoId={reportingVideo.id}
          videoTitle={reportingVideo.title}
        />
      )}

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080A12]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around h-16 px-2">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'livetv', label: 'Live TV', icon: Tv },
          { id: 'discover', label: 'Discover', icon: Compass },
          { id: 'mylist', label: 'My List', icon: Bookmark },
          { id: 'profile', label: 'Profile', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
                isActive ? 'text-[#713CFF]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
