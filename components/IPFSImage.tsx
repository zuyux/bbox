'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { extractIPFSHash, optimizeIPFSUrl } from '@/lib/ipfs-utils';

interface IPFSImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  onError?: () => void;
  onLoad?: () => void;
}

const IPFSImage: React.FC<IPFSImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  fill,
  priority,
  sizes,
  loading,
  onError,
  onLoad
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);

    const hash = extractIPFSHash(src);
    if (!hash) {
      console.error('Invalid IPFS hash for image:', src);
      setCurrentSrc(src);
      return;
    }

    setCurrentSrc(optimizeIPFSUrl(src));
  }, [src]);

  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    onLoad?.();
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-background rounded-full text-gray-400 ${className}`}>
        <div className="text-center p-4">
          <div className="text-2xl mb-2">🖼️</div>
          <div className="text-sm">Image failed to load</div>
        </div>
      </div>
    );
  }

  if (!currentSrc) {
    return (
      <div className={`flex items-center justify-center bg-transparent ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt || 'IPFS Image'}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      priority={priority}
      unoptimized
      {...(fill
        ? { fill: true, sizes: sizes || '100vw', ...(loading ? { loading } : {}) }
        : { width: width || 400, height: height || 400, ...(loading ? { loading } : {}) })}
    />
  );
};

export default IPFSImage;
