import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from './firebase';
import {
  MediaItem,
  Episode,
  LiveChannel,
  PlaybackReport,
  PlatformNotification,
  UserVideo,
  PremiumPlan,
  PaymentTransaction,
  VideoReport,
  UserProfile
} from '../types';

export function generateId(): string {
  return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

/**
 * Strips all keys with `undefined` values recursively so Firestore setDoc never throws:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const result: any = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// =================== MEDIA (Movies, Dramas, Cartoons, YouTube) ===================

export function subscribePublishedMedia(callback: (items: MediaItem[]) => void): Unsubscribe {
  const mediaRef = collection(db, 'media');
  const q = query(mediaRef, where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as MediaItem);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'media');
    }
  );
}

export function subscribeAllMedia(callback: (items: MediaItem[]) => void): Unsubscribe {
  const mediaRef = collection(db, 'media');

  return onSnapshot(
    mediaRef,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as MediaItem);
      });
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'media');
    }
  );
}

export async function saveMediaItem(item: Partial<MediaItem>): Promise<string> {
  const id = item.id || generateId();
  const path = `media/${id}`;
  const now = new Date().toISOString();

  const dataToSave = {
    title: item.title || 'Untitled',
    description: item.description || '',
    type: item.type || 'movie',
    category: item.category || 'General',
    genre: item.genre || '',
    year: item.year || new Date().getFullYear().toString(),
    language: item.language || 'English',
    country: item.country || '',
    posterUrl: item.posterUrl || '',
    backdropUrl: item.backdropUrl || '',
    videoUrl: item.videoUrl || '',
    videoSource: item.videoSource || 'direct',
    youtubeVideoId: item.youtubeVideoId || '',
    duration: item.duration || '',
    isPublished: item.isPublished ?? true,
    isFeatured: item.isFeatured ?? false,
    isPremiumOnly: item.isPremiumOnly ?? false,
    testStatus: item.testStatus || 'untested',
    lastTestedAt: item.lastTestedAt || '',
    lastTestError: item.lastTestError || '',
    seasonsCount: item.seasonsCount || 1,
    episodesCount: item.episodesCount || 0,
    createdBy: item.createdBy || 'owner',
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'media', id), dataToSave, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMediaItem(id: string): Promise<void> {
  const path = `media/${id}`;
  try {
    await deleteDoc(doc(db, 'media', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== EPISODES ===================

export function subscribeEpisodes(mediaId: string, callback: (episodes: Episode[]) => void): Unsubscribe {
  const epsRef = collection(db, 'media', mediaId, 'episodes');

  return onSnapshot(
    epsRef,
    (snapshot) => {
      const eps: Episode[] = [];
      snapshot.forEach((d) => {
        eps.push({ id: d.id, ...d.data() } as Episode);
      });
      eps.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
      callback(eps);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `media/${mediaId}/episodes`);
    }
  );
}

export async function saveEpisode(mediaId: string, episode: Partial<Episode>): Promise<string> {
  const id = episode.id || generateId();
  const path = `media/${mediaId}/episodes/${id}`;
  const now = new Date().toISOString();

  const data = {
    mediaId,
    title: episode.title || `Episode ${episode.episodeNumber || 1}`,
    seasonNumber: episode.seasonNumber || 1,
    episodeNumber: episode.episodeNumber || 1,
    videoUrl: episode.videoUrl || '',
    videoSource: episode.videoSource || 'direct',
    youtubeVideoId: episode.youtubeVideoId || '',
    duration: episode.duration || '',
    posterUrl: episode.posterUrl || '',
    description: episode.description || '',
    isPublished: episode.isPublished ?? true,
    createdAt: episode.createdAt || now,
  };

  try {
    await setDoc(doc(db, 'media', mediaId, 'episodes', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteEpisode(mediaId: string, episodeId: string): Promise<void> {
  const path = `media/${mediaId}/episodes/${episodeId}`;
  try {
    await deleteDoc(doc(db, 'media', mediaId, 'episodes', episodeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== LIVE CHANNELS ===================

export function subscribeLiveChannels(
  publishedOnly: boolean,
  callback: (channels: LiveChannel[]) => void
): Unsubscribe {
  const channelsRef = collection(db, 'live_channels');
  const q = publishedOnly ? query(channelsRef, where('isPublished', '==', true)) : channelsRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const channels: LiveChannel[] = [];
      snapshot.forEach((d) => {
        channels.push({ id: d.id, ...d.data() } as LiveChannel);
      });
      channels.sort((a, b) => a.name.localeCompare(b.name));
      callback(channels);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'live_channels');
    }
  );
}

export async function saveLiveChannel(channel: Partial<LiveChannel>): Promise<string> {
  const id = channel.id || generateId();
  const path = `live_channels/${id}`;
  const now = new Date().toISOString();

  const data = {
    name: channel.name || 'Unnamed Channel',
    logoUrl: channel.logoUrl || '',
    category: channel.category || 'News',
    country: channel.country || 'International',
    language: channel.language || 'English',
    streamUrl: channel.streamUrl || '',
    status: channel.status || 'CHECKING',
    testStatus: channel.testStatus || 'untested',
    lastTestedAt: channel.lastTestedAt || '',
    lastError: channel.lastError || '',
    isPublished: channel.isPublished ?? true,
    createdAt: channel.createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'live_channels', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLiveChannel(id: string): Promise<void> {
  const path = `live_channels/${id}`;
  try {
    await deleteDoc(doc(db, 'live_channels', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== USER UPLOADED VIDEOS ===================

export function subscribeApprovedUserVideos(callback: (videos: UserVideo[]) => void): Unsubscribe {
  const q = query(collection(db, 'user_videos'), where('status', '==', 'approved'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: UserVideo[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as UserVideo));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'user_videos')
  );
}

export function subscribeUserUploads(userId: string, callback: (videos: UserVideo[]) => void): Unsubscribe {
  const q = query(collection(db, 'user_videos'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: UserVideo[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as UserVideo));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'user_videos')
  );
}

export function subscribeAllUserVideos(callback: (videos: UserVideo[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'user_videos'),
    (snapshot) => {
      const items: UserVideo[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as UserVideo));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'user_videos')
  );
}

export async function submitUserVideo(video: Omit<UserVideo, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const id = generateId();
  const path = `user_videos/${id}`;
  const now = new Date().toISOString();

  const data: UserVideo = {
    id,
    userId: video.userId,
    userEmail: video.userEmail || '',
    userName: video.userName || 'Community Creator',
    title: video.title,
    description: video.description || '',
    category: video.category || 'Community',
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl || '',
    fileSizeMb: video.fileSizeMb || 0,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'user_videos', id), data);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function moderateUserVideo(videoId: string, status: 'approved' | 'rejected', rejectionReason?: string): Promise<void> {
  const path = `user_videos/${videoId}`;
  try {
    await setDoc(doc(db, 'user_videos', videoId), {
      status,
      rejectionReason: rejectionReason || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteUserVideo(videoId: string): Promise<void> {
  const path = `user_videos/${videoId}`;
  try {
    await deleteDoc(doc(db, 'user_videos', videoId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== PREMIUM PLANS ===================

export function subscribeActivePlans(callback: (plans: PremiumPlan[]) => void): Unsubscribe {
  const q = query(collection(db, 'premium_plans'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PremiumPlan[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as PremiumPlan));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'premium_plans')
  );
}

export function subscribeAllPlans(callback: (plans: PremiumPlan[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'premium_plans'),
    (snapshot) => {
      const items: PremiumPlan[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as PremiumPlan));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'premium_plans')
  );
}

export async function savePremiumPlan(plan: Partial<PremiumPlan>): Promise<string> {
  const id = plan.id || generateId();
  const path = `premium_plans/${id}`;
  const data = {
    name: plan.name || 'Premium Plan',
    billingCycle: plan.billingCycle || 'monthly',
    price: plan.price ?? 4.99,
    currency: plan.currency || 'USD',
    features: plan.features || 'Ad-free streaming, VIP Badge, Extra upload storage',
    isActive: plan.isActive ?? true,
    createdAt: plan.createdAt || new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'premium_plans', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePremiumPlan(id: string): Promise<void> {
  const path = `premium_plans/${id}`;
  try {
    await deleteDoc(doc(db, 'premium_plans', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== PAYMENTS & SUBSCRIPTIONS (JAZZCASH & VIP) ===================

export const OWNER_JAZZCASH_NUMBER = '03092541650';
export const OWNER_JAZZCASH_TITLE = 'STREAMX ENTERTAINMENT / JAVED HUSSAIN';

export function subscribeUserPayments(userId: string, callback: (txs: PaymentTransaction[]) => void): Unsubscribe {
  const q = query(collection(db, 'payments'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PaymentTransaction[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as PaymentTransaction));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'payments')
  );
}

export function subscribeAllPayments(callback: (txs: PaymentTransaction[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'payments'),
    (snapshot) => {
      const items: PaymentTransaction[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as PaymentTransaction));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'payments')
  );
}

export async function createPaymentTransaction(tx: Omit<PaymentTransaction, 'id' | 'createdAt'>): Promise<string> {
  const id = generateId();
  const path = `payments/${id}`;
  const now = new Date().toISOString();

  const rawData: Record<string, any> = {
    ...tx,
    id,
    createdAt: now,
  };
  if (tx.status === 'completed') {
    rawData.completedAt = now;
  }
  const data = cleanFirestoreData(rawData);

  try {
    await setDoc(doc(db, 'payments', id), data);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updatePaymentStatus(txId: string, status: PaymentTransaction['status'], notes?: string): Promise<void> {
  const path = `payments/${txId}`;
  const updatePayload: Record<string, any> = {
    status,
    notes: notes || ''
  };
  if (status === 'completed') {
    updatePayload.completedAt = new Date().toISOString();
  }
  const cleanData = cleanFirestoreData(updatePayload);

  try {
    await setDoc(doc(db, 'payments', txId), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

/**
 * Approve verified JazzCash or direct payment.
 * Independent manual verification must be confirmed by the owner before calling.
 * Prevents duplicate approvals and activates Premium with calculated expiry date.
 */
export async function approvePayment(
  txId: string,
  adminEmail: string,
  adminNotes?: string
): Promise<{ success: boolean; expiryDate: string }> {
  const path = `payments/${txId}`;
  try {
    // 1. Fetch current transaction record
    const txDoc = await getDoc(doc(db, 'payments', txId));
    if (!txDoc.exists()) {
      throw new Error('Payment record not found.');
    }
    const tx = txDoc.data() as PaymentTransaction;

    // Prevent duplicate approval
    if (tx.status === 'completed') {
      throw new Error('This payment is already approved and completed.');
    }

    // 2. Fetch user profile to calculate expiry
    const userDoc = await getDoc(doc(db, 'users', tx.userId));
    let baseDate = new Date();
    if (userDoc.exists()) {
      const uData = userDoc.data();
      if (uData.isPremium && uData.premiumExpiresAt) {
        const existingExpiry = new Date(uData.premiumExpiresAt);
        if (existingExpiry.getTime() > Date.now()) {
          baseDate = existingExpiry; // Extend existing active subscription
        }
      }
    }

    const durationMonths = tx.billingCycle === 'yearly' ? 12 : 1;
    const expiryDate = new Date(baseDate);
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
    const nowIso = new Date().toISOString();
    const expiryIso = expiryDate.toISOString();

    // 3. Update customer's profile in Firestore
    await setDoc(
      doc(db, 'users', tx.userId),
      {
        isPremium: true,
        premiumPlanId: tx.planId,
        premiumPlanName: tx.planName,
        premiumActivatedAt: nowIso,
        premiumExpiresAt: expiryIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 4. Update transaction record
    await setDoc(
      doc(db, 'payments', txId),
      {
        status: 'completed',
        completedAt: nowIso,
        verifiedBy: adminEmail,
        activatedAt: nowIso,
        expiresAt: expiryIso,
        notes: adminNotes || `Verified by owner in JazzCash account (${OWNER_JAZZCASH_NUMBER}).`,
      },
      { merge: true }
    );

    // 5. Send confirmation notification to user / platform
    await saveNotification({
      title: 'STREAMX VIP Premium Activated!',
      message: `Payment verified for TID ${tx.transactionReference} (${tx.planName}). Premium access active through ${expiryDate.toLocaleDateString()}. Enjoy entertainment without limits!`,
      type: 'info',
      active: true,
    });

    return { success: true, expiryDate: expiryIso };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

/**
 * Reject payment reference if money was not received or TID is invalid.
 * Does NOT activate Premium.
 */
export async function rejectPayment(
  txId: string,
  adminEmail: string,
  reason: string
): Promise<void> {
  const path = `payments/${txId}`;
  try {
    const nowIso = new Date().toISOString();
    await setDoc(
      doc(db, 'payments', txId),
      {
        status: 'rejected',
        rejectionReason: reason || 'Transaction could not be verified in official JazzCash account.',
        verifiedBy: adminEmail,
        completedAt: nowIso,
        notes: `Rejected by ${adminEmail}: ${reason}`,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

/**
 * Mark payment back to pending status for re-checking.
 */
export async function markPaymentPending(
  txId: string,
  adminEmail: string,
  notes?: string
): Promise<void> {
  const path = `payments/${txId}`;
  try {
    await setDoc(
      doc(db, 'payments', txId),
      {
        status: 'pending',
        rejectionReason: '',
        notes: notes || `Marked pending for re-investigation by ${adminEmail}.`,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function activateUserPremium(userId: string, planId: string, durationMonths: number = 1): Promise<void> {
  const path = `users/${userId}`;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  try {
    await setDoc(doc(db, 'users', userId), {
      isPremium: true,
      premiumPlanId: planId,
      premiumExpiresAt: expiryDate.toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
  const path = `users/${userId}`;
  return onSnapshot(
    doc(db, 'users', userId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

// =================== VIDEO CONTENT REPORTS ===================

export function subscribeVideoReports(callback: (reports: VideoReport[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'video_reports'),
    (snapshot) => {
      const items: VideoReport[] = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as VideoReport));
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'video_reports')
  );
}

export async function submitVideoReport(report: Omit<VideoReport, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const id = generateId();
  const path = `video_reports/${id}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, 'video_reports', id), cleanFirestoreData({
      ...report,
      id,
      status: 'pending',
      createdAt: now,
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateVideoReportStatus(reportId: string, status: VideoReport['status']): Promise<void> {
  const path = `video_reports/${reportId}`;
  try {
    await setDoc(doc(db, 'video_reports', reportId), cleanFirestoreData({ status }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// =================== PLAYBACK ERROR REPORTS ===================

export function subscribePlaybackReports(callback: (reports: PlaybackReport[]) => void): Unsubscribe {
  const reportsRef = collection(db, 'playback_reports');

  return onSnapshot(
    reportsRef,
    (snapshot) => {
      const reports: PlaybackReport[] = [];
      snapshot.forEach((d) => {
        reports.push({ id: d.id, ...d.data() } as PlaybackReport);
      });
      reports.sort((a, b) => (b.reportedAt || '').localeCompare(a.reportedAt || ''));
      callback(reports);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'playback_reports');
    }
  );
}

export async function submitPlaybackReport(report: Omit<PlaybackReport, 'id'>): Promise<string> {
  const id = generateId();
  const path = `playback_reports/${id}`;
  try {
    await setDoc(doc(db, 'playback_reports', id), cleanFirestoreData({
      ...report,
      reportedAt: report.reportedAt || new Date().toISOString(),
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateReportStatus(id: string, status: 'open' | 'investigating' | 'resolved'): Promise<void> {
  const path = `playback_reports/${id}`;
  try {
    await setDoc(doc(db, 'playback_reports', id), { status }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// =================== NOTIFICATIONS / ANNOUNCEMENTS ===================

export function subscribeNotifications(
  activeOnly: boolean,
  callback: (notifs: PlatformNotification[]) => void
): Unsubscribe {
  const notifsRef = collection(db, 'notifications');
  const q = activeOnly ? query(notifsRef, where('active', '==', true)) : notifsRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs: PlatformNotification[] = [];
      snapshot.forEach((d) => {
        notifs.push({ id: d.id, ...d.data() } as PlatformNotification);
      });
      notifs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(notifs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    }
  );
}

export async function saveNotification(notif: Partial<PlatformNotification>): Promise<string> {
  const id = notif.id || generateId();
  const path = `notifications/${id}`;
  const data = {
    title: notif.title || '',
    message: notif.message || '',
    type: notif.type || 'info',
    active: notif.active ?? true,
    createdAt: notif.createdAt || new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'notifications', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// =================== GALLERY & FILE UPLOAD ===================

export interface UploadProgressHandler {
  (progressPercent: number): void;
}

export async function uploadMediaFile(
  file: File,
  folder: 'videos' | 'posters' | 'backdrops' | 'logos' | 'user_uploads' | 'receipts' = 'videos',
  onProgress?: UploadProgressHandler
): Promise<string> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${folder}/${Date.now()}_${sanitizedName}`;

  try {
    const fileRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.warn('Firebase Storage upload error, using local fallback URL:', error);
          const blobUrl = URL.createObjectURL(file);
          resolve(blobUrl);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch {
            const blobUrl = URL.createObjectURL(file);
            resolve(blobUrl);
          }
        }
      );
    });
  } catch {
    const blobUrl = URL.createObjectURL(file);
    return blobUrl;
  }
}
