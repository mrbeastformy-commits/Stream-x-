import React, { useEffect, useState } from 'react';
import { Film, Trash2, Clock, CheckCircle2, XCircle, Play, X, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserVideo } from '../../types';
import { subscribeUserUploads, deleteUserVideo } from '../../services/mediaService';

interface MyUploadsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUploadModal: () => void;
  onPlayVideo: (video: UserVideo) => void;
}

export const MyUploadsDrawer: React.FC<MyUploadsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenUploadModal,
  onPlayVideo,
}) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UserVideo[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const unsub = subscribeUserUploads(user.uid, (items) => {
      setUploads(items);
    });
    return () => unsub();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this uploaded video?')) return;
    try {
      setDeletingId(id);
      await deleteUserVideo(id);
    } catch (e) {
      console.error('Delete error', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#713CFF]" /> My Uploaded Videos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track the moderation and publishing status of your submissions.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenUploadModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" /> New Upload
          </button>
        </div>

        {uploads.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <Film className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-slate-300">No Videos Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't uploaded any videos yet. Share your creative videos with STREAMX viewers!
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenUploadModal();
              }}
              className="px-4 py-2 rounded-xl bg-[#713CFF] text-white text-xs font-bold mt-2"
            >
              Upload Video Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((video) => (
              <div
                key={video.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-16 h-12 rounded-xl bg-black overflow-hidden flex-shrink-0 relative group">
                    <img
                      src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=200&q=80'}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onPlayVideo(video)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{video.title}</h4>
                      {video.status === 'pending' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {video.status === 'approved' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Approved & Live
                        </span>
                      )}
                      {video.status === 'rejected' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Needs Changes
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                      {video.category} • {video.fileSizeMb || 0} MB • {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                    {video.rejectionReason && (
                      <p className="text-[11px] text-rose-400 mt-1">
                        Reason: {video.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onPlayVideo(video)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition"
                    title="Play Video"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                    title="Remove Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
