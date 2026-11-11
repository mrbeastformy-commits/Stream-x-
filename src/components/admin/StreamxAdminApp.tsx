import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Film,
  Tv,
  Smile,
  Radio,
  Upload,
  Image,
  Layers,
  Users,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Play,
  X,
  Sliders,
  Check,
  AlertCircle,
  Crown,
  DollarSign,
  CreditCard,
  FileCheck,
  Flag,
  UserCheck,
  Link,
  Copy,
  ZoomIn,
  CheckCheck,
  Clock,
  Smartphone
} from 'lucide-react';
import { StreamxLogo } from '../common/StreamxLogo';
import { VideoPlayer } from '../common/VideoPlayer';
import { useAuth } from '../../context/AuthContext';
import {
  MediaItem,
  LiveChannel,
  Episode,
  PlaybackReport,
  PlatformNotification,
  UserVideo,
  PremiumPlan,
  PaymentTransaction,
  VideoReport
} from '../../types';
import {
  subscribeAllMedia,
  subscribeLiveChannels,
  subscribePlaybackReports,
  subscribeNotifications,
  saveMediaItem,
  deleteMediaItem,
  saveLiveChannel,
  deleteLiveChannel,
  saveEpisode,
  deleteEpisode,
  subscribeEpisodes,
  uploadMediaFile,
  subscribeAllUserVideos,
  moderateUserVideo,
  deleteUserVideo,
  subscribeAllPlans,
  savePremiumPlan,
  deletePremiumPlan,
  subscribeAllPayments,
  updatePaymentStatus,
  approvePayment,
  rejectPayment,
  markPaymentPending,
  OWNER_JAZZCASH_NUMBER,
  OWNER_JAZZCASH_TITLE,
  subscribeVideoReports,
  updateVideoReportStatus
} from '../../services/mediaService';
import { parseYouTubeUrl, extractYouTubeId, isYouTubeUrl } from '../../services/youtube';
import { testVideoStream, TestResult } from '../../services/videoTester';
import {
  MOVIE_CATEGORIES,
  CARTOON_CATEGORIES,
  LIVE_TV_CATEGORIES
} from '../player/StreamxPlayerApp';

