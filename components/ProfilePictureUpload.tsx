import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, User, Loader2 } from 'lucide-react';
import { getIPFSUrl } from '@/lib/pinataUpload';
import { useWallet } from '@/components/WalletProvider';
import { authorizeProfilePayload } from '@/lib/profileApi';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  currentAvatarCid?: string;
  address: string;
  onUploadSuccess: (avatarUrl: string, avatarCid: string) => void;
  onRemoveSuccess: () => void;
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  currentAvatarCid,
  address,
  onUploadSuccess,
  onRemoveSuccess
}: ProfilePictureUploadProps) {
  const { walletType } = useWallet();
  const { currentWallet } = useEncryptedWallet();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const authPayload = await authorizeProfilePayload('POST', '/api/profile/avatar', {
        address,
        oldCid: currentAvatarCid || '',
        file: { name: file.name, size: file.size, type: file.type, sha256 },
      }, walletType, currentWallet?.privateKey);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('address', address);
      if (currentAvatarCid) {
        formData.append('oldCid', currentAvatarCid);
      }
      formData.append('profileMutationProof', JSON.stringify(authPayload.profileMutationProof));

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : result.error ? JSON.stringify(result.error) : 'Upload failed. Please try again.';

      if (response.ok && result.success) {
        onUploadSuccess(result.avatarUrl, result.cid);
        setPreviewUrl(null);
        setError(null);
      } else {
        setError(errorMessage);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Upload failed. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarCid) return;

    setIsRemoving(true);
    setError(null);

    try {
      const payload = await authorizeProfilePayload('DELETE', '/api/profile/avatar', {
        address, cid: currentAvatarCid,
      }, walletType, currentWallet?.privateKey);
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });

      const result = await response.json();
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : result.error ? JSON.stringify(result.error) : 'Failed to remove profile picture.';

      if (response.ok && result.success) {
        onRemoveSuccess();
        setError(null);
      } else {
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Remove error:', error);
      setError('Failed to remove profile picture.');
    } finally {
      setIsRemoving(false);
    }
  };

  const displayImage = previewUrl || (currentAvatarCid ? getIPFSUrl(currentAvatarCid) : currentAvatarUrl);
  const isLoading = isUploading || isRemoving;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {/* Avatar Display */}
        <div className="relative w-24 h-24 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          
          {displayImage ? (
            (currentAvatarCid && !previewUrl) ? (
              // Use regular img tag for IPFS URLs to avoid Next.js optimization issues
              <img
                src={displayImage}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  console.error('Failed to load IPFS image:', displayImage);
                  e.currentTarget.style.display = 'none';
                  // Show fallback icon
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const icon = parent.querySelector('.fallback-icon');
                    if (icon) icon.classList.remove('hidden');
                  }
                }}
              />
            ) : (
              // Use Next.js Image for regular URLs and preview images
              <Image
                src={displayImage}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
              />
            )
          ) : (
            <User className="w-12 h-12 text-white/60" />
          )}
          {/* Fallback icon for failed IPFS loads */}
          <User className="w-12 h-12 text-white/60 fallback-icon hidden" />
        </div>

        {/* Upload/Remove Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{currentAvatarUrl ? 'Change' : 'Upload'}</span>
            </button>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-sm text-white/60">
            JPG, PNG, GIF or WebP. Max 10MB.
          </p>

          {currentAvatarCid && (
            <div className="text-xs text-white/40 font-mono">
              IPFS: {currentAvatarCid}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
