import React, { useState } from 'react';
import { Upload, Film, Image, CheckCircle, AlertTriangle, X, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadMediaFile, submitUserVideo } from '../../services/mediaService';
import { MOVIE_CATEGORIES } from './StreamxPlayerApp';

interface UserUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

const MAX_FILE_SIZE_MB = 100;

export const UserUploadModal: React.FC<UserUploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const { user } = useAuth();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Pakistani');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      setError(`File size exceeds limit (${sizeMb.toFixed(1)}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setVideoFile(file);
    setError(null);
    setVideoPreviewUrl(URL.createObjectURL(file));

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to upload videos.');
      return;
    }

    if (!videoFile) {
      setError('Please select a video file to upload.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a title for your video.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10);

      // Upload video
      const videoUrl = await uploadMediaFile(videoFile, 'user_uploads', (pct) => {
        setUploadProgress(Math.min(90, Math.round(pct * 0.8)));
      });

      // Upload thumbnail if provided
      let thumbUrl = '';
      if (thumbnailFile) {
        thumbUrl = await uploadMediaFile(thumbnailFile, 'posters');
      }

      setUploadProgress(95);

      // Submit to user_videos collection with pending status
      await submitUserVideo({
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || 'Community Creator',
        title: title.trim(),
        description: description.trim(),
        category,
        videoUrl,
        thumbnailUrl: thumbUrl,
        fileSizeMb: Math.round((videoFile.size / (1024 * 1024)) * 10) / 10,
      });

      setUploadProgress(100);
      setSuccess(true);

      setTimeout(() => {
        setIsUploading(false);
        setSuccess(false);
        if (onUploadSuccess) onUploadSuccess();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please check network and retry.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#171C2B] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#713CFF]/20 text-[#713CFF]">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Upload Your Video</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Share movies, skits, or original video clips with the STREAMX community.
          </p>
        </div>

        {/* Notice of Moderation */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span className="leading-tight">
            <strong>Community Moderation:</strong> All uploads undergo review by STREAMX administrators before appearing in public rails to prevent copyright and inappropriate content.
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              <strong>Upload Submitted!</strong> Your video is sent to the moderation queue and will appear in your "My Uploads" list.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Video File */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Video File (MP4, WebM, MOV - Max {MAX_FILE_SIZE_MB}MB) *
            </label>
            <label className="border-2 border-dashed border-white/15 hover:border-[#713CFF] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-black/20 group">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <Film className="w-7 h-7 text-slate-400 group-hover:text-[#713CFF] mb-1 transition" />
              <span className="text-xs font-bold text-white">
                {videoFile ? videoFile.name : 'Select from Android Gallery or Files'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Tap to browse device media'}
              </span>
            </label>
          </div>

          {/* Video Preview */}
          {videoPreviewUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
              <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Video Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. My Cinematic Short Film"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
              >
                {MOVIE_CATEGORIES.slice(1).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Creator Showcase">Creator Showcase</option>
                <option value="Documentary">Documentary</option>
                <option value="Comedy & Skits">Comedy & Skits</option>
              </select>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Poster Thumbnail</label>
              <label className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs flex items-center justify-between cursor-pointer hover:border-[#713CFF]">
                <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                <span className="truncate text-slate-300">
                  {thumbnailFile ? thumbnailFile.name : 'Pick Image'}
                </span>
                <Image className="w-4 h-4 text-slate-400" />
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief summary of your video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#713CFF]"
            />
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>Uploading video...</span>
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

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-bold shadow-lg shadow-[#713CFF]/30 hover:opacity-95 disabled:opacity-50 transition"
            >
              {isUploading ? 'Uploading...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
