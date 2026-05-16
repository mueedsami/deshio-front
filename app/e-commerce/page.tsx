'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/ecommerce/Navigation';
import HeroSection from '@/components/ecommerce/HeroSection';
import dynamic from 'next/dynamic';
import AnnouncementTicker from '@/components/ecommerce/AnnouncementTicker';
import {
  TickerSkeleton,
  HeroSkeleton,
  CollectionsSkeleton,
  SectionSkeleton,
  ShowcaseSkeleton,
} from '@/components/ecommerce/HomepageSkeletons';

const CollectionTiles = dynamic(() => import('@/components/ecommerce/CollectionTiles'), {
  loading: () => <CollectionsSkeleton />,
});
const NewArrivals = dynamic(() => import('@/components/ecommerce/NewArrivals'), {
  loading: () => <SectionSkeleton height="600px" />,
});
const SubcategoryProductTabs = dynamic(() => import('@/components/ecommerce/SubcategoryProductTabs'), {
  loading: () => <ShowcaseSkeleton />,
});
const BanneredCollections = dynamic(() => import('@/components/ecommerce/BanneredCollections'), {
  loading: () => <SectionSkeleton height="400px" />,
});
const InstagramReelViewer = dynamic(() => import('@/components/ecommerce/InstagramReelViewer'), {
  ssr: false,
  loading: () => <SectionSkeleton height="760px" />,
});

import SectionReveal from '@/components/ecommerce/SectionReveal';
import settingsService from '@/services/settingsService';
import { toAbsoluteAssetUrl } from '@/lib/urlUtils';

export default function HomePage() {
  const [heroData, setHeroData] = useState<{ ticker: any; hero: any } | null>(null);
  const [collections, setCollections] = useState<any[] | null>(null);
  const [newArrivals, setNewArrivals] = useState<any | null>(null);
  const [banneredCollections, setBanneredCollections] = useState<any[] | null>(null);
  const [instagramReels, setInstagramReels] = useState<any | null>(null);
  const [showcase, setShowcase] = useState<any[] | null>(null);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'hero',
    'featured_collections',
    'new_arrivals',
    'bannered_collections',
    'instagram_reels',
    'showcase',
  ]);

  const [loadingHero, setLoadingHero] = useState(true);

  useEffect(() => {
    settingsService.getHomepageSettings('hero').then((data) => {
      setHeroData({ ticker: data.ticker, hero: data.hero });
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(console.error).finally(() => setLoadingHero(false));

    settingsService.getHomepageSettings('collections').then((data) => {
      setCollections(data.collections || []);
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(() => setCollections([]));

    settingsService.getHomepageSettings('new_arrivals').then((data) => {
      setNewArrivals(data.new_arrivals || { enabled: false, products: [] });
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(() => setNewArrivals({ enabled: false, products: [] }));

    settingsService.getHomepageSettings('bannered_collections').then((data) => {
      setBanneredCollections(data.bannered_collections || []);
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(() => setBanneredCollections([]));

    settingsService.getHomepageSettings('instagram_reels').then((data) => {
      setInstagramReels(data.instagram_reels || { enabled: false, links: [] });
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(() => setInstagramReels({ enabled: false, links: [] }));

    settingsService.getHomepageSettings('showcase').then((data) => {
      setShowcase(data.showcase || []);
      if (data.section_order) setSectionOrder(data.section_order);
    }).catch(() => setShowcase([]));
  }, []);

  return (
    <div className="ec-root min-h-screen" style={{ background: '#ffffff' }}>
      <Navigation />

      {loadingHero ? (
        <TickerSkeleton />
      ) : heroData?.ticker?.enabled && heroData?.ticker?.phrases?.length > 0 ? (
        <AnnouncementTicker
          phrases={heroData.ticker.phrases}
          mode={heroData.ticker.mode}
          backgroundColor={heroData.ticker.background_color}
          textColor={heroData.ticker.text_color}
          speed={heroData.ticker.speed}
        />
      ) : null}

      {sectionOrder.map((sectionKey) => {
        switch (sectionKey) {
          case 'hero':
            return (
              <React.Fragment key="hero">
                {loadingHero ? (
                  <HeroSkeleton />
                ) : (
                  <HeroSection
                    images={heroData?.hero?.images ? heroData.hero.images.map((img: any) => ({ ...img, url: toAbsoluteAssetUrl(img.url) })) : []}
                    title={heroData?.hero?.title}
                    showTitle={heroData?.hero?.show_title}
                    slideshowEnabled={heroData?.hero?.slideshow_enabled}
                    autoplaySpeed={heroData?.hero?.autoplay_speed}
                    textPosition={heroData?.hero?.text_position}
                    textColor={heroData?.hero?.text_color}
                    fontSize={heroData?.hero?.font_size}
                    transitionType={heroData?.hero?.transition_type}
                  />
                )}
              </React.Fragment>
            );

          case 'featured_collections':
            return (
              <React.Fragment key="featured_collections">
                {collections === null ? (
                  <CollectionsSkeleton />
                ) : collections.length > 0 ? (
                  <SectionReveal>
                    <CollectionTiles collections={collections.map((c: any) => ({ ...c, image: toAbsoluteAssetUrl(c.image) })) as any} />
                  </SectionReveal>
                ) : null}
              </React.Fragment>
            );

          case 'new_arrivals':
            return (
              <React.Fragment key="new_arrivals">
                {newArrivals === null ? (
                  <SectionSkeleton height="600px" />
                ) : newArrivals?.products?.length > 0 ? (
                  <SectionReveal>
                    <NewArrivals limit={12} customProducts={newArrivals.products} />
                  </SectionReveal>
                ) : null}
              </React.Fragment>
            );

          case 'bannered_collections':
            return (
              <React.Fragment key="bannered_collections">
                {banneredCollections === null ? (
                  <SectionSkeleton height="400px" />
                ) : banneredCollections.length > 0 ? (
                  <SectionReveal>
                    <BanneredCollections items={banneredCollections.map((c: any) => ({ ...c, image: toAbsoluteAssetUrl(c.image) })) as any} />
                  </SectionReveal>
                ) : null}
              </React.Fragment>
            );

          case 'instagram_reels':
            return (
              <React.Fragment key="instagram_reels">
                {instagramReels === null ? (
                  <SectionSkeleton height="760px" />
                ) : instagramReels?.enabled && instagramReels?.links?.length > 0 ? (
                  <SectionReveal threshold={0.05}>
                    <InstagramReelViewer urls={instagramReels.links} />
                  </SectionReveal>
                ) : null}
              </React.Fragment>
            );

          case 'showcase':
            return (
              <React.Fragment key="showcase">
                {showcase === null ? (
                  <div className="flex flex-col gap-20 py-10">
                    <ShowcaseSkeleton />
                    <ShowcaseSkeleton />
                  </div>
                ) : showcase.length > 0 ? (
                  showcase.map((item: any, idx: number) => (
                    <SectionReveal key={`showcase-${item.category_id}-${idx}`} threshold={0.1}>
                      <SubcategoryProductTabs
                        categoryId={item.category_id}
                        subcategoryIds={item.subcategories}
                        productsPerTab={8}
                        customProductsByCategory={item.product_data_by_category || {}}
                      />
                    </SectionReveal>
                  ))
                ) : null}
              </React.Fragment>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
