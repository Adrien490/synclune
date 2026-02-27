import { CollectionsSection } from "@/app/(boutique)/(accueil)/_components/collections-section";
import { LatestCreations } from "@/app/(boutique)/(accueil)/_components/latest-creations";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { NewsletterSection } from "@/app/(boutique)/(accueil)/_components/newsletter-section";
import { getProducts } from "@/modules/products/data/get-products";
import { getFeaturedReviews } from "@/modules/reviews/data/get-featured-reviews";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import { StructuredData } from "@/shared/components/structured-data";
import { SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierStory } from "./_components/atelier-story";
import { CreativeProcess } from "./_components/creative-process";
import { FaqSection } from "./_components/faq-section";
import { HeroSection } from "./_components/hero-section";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { ReviewsSection } from "./_components/reviews-section";
import { ReviewsSectionSkeleton } from "./_components/reviews-section-skeleton";

export const metadata: Metadata = {
  title: {
    absolute: "Synclune | Bijoux artisanaux faits main à Nantes",
  },
  description:
    "Bijoux faits main uniques et colorés. Boucles d'oreilles, colliers, bracelets créés avec amour par Léane à Nantes. Éditions limitées, livraison rapide.",
  keywords:
    "bijoux artisanaux Nantes, bijoux faits main Nantes, créatrice bijoux Nantes, bagues Nantes, colliers Nantes, boucles d'oreilles Nantes, bracelets Nantes, bijoux colorés Loire-Atlantique, atelier bijoux Nantes 44",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Synclune | Bijoux artisanaux faits main à Nantes (44)",
    description:
      "Bijoux colorés faits main dans mon atelier nantais. Boucles d'oreilles, colliers, bracelets. Loire-Atlantique.",
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Synclune | Bijoux artisanaux faits main Nantes (44)",
    description:
      "Bijoux artisanaux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets uniques. Créatrice Loire-Atlantique.",
  },
};

export default async function Page() {
  // Stream review stats to avoid blocking page render
  const reviewStatsPromise = getGlobalReviewStats();
  const featuredReviewsPromise = getFeaturedReviews();

  // Shared between HeroSection (floating images) and LatestCreations (product cards)
  const latestCreationsPromise = getProducts(
    {
      perPage: 4,
      sortBy: "created-descending",
      filters: { status: "PUBLIC" },
    },
    { isAdmin: false },
  );

  return (
    <>
      {/* JSON-LD schemas: LocalBusiness, Organization, WebSite, Founder, Article, Reviews */}
      <Suspense>
        <StructuredData
          reviewStatsPromise={reviewStatsPromise}
          reviewsPromise={featuredReviewsPromise}
        />
      </Suspense>

      {/* 1. Hero - Attention capture + rotating tagline + floating product images */}
      <Suspense fallback={<HeroSectionSkeleton />}>
        <HeroSection productsPromise={latestCreationsPromise} />
      </Suspense>

      {/* 2. Latest Creations - 4 most recent products (manages its own inner Suspense) */}
      <LatestCreations productsPromise={latestCreationsPromise} />

      {/* 3. Collections - Thematic browsing with descriptions */}
      <Suspense fallback={<CollectionsSectionSkeleton collectionsCount={6} />}>
        <CollectionsSection
          collectionsPromise={getCollections({
            perPage: 6,
            sortBy: "created-descending",
            filters: {
              hasProducts: true,
              status: CollectionStatus.PUBLIC,
            },
          })}
        />
      </Suspense>

      {/* 4. Reviews - Social proof with featured customer reviews */}
      <Suspense fallback={<ReviewsSectionSkeleton />}>
        <ReviewsSection
          reviewsPromise={featuredReviewsPromise}
          reviewStatsPromise={reviewStatsPromise}
        />
      </Suspense>

      {/* 5. Atelier Story - Condensed on mobile */}
      <AtelierStory />

      {/* 6. Creative Process - Condensed on mobile */}
      <CreativeProcess />

      {/* 7. FAQ - Frequently asked questions with JSON-LD */}
      <FaqSection />

      {/* 8. Newsletter - Subscription with gift incentive */}
      <NewsletterSection />
    </>
  );
}
