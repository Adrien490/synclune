import { CollectionsSection } from "@/app/(boutique)/(accueil)/_components/collections-section";
import { CuratedPicks } from "@/app/(boutique)/(accueil)/_components/curated-picks";
import { CuratedPicksSkeleton } from "@/app/(boutique)/(accueil)/_components/curated-picks-skeleton";
import { LatestCreations } from "@/app/(boutique)/(accueil)/_components/latest-creations";
import { LatestCreationsSkeleton } from "@/app/(boutique)/(accueil)/_components/latest-creations-skeleton";
import { ValuePropositionBar } from "@/app/(boutique)/(accueil)/_components/value-proposition-bar";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { NewsletterSection } from "@/app/(boutique)/(accueil)/_components/newsletter-section";
import { getProducts } from "@/modules/products/data/get-products";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { StructuredData } from "@/shared/components/structured-data";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierStory } from "./_components/atelier-story";
import { CURATED_PICKS_SLUGS } from "./_constants/curated-picks";
import { CreativeProcess } from "./_components/creative-process";
import { FaqSection } from "./_components/faq-section";
import { HeroSection } from "./_components/hero-section";

export const metadata: Metadata = {
  title: {
    absolute: "Synclune | Bijoux artisanaux faits main à Nantes",
  },
  description:
    "Bijoux artisanaux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets uniques. Créatrice Loire-Atlantique.",
  keywords:
    "bijoux artisanaux Nantes, bijoux faits main Nantes, créatrice bijoux Nantes, bagues Nantes, colliers Nantes, boucles d'oreilles Nantes, bracelets Nantes, bijoux colorés Loire-Atlantique, atelier bijoux Nantes 44",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Synclune | Bijoux artisanaux faits main à Nantes (44)",
    description:
      "Bijoux colorés faits main dans mon atelier nantais. Boucles d'oreilles, colliers, bracelets. Loire-Atlantique.",
    url: "https://synclune.fr",
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
  const wishlistIdsPromise = getWishlistProductIds();

  return (
    <>
      {/* JSON-LD schemas: LocalBusiness, Organization, WebSite, Founder, Article */}
      <Suspense>
        <StructuredData reviewStatsPromise={reviewStatsPromise} />
      </Suspense>

      {/* 1. Hero - Attention capture + rotating tagline */}
      <HeroSection />

      {/* 2. Value Proposition Bar - Synclune brand pillars */}
      <ValuePropositionBar />

      {/* 3. Curated Picks - Leane's handpicked favorites */}
      <Suspense fallback={<CuratedPicksSkeleton productsCount={4} />}>
        <CuratedPicks
          productsPromise={getProducts(
            {
              perPage: 4,
              sortBy: "created-descending",
              filters: {
                status: "PUBLIC",
                slugs: CURATED_PICKS_SLUGS,
              },
            },
            { isAdmin: false },
          )}
          wishlistProductIdsPromise={wishlistIdsPromise}
        />
      </Suspense>

      {/* 4. Latest Creations - 4 most recent products */}
      <Suspense fallback={<LatestCreationsSkeleton productsCount={4} />}>
        <LatestCreations
          productsPromise={getProducts(
            {
              perPage: 4,
              sortBy: "created-descending",
              filters: {
                status: "PUBLIC",
              },
            },
            { isAdmin: false },
          )}
          wishlistProductIdsPromise={wishlistIdsPromise}
        />
      </Suspense>

      {/* 5. Collections - Thematic browsing with descriptions */}
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

      {/* 6. Atelier Story - Personal storytelling with polaroid gallery */}
      <AtelierStory />

      {/* 7. Creative Process - Step-by-step jewelry making */}
      <CreativeProcess />

      {/* 8. FAQ - Frequently asked questions with JSON-LD */}
      <FaqSection />

      {/* 9. Newsletter - Subscription with gift incentive */}
      <NewsletterSection />
    </>
  );
}