interface StreamxAdminAppProps {
  onBackToPlayer: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'movies'
  | 'dramas'
  | 'cartoons'
  | 'livetv'
  | 'gallery'
  | 'banners'
  | 'categories'
  | 'user_uploads'
  | 'premium_plans'
  | 'payments'
  | 'video_reports'
  | 'videotesting'
  | 'reports'
  | 'notifications'
  | 'settings';

export const StreamxAdminApp: React.FC<StreamxAdminAppProps> = ({ onBackToPlayer }) => {
  const { user, isOwner, loading, authError, signInWithGoogle, logout, authorizedEmails } = useAuth();

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  // Real-time Firestore items
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [allChannels, setAllChannels] = useState<LiveChannel[]>([]);
  const [reports, setReports] = useState<PlaybackReport[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlan[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [videoReports, setVideoReports] = useState<VideoReport[]>([]);

  // Testing Suite State
  const [testingItemId, setTestingItemId] = useState<string | null>(null);
  const [batchTesting, setBatchTesting] = useState(false);
  const [testResultModal, setTestResultModal] = useState<{ itemTitle: string; result: TestResult } | null>(null);

  // Preview Modal
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [previewChannel, setPreviewChannel] = useState<LiveChannel | null>(null);
  const [previewUserVideo, setPreviewUserVideo] = useState<UserVideo | null>(null);

  // Edit / Create Modals
  const [editingMedia, setEditingMedia] = useState<Partial<MediaItem> | null>(null);
  const [editingChannel, setEditingChannel] = useState<Partial<LiveChannel> | null>(null);
  const [editingPlan, setEditingPlan] = useState<Partial<PremiumPlan> | null>(null);
  const [rejectingVideoId, setRejectingVideoId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Payment Verification Modals & State
  const [verifyingPayment, setVerifyingPayment] = useState<PaymentTransaction | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectingPayment, setRejectingPayment] = useState<PaymentTransaction | null>(null);
  const [paymentRejectionReason, setPaymentRejectionReason] = useState('');
  const [viewingReceiptImage, setViewingReceiptImage] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [copiedTidId, setCopiedTidId] = useState<string | null>(null);

  // Episodes Manager State (for drama/cartoon series)
  const [managingEpisodesFor, setManagingEpisodesFor] = useState<MediaItem | null>(null);
  const [seriesEpisodes, setSeriesEpisodes] = useState<Episode[]>([]);
  const [newEpisodeForm, setNewEpisodeForm] = useState<Partial<Episode>>({
    seasonNumber: 1,
    episodeNumber: 1,
    title: '',
    videoUrl: '',
    videoSource: 'direct',
    isPublished: true,
  });

  // Unified Video Upload & Ingest State (supports file upload and single Video URL input)
  const [uploadSourceType, setUploadSourceType] = useState<'url' | 'file'>('url');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const [unifiedForm, setUnifiedForm] = useState({
    title: '',
    description: '',
    type: 'movie' as MediaItem['type'],
    category: 'Hollywood',
    videoUrl: '',
    posterUrl: '',
    backdropUrl: '',
    language: 'English',
    country: '',
    year: new Date().getFullYear().toString(),
    isPublished: true,
    isFeatured: false,
  });

  // Subscribe to all items when owner is authenticated
  useEffect(() => {
    if (!isOwner || !user) return;

    const unsubMedia = subscribeAllMedia((items) => setAllMedia(items));
    const unsubChannels = subscribeLiveChannels(false, (channels) => setAllChannels(channels));
    const unsubReports = subscribePlaybackReports((reps) => setReports(reps));
    const unsubNotifs = subscribeNotifications(false, (notifs) => setNotifications(notifs));
    const unsubUserVids = subscribeAllUserVideos((vids) => setUserVideos(vids));
    const unsubPlans = subscribeAllPlans((plans) => setPremiumPlans(plans));
    const unsubPayments = subscribeAllPayments((txs) => setPaymentTransactions(txs));
    const unsubVidReports = subscribeVideoReports((vreps) => setVideoReports(vreps));

    return () => {
      unsubMedia();
      unsubChannels();
      unsubReports();
      unsubNotifs();
      unsubUserVids();
      unsubPlans();
      unsubPayments();
      unsubVidReports();
    };
  }, [isOwner, user]);

  // Load episodes when managing a series
  useEffect(() => {
    if (managingEpisodesFor) {
      const unsub = subscribeEpisodes(managingEpisodesFor.id, (eps) => setSeriesEpisodes(eps));
      return () => unsub();
    }
  }, [managingEpisodesFor]);

  // ================= 1. VIDEO TESTING ENGINE =================
  const handleTestItem = async (media: MediaItem) => {
    setTestingItemId(media.id);
    const result = await testVideoStream(media.videoUrl);

    await saveMediaItem({
      id: media.id,
      testStatus: result.status,
      lastTestedAt: result.testedAt,
      lastTestError: result.message
    });

    setTestingItemId(null);
    setTestResultModal({ itemTitle: media.title, result });
  };

  const handleTestChannel = async (channel: LiveChannel) => {
    setTestingItemId(channel.id);
    const result = await testVideoStream(channel.streamUrl);

    await saveLiveChannel({
      id: channel.id,
      status: result.status === 'working' ? 'LIVE' : 'OFFLINE',
      testStatus: result.status,
      lastTestedAt: result.testedAt,
      lastError: result.message
    });

    setTestingItemId(null);
    setTestResultModal({ itemTitle: channel.name, result });
  };

  const handleBatchTestAll = async () => {
    setBatchTesting(true);
    for (const item of allMedia) {
      const res = await testVideoStream(item.videoUrl, 6000);
      await saveMediaItem({
        id: item.id,
        testStatus: res.status,
        lastTestedAt: res.testedAt,
        lastTestError: res.message
      });
    }
    for (const ch of allChannels) {
      const res = await testVideoStream(ch.streamUrl, 6000);
      await saveLiveChannel({
        id: ch.id,
        status: res.status === 'working' ? 'LIVE' : 'OFFLINE',
        testStatus: res.status,
        lastTestedAt: res.testedAt,
        lastError: res.message
      });
    }
    setBatchTesting(false);
  };

  // ================= 2. UNIFIED VIDEO INGESTION & UPLOAD =================
  const handleVideoUrlChange = (url: string) => {
    const isYt = isYouTubeUrl(url);
    if (isYt) {
      const yt = parseYouTubeUrl(url);
      setUnifiedForm(prev => ({
        ...prev,
        videoUrl: yt.embedUrl,
        posterUrl: prev.posterUrl || yt.hqThumbnailUrl,
        backdropUrl: prev.backdropUrl || yt.hqThumbnailUrl,
        title: prev.title || `Video #${yt.videoId}`
      }));
    } else {
      setUnifiedForm(prev => ({
        ...prev,
        videoUrl: url
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadFile(file);
    setUploadError(null);
    setUploadSuccess(false);

    if (!unifiedForm.title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUnifiedForm(prev => ({ ...prev, title: cleanName }));
    }
  };

  const handleSaveUnifiedContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!unifiedForm.title.trim()) {
      setUploadError('Please provide a title.');
      return;
    }

    try {
      setIsUploading(true);
      let finalVideoUrl = unifiedForm.videoUrl;
      let finalSource: MediaItem['videoSource'] = isYouTubeUrl(unifiedForm.videoUrl) ? 'youtube' : 'direct';

      if (uploadSourceType === 'file') {
        if (!uploadFile) {
          throw new Error('Please select a video file to upload.');
        }
        setUploadProgress(15);
        finalVideoUrl = await uploadMediaFile(uploadFile, 'videos', (pct) => {
          setUploadProgress(pct);
        });
        finalSource = 'upload';
      } else {
        if (!finalVideoUrl.trim()) {
          throw new Error('Please paste a valid Video URL.');
        }
        if (finalVideoUrl.includes('.m3u8')) {
          finalSource = 'hls';
        }
      }

      const ytId = extractYouTubeId(finalVideoUrl);

      await saveMediaItem({
        title: unifiedForm.title.trim(),
        description: unifiedForm.description.trim(),
        type: unifiedForm.type,
        category: unifiedForm.category,
        language: unifiedForm.language,
        country: unifiedForm.country,
        year: unifiedForm.year,
        videoUrl: finalVideoUrl,
        videoSource: finalSource,
        youtubeVideoId: ytId || undefined,
        posterUrl: unifiedForm.posterUrl,
        backdropUrl: unifiedForm.backdropUrl,
        isPublished: unifiedForm.isPublished,
        isFeatured: unifiedForm.isFeatured,
        testStatus: 'untested',
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        setUploadSuccess(false);
        setUnifiedForm({
          title: '',
          description: '',
          type: 'movie',
          category: 'Hollywood',
          videoUrl: '',
          posterUrl: '',
          backdropUrl: '',
          language: 'English',
          country: '',
          year: new Date().getFullYear().toString(),
          isPublished: true,
          isFeatured: false,
        });
        setActiveSection('movies');
      }, 1200);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to publish content.');
      setIsUploading(false);
    }
  };

  // ================= 3. ADD / SAVE MEDIA VIA MODAL =================
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia || !editingMedia.title || !editingMedia.videoUrl) return;

    const isYt = isYouTubeUrl(editingMedia.videoUrl);
    const ytId = extractYouTubeId(editingMedia.videoUrl);
    let finalSource: MediaItem['videoSource'] = isYt ? 'youtube' : editingMedia.videoUrl.includes('.m3u8') ? 'hls' : 'direct';
    let finalUrl = editingMedia.videoUrl;

    if (isYt && ytId) {
      finalUrl = parseYouTubeUrl(editingMedia.videoUrl).embedUrl;
    }

    await saveMediaItem({
      ...editingMedia,
      videoUrl: finalUrl,
      videoSource: finalSource,
      youtubeVideoId: ytId || undefined,
      posterUrl: editingMedia.posterUrl || (isYt && ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
    });
    setEditingMedia(null);
  };

  // ================= 4. ADD / SAVE LIVE CHANNEL =================
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel || !editingChannel.name || !editingChannel.streamUrl) return;

    await saveLiveChannel(editingChannel);
    setEditingChannel(null);
  };

  // ================= 5. SAVE EPISODE =================
  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingEpisodesFor || !newEpisodeForm.title || !newEpisodeForm.videoUrl) return;

    const isYt = isYouTubeUrl(newEpisodeForm.videoUrl);
    const ytId = extractYouTubeId(newEpisodeForm.videoUrl);
    let finalSource: MediaItem['videoSource'] = isYt ? 'youtube' : newEpisodeForm.videoUrl.includes('.m3u8') ? 'hls' : 'direct';
    let finalUrl = newEpisodeForm.videoUrl;

    if (isYt && ytId) {
      finalUrl = parseYouTubeUrl(newEpisodeForm.videoUrl).embedUrl;
    }

    await saveEpisode(managingEpisodesFor.id, {
      ...newEpisodeForm,
      videoUrl: finalUrl,
      videoSource: finalSource,
      youtubeVideoId: ytId || undefined,
    });

    setNewEpisodeForm({
      seasonNumber: newEpisodeForm.seasonNumber || 1,
      episodeNumber: (newEpisodeForm.episodeNumber || 1) + 1,
      title: '',
      videoUrl: '',
      videoSource: 'direct',
      isPublished: true,
    });
  };

  // ================= 6. USER UPLOAD MODERATION =================
  const handleApproveVideo = async (videoId: string) => {
    await moderateUserVideo(videoId, 'approved');
  };

  const handleConfirmRejectVideo = async () => {
    if (!rejectingVideoId) return;
    await moderateUserVideo(rejectingVideoId, 'rejected', rejectionReasonInput || 'Does not meet STREAMX community guidelines.');
    setRejectingVideoId(null);
    setRejectionReasonInput('');
  };

