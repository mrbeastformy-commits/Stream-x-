export type MediaType = 'movie' | 'drama' | 'cartoon' | 'youtube';
export type VideoSourceType = 'upload' | 'youtube' | 'direct' | 'hls';
export type TestStatus = 'untested' | 'working' | 'error';
export type ChannelStatus = 'LIVE' | 'OFFLINE' | 'CHECKING' | 'UNAVAILABLE';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'jazzcash' | 'debit_card' | 'credit_card' | 'google_play' | 'bank_transfer';
export type TransactionStatus = 'pending' | 'completed' | 'rejected' | 'failed' | 'refunded';

export interface Episode {
  id: string;
  mediaId: string;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  videoUrl: string;
  videoSource: VideoSourceType;
  youtubeVideoId?: string;
  duration?: string;
  posterUrl?: string;
  description?: string;
  isPublished: boolean;
  createdAt?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  type: MediaType;
  category: string;
  genre?: string;
  year?: string;
  language?: string;
  country?: string;
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl: string;
  videoSource: VideoSourceType;
  youtubeVideoId?: string;
  duration?: string;
  isPublished: boolean;
  isFeatured?: boolean;
  isPremiumOnly?: boolean;
  testStatus?: TestStatus;
  lastTestedAt?: string;
  lastTestError?: string;
  seasonsCount?: number;
  episodesCount?: number;
  episodes?: Episode[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  logoUrl?: string;
  category: string;
  country?: string;
  language?: string;
  streamUrl: string;
  status: ChannelStatus;
  testStatus?: TestStatus;
  lastTestedAt?: string;
  lastError?: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserVideo {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  title: string;
  description?: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  fileSizeMb?: number;
  status: ModerationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PremiumPlan {
  id: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  features: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  billingCycle?: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  jazzcashNumber?: string;
  senderPhone?: string;
  receiptUrl?: string;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  verifiedBy?: string;
  activatedAt?: string;
  expiresAt?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface VideoReport {
  id: string;
  videoId: string;
  videoTitle: string;
  reporterId: string;
  reporterEmail?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'investigated' | 'resolved';
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isPremium?: boolean;
  premiumPlanId?: string;
  premiumPlanName?: string;
  premiumActivatedAt?: string;
  premiumExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybackReport {
  id: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  errorType: string;
  errorMessage: string;
  status: 'open' | 'investigating' | 'resolved';
  reportedAt: string;
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'release' | 'maintenance';
  active: boolean;
  createdAt: string;
}

export interface WatchProgress {
  mediaId: string;
  title: string;
  posterUrl?: string;
  timestamp: number;
  duration: number;
  lastWatchedAt: number;
}
