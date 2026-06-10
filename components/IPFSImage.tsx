'use client';

import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImageWithFallback = async () => {
      setIsLoading(true);
      setHasError(false);

      const hash = extractIPFSHash(src);
      if (!hash) {
        console.error('Invalid IPFS hash for image:', src);
        setCurrentSrc(src);
        setIsLoading(false);
        return;
      }

      // Try different IPFS gateways
      const gateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
        'https://gateway.ipfs.io/ipfs/'
      ];

      for (const gateway of gateways) {
        try {
          const testUrl = `${gateway}${hash}`;
          
          // Test if the image loads
          await new Promise<void>((resolve, reject) => {
            const img = document.createElement('img');
            const timeoutId = window.setTimeout(() => {
              img.onload = null;
              img.onerror = null;
              reject(new Error('Timeout'));
            }, 10000);

            img.onload = () => {
              window.clearTimeout(timeoutId);
              resolve();
            };
            img.onerror = () => {
              window.clearTimeout(timeoutId);
              reject(new Error('Load failed'));
            };
            img.crossOrigin = 'anonymous';
            img.src = testUrl;
          });

          // If we get here, the image loaded successfully
          setCurrentSrc(optimizeIPFSUrl(testUrl));
          setIsLoading(false);
          return;
        } catch {
          continue;
        }
      }

      // All gateways failed
      console.error('Failed to load image from all IPFS gateways');
      setHasError(true);
      setCurrentSrc(src); // Fallback to original URL
      setIsLoading(false);
    };

    loadImageWithFallback();
  }, [src]);

  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    setIsLoading(false);
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

  if (isLoading || !currentSrc) {
    return (
      <div className={`flex items-center justify-center bg-transparent ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  const imageProps = {
    src: currentSrc,
    alt: alt || 'IPFS Image',
    className,
    onError: handleImageError,
    onLoad: handleImageLoad,
    priority,
    unoptimized: true,
    ...(fill
      ? { fill: true, sizes: sizes || '100vw', ...(loading ? { loading } : {}) }
      : { width: width || 400, height: height || 400, ...(loading ? { loading } : {}) }),
  };

  return <Image {...imageProps} />;
};

export default IPFSImage;