  // ================= 7. PREMIUM PLAN MANAGEMENT =================
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editingPlan.name || editingPlan.price === undefined) return;
    await savePremiumPlan(editingPlan);
    setEditingPlan(null);
  };

  // ================= 8. REFUND PROCESSING =================
  const handleIssueRefund = async (txId: string) => {
    if (!confirm('Issue a verified refund for this payment transaction?')) return;
    await updatePaymentStatus(txId, 'refunded', 'Refund authorized and issued by owner.');
  };

  // ================= 9. PAYMENT VERIFICATION (JAZZCASH & MANUAL) =================
  const handleConfirmApprovePayment = async () => {
    if (!verifyingPayment || !user?.email) return;
    try {
      await approvePayment(verifyingPayment.id, user.email, approvalNotes);
      setVerificationFeedback(`Verified & approved payment for ${verifyingPayment.userEmail || verifyingPayment.userName}. VIP plan activated.`);
      setVerifyingPayment(null);
      setApprovalNotes('');
      setTimeout(() => setVerificationFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleConfirmRejectPayment = async () => {
    if (!rejectingPayment || !user?.email) return;
    try {
      const reason = paymentRejectionReason.trim() || 'Payment not found in official JazzCash statement.';
      await rejectPayment(rejectingPayment.id, user.email, reason);
      setVerificationFeedback(`Transaction TID ${rejectingPayment.transactionReference} has been rejected.`);
      setRejectingPayment(null);
      setPaymentRejectionReason('');
      setTimeout(() => setVerificationFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  const handleMarkPaymentPending = async (txId: string) => {
    if (!user?.email) return;
    await markPaymentPending(txId, user.email);
  };

  const isDuplicateTid = (tid: string, currentTxId: string) => {
    if (!tid) return false;
    return paymentTransactions.some(
      (t) => t.id !== currentTxId && t.transactionReference?.trim().toLowerCase() === tid.trim().toLowerCase()
    );
  };

  const handleCopyTid = (tid: string, id: string) => {
    navigator.clipboard.writeText(tid);
    setCopiedTidId(id);
    setTimeout(() => setCopiedTidId(null), 2000);
  };

  // =========================================================================
  // IF NOT SIGNED IN OR NOT AUTHORIZED OWNER
  // =========================================================================
  if (!user || !isOwner) {
    return (
      <div className="min-h-screen bg-[#080A12] text-white flex flex-col justify-center items-center p-6 relative">
        <div className="absolute top-6 left-6 cursor-pointer" onClick={onBackToPlayer}>
          <button className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition">
            ← Back to STREAMX Player
          </button>
        </div>

        <div className="max-w-md w-full bg-[#171C2B] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <StreamxLogo size="lg" className="items-center" />

          <div className="py-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#713CFF] to-[#247BFF] mx-auto flex items-center justify-center shadow-lg shadow-[#713CFF]/30 mb-3">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">STREAMX Private Admin</h2>
            <p className="text-xs text-slate-400 mt-1">
              Owner-only administration portal. All operations are strictly protected by Firebase backend security rules.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left text-xs text-slate-300 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Owner Verification:
            </span>
            <div className="text-[11px] text-slate-400">
              Only authorized Google account can access this dashboard.
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={() => signInWithGoogle()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white text-slate-900 font-bold text-sm shadow-xl hover:bg-slate-100 active:scale-95 transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Sign in with Google Account'}</span>
            </button>

            {user && (
              <button
                onClick={() => logout()}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Sign Out ({user.email})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN ADMIN INTERFACE
  // =========================================================================

  const publishedMediaCount = allMedia.filter(m => m.isPublished).length;
  const draftMediaCount = allMedia.filter(m => !m.isPublished).length;
  const workingMediaCount = allMedia.filter(m => m.testStatus === 'working').length;
  const errorMediaCount = allMedia.filter(m => m.testStatus === 'error').length;
  const liveChannelsCount = allChannels.filter(c => c.status === 'LIVE').length;
  const openReportsCount = reports.filter(r => r.status === 'open').length;
  const pendingUploadsCount = userVideos.filter(v => v.status === 'pending').length;
  const pendingVideoReportsCount = videoReports.filter(r => r.status === 'pending').length;
  const pendingPaymentsCount = paymentTransactions.filter(t => t.status === 'pending').length;
  const totalCompletedPayments = paymentTransactions.filter(t => t.status === 'completed').length;
  const totalRejectedPayments = paymentTransactions.filter(t => t.status === 'rejected').length;
  const totalRevenue = paymentTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#080A12] text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#080A12]/95 backdrop-blur-md border-b border-white/10 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <StreamxLogo size="sm" showTagline={false} />
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#713CFF]/20 border border-[#713CFF]/40 text-xs font-bold text-[#713CFF] uppercase tracking-wider">
            Owner Dashboard
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{user.displayName || 'Authorized Owner'}</span>
            <span className="text-[10px] text-emerald-400 font-mono">{user.email}</span>
          </div>

          <button
            onClick={onBackToPlayer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Player</span>
          </button>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition"
            title="Sign out of owner dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ================= ADMIN SIDEBAR ================= */}
        <aside className="w-64 bg-[#171C2B] border-r border-white/5 flex flex-col p-3 overflow-y-auto">
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'gallery', label: 'Video Upload & Ingest', icon: Upload },
              { id: 'user_uploads', label: 'User Upload Approval', icon: UserCheck, badge: pendingUploadsCount > 0 ? `${pendingUploadsCount} New` : null },
              { id: 'premium_plans', label: 'Premium Plans Manager', icon: Crown, badge: premiumPlans.length },
              { id: 'payments', label: 'Payment Verification', icon: DollarSign, badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending` : (totalCompletedPayments > 0 ? `${totalCompletedPayments}` : null) },
              { id: 'video_reports', label: 'User Video Reports', icon: Flag, badge: pendingVideoReportsCount > 0 ? `${pendingVideoReportsCount}` : null },
              { id: 'movies', label: 'Movies Manager', icon: Film, badge: allMedia.filter(m => m.type === 'movie').length },
              { id: 'dramas', label: 'Dramas & Episodes', icon: Layers, badge: allMedia.filter(m => m.type === 'drama').length },
              { id: 'cartoons', label: 'Cartoons Manager', icon: Smile, badge: allMedia.filter(m => m.type === 'cartoon').length },
              { id: 'livetv', label: 'Live TV Manager', icon: Radio, badge: allChannels.length },
              { id: 'banners', label: 'Banner & Featured', icon: Image },
              { id: 'categories', label: 'Categories', icon: Sliders },
              { id: 'videotesting', label: 'Video Testing Suite', icon: CheckCircle2, badge: errorMediaCount > 0 ? `${errorMediaCount} ERR` : 'Ready' },
              { id: 'reports', label: 'Playback Error Reports', icon: AlertTriangle, badge: openReportsCount > 0 ? `${openReportsCount}` : null },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.length },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((nav) => {
              const Icon = nav.icon;
              const isActive = activeSection === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveSection(nav.id as AdminSection)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{nav.label}</span>
                  </div>
                  {nav.badge !== undefined && nav.badge !== null && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        String(nav.badge).includes('New') || String(nav.badge).includes('ERR')
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {nav.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ================= MAIN ADMIN CONTENT AREA ================= */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#080A12]">
          {/* ========================================================
              1. DASHBOARD OVERVIEW
          ======================================================== */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">PLATFORM OVERVIEW</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time metrics from STREAMX Firebase Firestore, Payments, and User Uploads.
                  </p>
                </div>
                <button
                  onClick={handleBatchTestAll}
                  disabled={batchTesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${batchTesting ? 'animate-spin' : ''}`} />
                  <span>{batchTesting ? 'Testing Streams...' : 'Run Full Health Check'}</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Media</span>
                  <div className="text-2xl font-black text-white">{allMedia.length}</div>
                  <span className="text-[10px] text-slate-500">{publishedMediaCount} Published • {draftMediaCount} Draft</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pending Uploads</span>
                  <div className="text-2xl font-black text-amber-400">{pendingUploadsCount}</div>
                  <span className="text-[10px] text-slate-500">Awaiting moderation</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Verified Revenue</span>
                  <div className="text-2xl font-black text-emerald-400">${totalRevenue.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-500">{totalCompletedPayments} Paid VIPs</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Live Channels</span>
                  <div className="text-2xl font-black text-rose-400">{allChannels.length}</div>
                  <span className="text-[10px] text-emerald-400">{liveChannelsCount} Broadcasting</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Video Reports</span>
                  <div className="text-2xl font-black text-rose-500">{pendingVideoReportsCount}</div>
                  <span className="text-[10px] text-slate-500">Flagged content</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stream Health</span>
                  <div className="text-2xl font-black text-emerald-400">{workingMediaCount}</div>
                  <span className="text-[10px] text-slate-500">{errorMediaCount} issues detected</span>
                </div>
              </div>

              {/* Moderation Alert Card if Pending Videos */}
              {pendingUploadsCount > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {pendingUploadsCount} User Video{pendingUploadsCount > 1 ? 's' : ''} Awaiting Review
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Check user video uploads for copyright compliance before publishing to the community.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('user_uploads')}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    Review Queue
                  </button>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#713CFF]/10 to-[#247BFF]/10 border border-[#713CFF]/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Upload or Add Content to STREAMX</h3>
                  <p className="text-xs text-slate-400">Add movies, series, cartoons, or live TV feeds:</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveSection('gallery')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold transition shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" /> Video Upload & Ingest
                  </button>
                  <button
                    onClick={() => {
                      setEditingChannel({
                        category: 'Pakistani Channels',
                        country: 'Pakistan',
                        language: 'Urdu',
                        status: 'CHECKING',
                        isPublished: true
                      });
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition"
                  >
                    <Radio className="w-3.5 h-3.5" /> Add Live Channel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              UNIFIED VIDEO UPLOAD & INGEST (SINGLE VIDEO URL INPUT)
          ======================================================== */}
          {activeSection === 'gallery' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Upload className="w-6 h-6 text-[#713CFF]" />
                  VIDEO UPLOAD & INGESTION
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Upload MP4/WebM/MOV files from your device, or paste a single Video URL (supports direct video streams, HLS, or supported video links).
                </p>
              </div>

              <div className="bg-[#171C2B] rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6 shadow-xl">
                {/* Switch between: Paste Video URL or Upload File */}
                <div className="flex rounded-2xl bg-black/40 p-1 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setUploadSourceType('url')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      uploadSourceType === 'url'
                        ? 'bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    <span>Enter Video URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadSourceType('file')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      uploadSourceType === 'file'
                        ? 'bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload File from Device</span>
                  </button>
                </div>

                <form onSubmit={handleSaveUnifiedContent} className="space-y-4">
                  {/* Single Clean Video URL Input */}
                  {uploadSourceType === 'url' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Video URL *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Paste direct stream link (MP4, HLS .m3u8) or supported video link"
                        value={unifiedForm.videoUrl}
                        onChange={(e) => handleVideoUrlChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#713CFF] shadow-inner"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Accepts direct video files (MP4, WebM, MOV), HLS manifests (.m3u8), and supported video links. Videos play inside STREAMX built-in screen.
                      </span>
                    </div>
                  ) : (
                    /* File selector */
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Select Video File (MP4, WebM, MOV) *
                      </label>
                      <label className="border-2 border-dashed border-white/15 hover:border-[#713CFF] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-black/20 group">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#713CFF] mb-2 transition" />
                        <span className="text-xs font-bold text-white">
                          {uploadFile ? uploadFile.name : 'Tap or Click to Select File from Device'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">
                          {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Browse Gallery or File Manager'}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Live Stream / Embed Preview */}
                  {unifiedForm.videoUrl && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        In-App Playback Preview:
                      </span>
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 relative">
                        {isYouTubeUrl(unifiedForm.videoUrl) ? (
                          <iframe
                            src={unifiedForm.videoUrl}
                            title="Preview"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video src={unifiedForm.videoUrl} controls className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata fields */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="Title of movie, drama series, or cartoon show"
                      value={unifiedForm.title}
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Content Type</label>
                      <select
                        value={unifiedForm.type}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                      >
                        <option value="movie">Movie</option>
                        <option value="drama">Drama Series</option>
                        <option value="cartoon">Cartoon</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                      <select
                        value={unifiedForm.category}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                      >
                        {(unifiedForm.type === 'cartoon' ? CARTOON_CATEGORIES.slice(1) : MOVIE_CATEGORIES.slice(1)).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Language</label>
                      <input
                        type="text"
                        value={unifiedForm.language}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, language: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Release Year</label>
                      <input
                        type="text"
                        value={unifiedForm.year}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, year: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Poster Thumbnail URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-filled for video links, or paste image URL"
                      value={unifiedForm.posterUrl}
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, posterUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Overview or synopsis..."
                      value={unifiedForm.description}
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                    />
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unifiedForm.isPublished}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, isPublished: e.target.checked })}
                        className="rounded accent-[#713CFF]"
                      />
                      <span>Publish immediately in Player App</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unifiedForm.isFeatured}
                        onChange={(e) => setUnifiedForm({ ...unifiedForm, isFeatured: e.target.checked })}
                        className="rounded accent-[#713CFF]"
                      />
                      <span>Feature on Hero Banner</span>
                    </label>
                  </div>

                  {/* Progress bar */}
                  {isUploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300 font-medium">
                        <span>Uploading & Processing Media...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#713CFF] to-[#247BFF] transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Content published successfully to STREAMX!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#713CFF] via-[#8545ff] to-[#247BFF] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#713CFF]/30 hover:opacity-95 active:scale-98 transition disabled:opacity-50"
                  >
                    {isUploading ? 'Publishing...' : 'Publish to STREAMX'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================
              USER UPLOAD APPROVAL & MODERATION
          ======================================================== */}
          {activeSection === 'user_uploads' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-amber-400" />
                    USER VIDEO MODERATION QUEUE
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review, watch previews, and approve or reject player-submitted video uploads.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {userVideos.length} Total Submissions
                </span>
              </div>

              {userVideos.length === 0 ? (
                <div className="p-16 rounded-3xl bg-[#171C2B] text-center space-y-2 border border-white/5">
                  <FileCheck className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                  <h3 className="text-base font-bold text-white">No User Uploads Yet</h3>
                  <p className="text-xs text-slate-400">When viewers upload videos from their devices, they will appear here for review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userVideos.map((video) => (
                    <div
                      key={video.id}
                      className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-24 h-16 rounded-xl bg-black overflow-hidden flex-shrink-0 relative group">
                          <img
                            src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=250&q=80'}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setPreviewUserVideo(video)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition"
                          >
                            <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{video.title}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                video.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : video.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {video.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{video.description || 'No description'}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                            <span>User: {video.userName || video.userEmail}</span>
                            <span>•</span>
                            <span>Category: {video.category}</span>
                            <span>•</span>
                            <span>{video.fileSizeMb || 0} MB</span>
                            <span>•</span>
                            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                          </div>
                          {video.rejectionReason && (
                            <span className="text-[10px] text-rose-400 block mt-1">Rejection reason: {video.rejectionReason}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => setPreviewUserVideo(video)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" /> Preview
                        </button>

                        {video.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveVideo(video.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}

                        {video.status !== 'rejected' && (
                          <button
                            onClick={() => {
                              setRejectingVideoId(video.id);
                              setRejectionReasonInput('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}

                        <button
                          onClick={() => deleteUserVideo(video.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Delete from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              PREMIUM PLANS MANAGER
          ======================================================== */}
          {activeSection === 'premium_plans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-400" />
                    PREMIUM PLANS CONFIGURATION
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure real subscription pricing, billing cycles, currency, and VIP benefits.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlan({
                      name: 'Monthly Premium',
                      billingCycle: 'monthly',
                      price: 499,
                      currency: 'PKR',
                      features: 'Ad-free playback, 4K Ultra HD streaming, 500MB creator storage, VIP profile badge',
                      isActive: true
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Plan
                </button>
              </div>

              {/* JazzCash Receiving Configuration Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#171C2B] to-[#171C2B] border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white uppercase">
                      JazzCash Receiver
                    </span>
                    <span className="text-xs font-bold text-white">Owner Manual Payment Account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-mono font-black text-amber-300">{OWNER_JAZZCASH_NUMBER}</span>
                    <span className="text-xs text-slate-400">({OWNER_JAZZCASH_TITLE})</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Customers send exact plan prices to this number and submit their Transaction ID (TID). Money is independently verified by you before approval.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 max-w-xs leading-relaxed">
                  <strong className="text-slate-300 block mb-0.5">Payment Terms Reminder:</strong>
                  Use manual receipt only where permitted by JazzCash account terms. If automated merchant checkouts are required in the future, integrate with official JazzCash Merchant API.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {premiumPlans.map((plan) => (
                  <div key={plan.id} className="bg-[#171C2B] rounded-2xl p-5 border border-white/5 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">{plan.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          plan.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {plan.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="my-3">
                        <span className="text-3xl font-black text-white">{plan.currency} {plan.price}</span>
                        <span className="text-xs text-slate-400">/{plan.billingCycle}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{plan.features}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="text-xs text-[#713CFF] hover:underline font-semibold"
                      >
                        Edit Plan Details
                      </button>
                      <button
                        onClick={() => deletePremiumPlan(plan.id)}
                        className="text-slate-400 hover:text-rose-400 text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              PAYMENT VERIFICATION & JAZZCASH RECONCILIATION
          ======================================================== */}
          {activeSection === 'payments' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    PAYMENT VERIFICATION & JAZZCASH RECONCILIATION
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer-submitted payment references. Money must be verified received in JazzCash account before approving.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiving JazzCash</span>
                    <span className="text-xs font-mono font-bold text-amber-300">{OWNER_JAZZCASH_NUMBER}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Volume</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">${totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {verificationFeedback && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{verificationFeedback}</span>
                </div>
              )}

              {/* Important Verification Rule Notice */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-2 font-bold text-white">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Manual Payment Verification Rule:</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Do not approve payments based solely on a customer screenshot or TID. You must independently check your official <strong>JazzCash App</strong> or <strong>*786#</strong> statement for receiving number <strong>{OWNER_JAZZCASH_NUMBER}</strong> to verify actual funds arrival. Once approved, the customer&apos;s VIP membership is instantly activated and recorded in their Firestore profile.
                </p>
              </div>

              {/* Stat Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-4 rounded-2xl border transition ${
                  pendingPaymentsCount > 0 ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20' : 'bg-[#171C2B] border-white/5'
                }`}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Verification</span>
                  <span className={`text-2xl font-black ${pendingPaymentsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                    {pendingPaymentsCount}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Awaiting statement check</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified & Active VIP</span>
                  <span className="text-2xl font-black text-emerald-400">{totalCompletedPayments}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Confirmed received</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rejected References</span>
                  <span className="text-2xl font-black text-rose-400">{totalRejectedPayments}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Invalid or uncredited</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Configured Account</span>
                  <span className="text-xs font-mono font-black text-amber-300 block truncate">{OWNER_JAZZCASH_NUMBER}</span>
                  <span className="text-[9px] text-slate-400 block truncate mt-0.5">{OWNER_JAZZCASH_TITLE}</span>
                </div>
              </div>

              {/* Filter Tabs and Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 p-1 bg-[#171C2B] rounded-xl border border-white/5 overflow-x-auto">
                  {[
                    { id: 'all', label: 'All Transactions', count: paymentTransactions.length },
                    { id: 'pending', label: 'Pending Review', count: pendingPaymentsCount, highlight: pendingPaymentsCount > 0 },
                    { id: 'completed', label: 'Verified', count: totalCompletedPayments },
                    { id: 'rejected', label: 'Rejected', count: totalRejectedPayments },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPaymentFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                        paymentFilter === tab.id
                          ? tab.highlight
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'bg-[#713CFF] text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        paymentFilter === tab.id ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by TID or Gmail..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#171C2B] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#713CFF] w-full sm:w-60"
                  />
                </div>
              </div>

              {/* Transactions Table */}
              {paymentTransactions.length === 0 ? (
                <div className="p-16 rounded-3xl bg-[#171C2B] text-center space-y-2 border border-white/5">
                  <CreditCard className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                  <h3 className="text-base font-bold text-white">No Transactions Logged Yet</h3>
                  <p className="text-xs text-slate-400">When viewers submit JazzCash references or buy plans, records appear here.</p>
                </div>
              ) : (
                <div className="bg-[#171C2B] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-black/40 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Reference / TID</th>
                          <th className="p-3">Customer Info</th>
                          <th className="p-3">Plan & Price</th>
                          <th className="p-3">Method</th>
                          <th className="p-3">Receipt</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Submission Date</th>
                          <th className="p-3 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {paymentTransactions
                          .filter((t) => {
                            if (paymentFilter !== 'all' && t.status !== paymentFilter) return false;
                            if (paymentSearch.trim()) {
                              const q = paymentSearch.toLowerCase();
                              return (
                                t.transactionReference?.toLowerCase().includes(q) ||
                                t.userEmail?.toLowerCase().includes(q) ||
                                t.userName?.toLowerCase().includes(q) ||
                                t.planName?.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((tx) => {
                            const isPending = tx.status === 'pending';
                            const isCompleted = tx.status === 'completed';
                            const isRejected = tx.status === 'rejected';
                            const duplicate = isDuplicateTid(tx.transactionReference, tx.id);

                            return (
                              <tr key={tx.id} className="hover:bg-white/5 transition">
                                {/* TID & Duplicate Indicator */}
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-white tracking-wide">{tx.transactionReference}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyTid(tx.transactionReference, tx.id)}
                                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                      title="Copy Transaction ID"
                                    >
                                      {copiedTidId === tx.id ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  {duplicate && (
                                    <div className="mt-1">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Duplicate TID
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Customer info */}
                                <td className="p-3">
                                  <div className="font-bold text-white">{tx.userName || 'STREAMX Customer'}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{tx.userEmail}</div>
                                  {tx.senderPhone && (
                                    <div className="text-[10px] text-amber-300">Sender: {tx.senderPhone}</div>
                                  )}
                                </td>

                                {/* Plan & Price */}
                                <td className="p-3">
                                  <div className="font-semibold text-amber-400">{tx.planName}</div>
                                  <div className="font-mono font-bold text-white text-[11px]">
                                    {tx.currency} {tx.amount}
                                  </div>
                                </td>

                                {/* Method */}
                                <td className="p-3">
                                  {tx.paymentMethod === 'jazzcash' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-500/30 inline-flex items-center gap-1">
                                      <Smartphone className="w-3 h-3 text-red-400" /> JazzCash
                                    </span>
                                  ) : (
                                    <span className="uppercase text-[10px] text-slate-400">
                                      {tx.paymentMethod.replace('_', ' ')}
                                    </span>
                                  )}
                                </td>

                                {/* Receipt Screenshot */}
                                <td className="p-3">
                                  {tx.receiptUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceiptImage(tx.receiptUrl!)}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#713CFF] hover:text-white transition text-[11px] font-semibold"
                                    >
                                      <ZoomIn className="w-3 h-3" />
                                      <span>View Screenshot</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 italic">No screenshot</span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="p-3">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      isCompleted
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isPending
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                        : isRejected
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : 'bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {isCompleted ? 'VERIFIED' : isPending ? 'PENDING' : isRejected ? 'REJECTED' : tx.status}
                                  </span>
                                  {tx.verifiedBy && (
                                    <div className="text-[9px] text-slate-400 mt-0.5">By: {tx.verifiedBy}</div>
                                  )}
                                </td>

                                {/* Submission Date */}
                                <td className="p-3 text-[10px] text-slate-400">
                                  {new Date(tx.createdAt).toLocaleString()}
                                </td>

                                {/* Actions */}
                                <td className="p-3 text-right">
                                  {isPending && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setVerifyingPayment(tx)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 flex items-center gap-1 transition"
                                      >
                                        <Check className="w-3 h-3" /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRejectingPayment(tx);
                                          setPaymentRejectionReason('Transaction ID not found in JazzCash statement.');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/30 transition"
                                      >
                                        <X className="w-3 h-3" /> Reject
                                      </button>
                                    </div>
                                  )}

                                  {isCompleted && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleIssueRefund(tx.id)}
                                        className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-semibold"
                                      >
                                        Refund
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMarkPaymentPending(tx.id)}
                                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px]"
                                      >
                                        Mark Pending
                                      </button>
                                    </div>
                                  )}

                                  {isRejected && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkPaymentPending(tx.id)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold"
                                    >
                                      Re-verify
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              VIDEO REPORTS QUEUE
          ======================================================== */}
          {activeSection === 'video_reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    <Flag className="w-6 h-6 text-rose-500" />
                    USER VIDEO REPORTS & COPYRIGHT COMPLAINTS
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Flagged videos submitted by community viewers.
                  </p>
                </div>
              </div>

              {videoReports.length === 0 ? (
                <div className="p-16 rounded-3xl bg-[#171C2B] text-center space-y-2 border border-white/5">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">No Flagged Video Reports</h3>
                  <p className="text-xs text-slate-400">Zero active copyright or inappropriate content complaints.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videoReports.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{r.videoTitle}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase">
                            {r.reason}
                          </span>
                          <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                        </div>
                        {r.details && <p className="text-xs text-slate-300 mt-1">{r.details}</p>}
                        <span className="text-[10px] text-slate-400 mt-1 block">Reporter: {r.reporterEmail}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={r.status}
                          onChange={(e) => updateVideoReportStatus(r.id, e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="investigated">Investigated</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              MOVIES & DRAMAS MANAGERS
          ======================================================== */}
          {(activeSection === 'movies' || activeSection === 'dramas') && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">
                    {activeSection === 'movies' ? 'MOVIES MANAGER' : 'DRAMAS & SERIES MANAGER'}
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage Pakistani, Indian, Hollywood, South Indian, Turkish, Korean, and Chinese titles.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMedia({
                      type: activeSection === 'movies' ? 'movie' : 'drama',
                      category: 'Pakistani',
                      language: 'Urdu',
                      isPublished: true,
                      videoSource: 'direct'
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {activeSection === 'movies' ? 'Movie' : 'Drama'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMedia
                  .filter(m => (activeSection === 'movies' ? m.type === 'movie' : m.type === 'drama'))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#171C2B] rounded-2xl p-4 border border-white/5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-28 rounded-xl overflow-hidden bg-black flex-shrink-0">
                          <img
                            src={item.posterUrl || item.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-[#713CFF] uppercase">{item.category}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                item.testStatus === 'working'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : item.testStatus === 'error'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              {item.testStatus || 'untested'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate mt-0.5">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                            <span>{item.year || '2026'}</span>
                            <span>•</span>
                            <span>{item.language || 'English'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'drama' && (
                            <button
                              onClick={() => setManagingEpisodesFor(item)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition"
                            >
                              Episodes
                            </button>
                          )}
                          <button
                            onClick={() => handleTestItem(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="Test Stream Playback"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewMedia(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="Preview Video"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingMedia(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMediaItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================
              CARTOONS MANAGER
          ======================================================== */}
          {activeSection === 'cartoons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">CARTOONS MANAGER</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage series: Doraemon, Shinchan, Pokémon, Tom and Jerry, Oggy, Motu Patlu, Ninja Hattori, Chhota Bheem, Ben 10, International.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMedia({
                      type: 'cartoon',
                      category: 'Doraemon',
                      language: 'Hindi/Urdu',
                      isPublished: true,
                      videoSource: 'direct'
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Cartoon Show</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allMedia
                  .filter(m => m.type === 'cartoon')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#171C2B] rounded-2xl p-4 border border-white/5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-28 rounded-xl overflow-hidden bg-black flex-shrink-0">
                          <img
                            src={item.posterUrl || 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=300&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-amber-400 uppercase">{item.category}</span>
                          <h4 className="text-sm font-bold text-white truncate mt-0.5">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                          <span className="text-[10px] text-slate-500 block mt-2">{item.language || 'Urdu/Hindi'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <button
                          onClick={() => setManagingEpisodesFor(item)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/30 transition"
                        >
                          Manage Episodes
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTestItem(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingMedia(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMediaItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================================
              LIVE TV MANAGER
          ======================================================== */}
          {activeSection === 'livetv' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">LIVE TV MANAGER</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Broadcast HLS (.m3u8), DASH, and direct stream feeds with live status diagnostics.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingChannel({
                      category: 'Pakistani Channels',
                      country: 'Pakistan',
                      language: 'Urdu',
                      status: 'CHECKING',
                      isPublished: true
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Live Channel</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allChannels.map((channel) => (
                  <div key={channel.id} className="bg-[#171C2B] rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-black p-2 flex items-center justify-center flex-shrink-0">
                        {channel.logoUrl ? (
                          <img src={channel.logoUrl} alt={channel.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Radio className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{channel.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            channel.status === 'LIVE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {channel.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-0.5">{channel.name}</h4>
                        <span className="text-[10px] text-slate-500 block truncate font-mono">{channel.streamUrl}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleTestChannel(channel)}
                        disabled={testingItemId === channel.id}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                      >
                        <RefreshCw className={`w-3 h-3 ${testingItemId === channel.id ? 'animate-spin' : ''}`} />
                        <span>Test Stream</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreviewChannel(channel)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingChannel(channel)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteLiveChannel(channel.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              VIDEO TESTING SUITE
          ======================================================== */}
          {activeSection === 'videotesting' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    REAL STREAM TESTING SUITE
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live playback verification for movies, cartoons, episodes, and live TV channels.
                  </p>
                </div>
                <button
                  onClick={handleBatchTestAll}
                  disabled={batchTesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${batchTesting ? 'animate-spin' : ''}`} />
                  <span>{batchTesting ? 'Testing Streams...' : 'Run Automated Health Test'}</span>
                </button>
              </div>

              <div className="bg-[#171C2B] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-black/30 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Title / Stream</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Diagnostic Message</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allMedia.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5">
                        <td className="p-3 font-semibold text-white max-w-xs truncate">{m.title}</td>
                        <td className="p-3 uppercase text-[10px]">{m.type}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.testStatus === 'working' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {m.testStatus || 'Untested'}
                          </span>
                        </td>
                        <td className="p-3 max-w-sm truncate text-slate-400">{m.lastTestError || 'No error logged'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleTestItem(m)} disabled={testingItemId === m.id} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold">
                            Test Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-white">PLAYBACK ERROR REPORTS</h1>
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white">{r.contentTitle} - {r.errorType}</h4>
                      <p className="text-xs text-slate-400">{r.errorMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'banners' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Featured Hero Banners</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allMedia.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{m.title}</span>
                    <button
                      onClick={() => saveMediaItem({ id: m.id, isFeatured: !m.isFeatured })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${m.isFeatured ? 'bg-[#713CFF] text-white' : 'bg-white/5 text-slate-400'}`}
                    >
                      {m.isFeatured ? 'Featured' : 'Set Featured'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'categories' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Categories Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <h3 className="text-xs font-bold text-[#713CFF] uppercase mb-2">Movie Categories</h3>
                  {MOVIE_CATEGORIES.slice(1).map(c => <div key={c} className="text-xs py-1 text-slate-300">{c}</div>)}
                </div>
                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <h3 className="text-xs font-bold text-amber-400 uppercase mb-2">Cartoon Categories</h3>
                  {CARTOON_CATEGORIES.slice(1).map(c => <div key={c} className="text-xs py-1 text-slate-300">{c}</div>)}
                </div>
                <div className="p-4 rounded-2xl bg-[#171C2B] border border-white/5">
                  <h3 className="text-xs font-bold text-rose-400 uppercase mb-2">Live TV Categories</h3>
                  {LIVE_TV_CATEGORIES.slice(1).map(c => <div key={c} className="text-xs py-1 text-slate-300">{c}</div>)}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-white">ANNOUNCEMENTS</h1>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl bg-[#171C2B] border border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">{n.title}</h4>
                      <p className="text-xs text-slate-300">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-[#171C2B] rounded-2xl p-6 border border-white/5 space-y-4">
                <h2 className="text-lg font-bold text-white">STREAMX Platform Settings</h2>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Current Logged-in User</span>
                    <span className="font-mono text-emerald-400 font-bold">{user.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Video URL Integration</span>
                    <span className="text-emerald-400 font-bold">Unified (Direct + Supported Embeds)</span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full py-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold"
                >
                  Sign Out of Admin Console
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= EDIT MEDIA MODAL ================= */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">
                {editingMedia.id ? 'Edit Content' : 'Add Content'}
              </h3>
              <button onClick={() => setEditingMedia(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveMedia} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editingMedia.title || ''}
                  onChange={(e) => setEditingMedia({ ...editingMedia, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Video URL * (Supports MP4, WebM, MOV, HLS, and supported video links)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste direct stream link or supported video link"
                  value={editingMedia.videoUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    const isYt = isYouTubeUrl(url);
                    const ytId = extractYouTubeId(url);
                    setEditingMedia(prev => ({
                      ...prev,
                      videoUrl: url,
                      videoSource: isYt ? 'youtube' : url.includes('.m3u8') ? 'hls' : 'direct',
                      posterUrl: prev?.posterUrl || (isYt && ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : prev?.posterUrl)
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Content Type</label>
                  <select
                    value={editingMedia.type || 'movie'}
                    onChange={(e) => setEditingMedia({ ...editingMedia, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    <option value="movie">Movie</option>
                    <option value="drama">Drama</option>
                    <option value="cartoon">Cartoon</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Category</label>
                  <select
                    value={editingMedia.category || 'Hollywood'}
                    onChange={(e) => setEditingMedia({ ...editingMedia, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    {(editingMedia.type === 'cartoon' ? CARTOON_CATEGORIES.slice(1) : MOVIE_CATEGORIES.slice(1)).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Poster Image URL</label>
                <input
                  type="text"
                  value={editingMedia.posterUrl || ''}
                  onChange={(e) => setEditingMedia({ ...editingMedia, posterUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingMedia.description || ''}
                  onChange={(e) => setEditingMedia({ ...editingMedia, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMedia.isPublished ?? true}
                    onChange={(e) => setEditingMedia({ ...editingMedia, isPublished: e.target.checked })}
                    className="rounded accent-[#713CFF]"
                  />
                  <span>Publish in Player</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMedia.isFeatured ?? false}
                    onChange={(e) => setEditingMedia({ ...editingMedia, isFeatured: e.target.checked })}
                    className="rounded accent-[#713CFF]"
                  />
                  <span>Feature on Hero</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingMedia(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#713CFF] text-white text-xs font-bold">Save Content</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT CHANNEL MODAL ================= */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">
                {editingChannel.id ? 'Edit Live Channel' : 'Add Live Broadcast Channel'}
              </h3>
              <button onClick={() => setEditingChannel(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveChannel} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Channel Name *</label>
                <input
                  type="text"
                  required
                  value={editingChannel.name || ''}
                  onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Category</label>
                  <select
                    value={editingChannel.category || 'Pakistani Channels'}
                    onChange={(e) => setEditingChannel({ ...editingChannel, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    {LIVE_TV_CATEGORIES.slice(1).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Country</label>
                  <input
                    type="text"
                    value={editingChannel.country || 'Pakistan'}
                    onChange={(e) => setEditingChannel({ ...editingChannel, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Stream URL * (HLS .m3u8)</label>
                <input
                  type="text"
                  required
                  value={editingChannel.streamUrl || ''}
                  onChange={(e) => setEditingChannel({ ...editingChannel, streamUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Channel Logo URL</label>
                <input
                  type="text"
                  value={editingChannel.logoUrl || ''}
                  onChange={(e) => setEditingChannel({ ...editingChannel, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingChannel(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">Save Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT PLAN MODAL ================= */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">{editingPlan.id ? 'Edit Plan' : 'Create VIP Plan'}</h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSavePlan} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Cycle</label>
                  <select
                    value={editingPlan.billingCycle || 'monthly'}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billingCycle: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Currency</label>
                  <select
                    value={editingPlan.currency || 'PKR'}
                    onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  >
                    <option value="PKR">PKR (Rs)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Price</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingPlan.price ?? 499}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Features (comma separated)</label>
                <textarea
                  rows={2}
                  value={editingPlan.features || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PAYMENT APPROVAL MODAL ================= */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-emerald-500/30 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Approve & Activate Premium</h3>
                  <span className="text-[10px] text-slate-400">Manual statement verification confirmation</span>
                </div>
              </div>
              <button onClick={() => setVerifyingPayment(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{verifyingPayment.userName || 'Customer'} ({verifyingPayment.userEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan:</span>
                <span className="font-bold text-amber-400">{verifyingPayment.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{verifyingPayment.currency} {verifyingPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID (TID):</span>
                <span className="font-mono text-amber-300 font-bold">{verifyingPayment.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Receiving Account:</span>
                <span className="font-mono text-white">{OWNER_JAZZCASH_NUMBER}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <strong>Owner Confirmation Required:</strong> By clicking approve, you certify that you have independently checked your JazzCash account statement for <strong>{OWNER_JAZZCASH_NUMBER}</strong> and confirmed actual receipt of <strong>{verifyingPayment.currency} {verifyingPayment.amount}</strong>.
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Verification Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Verified in JazzCash app statement at 9:45 PM"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyingPayment(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovePayment}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1.5 transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Received & Activate VIP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PAYMENT REJECTION MODAL ================= */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-rose-500/30 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reject Payment Reference</h3>
                  <span className="text-[10px] text-slate-400">Premium will NOT be activated</span>
                </div>
              </div>
              <button onClick={() => setRejectingPayment(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{rejectingPayment.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TID:</span>
                <span className="font-mono text-amber-300 font-bold">{rejectingPayment.transactionReference}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Reason for Rejection *</label>
              <select
                onChange={(e) => setPaymentRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs mb-2"
              >
                <option value="Transaction ID not found in JazzCash statement.">Transaction ID not found in JazzCash statement</option>
                <option value="Amount received does not match the plan price.">Amount received does not match the plan price</option>
                <option value="Duplicate TID: this transaction reference was already used.">Duplicate TID: this transaction reference was already used</option>
                <option value="Payment not received on official number 03092541650.">Payment not received on official number 03092541650</option>
                <option value="Screenshot is illegible or does not match transaction.">Screenshot is illegible or does not match transaction</option>
              </select>

              <textarea
                rows={2}
                value={paymentRejectionReason}
                onChange={(e) => setPaymentRejectionReason(e.target.value)}
                placeholder="Explain why the reference could not be verified..."
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPayment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RECEIPT LIGHTBOX MODAL ================= */}
      {viewingReceiptImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setViewingReceiptImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingReceiptImage}
              alt="Payment receipt proof"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain border border-white/10 shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={viewingReceiptImage}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
              <button
                onClick={() => setViewingReceiptImage(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EPISODES MANAGER MODAL ================= */}
      {managingEpisodesFor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-bold text-[#713CFF] uppercase">Episode Management</span>
                <h3 className="text-base font-bold text-white">{managingEpisodesFor.title}</h3>
              </div>
              <button onClick={() => setManagingEpisodesFor(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddEpisode} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Add New Episode</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Season #</label>
                  <input
                    type="number"
                    min={1}
                    value={newEpisodeForm.seasonNumber || 1}
                    onChange={(e) => setNewEpisodeForm({ ...newEpisodeForm, seasonNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Episode #</label>
                  <input
                    type="number"
                    min={1}
                    value={newEpisodeForm.episodeNumber || 1}
                    onChange={(e) => setNewEpisodeForm({ ...newEpisodeForm, episodeNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Episode Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Episode Title"
                    value={newEpisodeForm.title || ''}
                    onChange={(e) => setNewEpisodeForm({ ...newEpisodeForm, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Video URL (Direct MP4, HLS, or video link)</label>
                <input
                  type="text"
                  required
                  placeholder="Paste video stream link"
                  value={newEpisodeForm.videoUrl || ''}
                  onChange={(e) => setNewEpisodeForm({ ...newEpisodeForm, videoUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#713CFF] text-white text-xs font-bold"
                >
                  Add Episode
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400">Existing Episodes ({seriesEpisodes.length})</h4>
              {seriesEpisodes.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No episodes added yet.</p>
              ) : (
                <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                  {seriesEpisodes.map((ep) => (
                    <div key={ep.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">
                          S{ep.seasonNumber} E{ep.episodeNumber}: {ep.title}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-sm">{ep.videoUrl}</span>
                      </div>
                      <button
                        onClick={() => deleteEpisode(managingEpisodesFor.id, ep.id)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        title="Delete episode"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= REJECTION REASON MODAL ================= */}
      {rejectingVideoId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Reject User Video</h3>
            <p className="text-xs text-slate-400">Specify why this submission does not meet guidelines (user will see this message):</p>
            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="e.g. Copyright audio detected, blurry video resolution, etc."
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingVideoId(null)} className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white">Cancel</button>
              <button onClick={handleConfirmRejectVideo} className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PREVIEW USER VIDEO MODAL ================= */}
      {previewUserVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={previewUserVideo.videoUrl}
              videoSource="direct"
              title={`PREVIEW: ${previewUserVideo.title}`}
              posterUrl={previewUserVideo.thumbnailUrl}
              onClose={() => setPreviewUserVideo(null)}
            />
          </div>
        </div>
      )}

      {/* Preview media & channel modals */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={previewMedia.videoUrl}
              videoSource={previewMedia.videoSource}
              title={`PREVIEW: ${previewMedia.title}`}
              posterUrl={previewMedia.backdropUrl || previewMedia.posterUrl}
              onClose={() => setPreviewMedia(null)}
            />
          </div>
        </div>
      )}

      {previewChannel && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex-1 w-full relative">
            <VideoPlayer
              videoUrl={previewChannel.streamUrl}
              videoSource={previewChannel.streamUrl.includes('.m3u8') ? 'hls' : 'direct'}
              title={`PREVIEW LIVE: ${previewChannel.name}`}
              posterUrl={previewChannel.logoUrl}
              onClose={() => setPreviewChannel(null)}
            />
          </div>
        </div>
      )}

      {testResultModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-md w-full p-6 text-center space-y-4">
            <h3 className="text-base font-bold text-white">{testResultModal.itemTitle}</h3>
            <p className="text-xs text-slate-400">{testResultModal.result.message}</p>
            <button onClick={() => setTestResultModal(null)} className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
