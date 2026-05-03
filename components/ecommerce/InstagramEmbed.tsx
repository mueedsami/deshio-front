'use client';

import React, { useEffect, useRef } from 'react';

interface InstagramEmbedProps {
  url: string;
}

export default function InstagramEmbed({ url }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the instagram script is already loaded
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    } else {
      // Load the script if not present
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.instagram.com/embed.js';
      document.body.appendChild(script);
      
      script.onload = () => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process();
        }
      };
    }
  }, [url]);

  // Clean trailing slash and add embed suffix if needed (though blockquote handles it)
  const normalizedUrl = url.endsWith('/') ? url : `${url}/`;

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={`${normalizedUrl}?utm_source=ig_embed&utm_campaign=loading`}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: '0',
          borderRadius: '12px',
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: '1px',
          maxWidth: '540px',
          minWidth: '326px',
          padding: '0',
          width: 'calc(100% - 2px)',
        }}
      >
        <div style={{ padding: '16px' }}>
          <a
            href={`${normalizedUrl}?utm_source=ig_embed&utm_campaign=loading`}
            style={{
              background: '#FFFFFF',
              lineHeight: '0',
              padding: '0 0',
              textAlign: 'center',
              textDecoration: 'none',
              width: '100%',
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Minimal fallback content while loading */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', flexGrow: 0, height: '40px', marginRight: '14px', width: '40px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', marginBottom: '6px', width: '100px' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', width: '60px' }}></div>
              </div>
            </div>
            <div style={{ padding: '19% 0' }}></div>
            <div style={{ textAlign: 'center', color: '#c9c8cd', fontFamily: 'Arial,sans-serif', fontSize: '14px' }}>
              Loading post...
            </div>
          </a>
        </div>
      </blockquote>
    </div>
  );
}
