import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className = '',
  fallbackSrc = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400'
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  // If src is empty, null, or undefined, use fallback
  if (!src || src.trim() === '') {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={error ? fallbackSrc : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}