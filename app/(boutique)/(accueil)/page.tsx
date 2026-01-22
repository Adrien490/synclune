import { CollectionsSection } from "@/app/(boutique)/(accueil)/_components/collections-section";
import { CuratedPicks } from "@/app/(boutique)/(accueil)/_components/curated-picks";
import { CuratedPicksSkeleton } from "@/app/(boutique)/(accueil)/_components/curated-picks-skeleton";
import { LatestCreations } from "@/app/(boutique)/(accueil)/_components/latest-creations";
import { LatestCreationsSkeleton } from "@/app/(boutique)/(accueil)/_components/latest-creations-skeleton";
import { ValuePropositionBar } from "@/app/(boutique)/(accueil)/_components/value-proposition-bar";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { NewsletterSection } from "@/modules/newsletter/components/newsletter-section";
import { getProducts } from "@/modules/products/data/get-products";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { StructuredData } from "@/shared/components/structured-data";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AtelierStory } from "./_components/atelier-story";
import { CreativeProcess } from "./_components/creative-process";
import { HeroSection } from "./_components/hero-section";

// Slugs des produits "Coups de coeur" de Léane (à modifier depuis l'admin plus tard)
const CURATED_PICKS_SLUGS = [
  "boucles-fleurs-roses",
  "collier-papillon-bleu",
  "bracelet-perles-multicolores",
  "bague-coeur-dore",
];

// Lazy load Client Components below the fold
const FaqSection = dynamic(
  () => import("./_components/faq-section").then((mod) => mod.FaqSection),
  { ssr: true }, // Garder SSR pour le JSON-LD SEO
);

export const metadata: Metadata = {
  title: {
    absolute: "Synclune | Bijoux artisanaux faits main à Nantes",
  },
  description:
    "Bijoux artisanaux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets uniques. Créatrice Loire-Atlantique.",
  keywords:
    "bijoux artisanaux Nantes, bijoux faits main Nantes, créatrice bijoux Nantes, bagues Nantes, colliers Nantes, boucles d'oreilles Nantes, bracelets Nantes, bijoux colorés Loire-Atlantique. atelier bijoux Nantes 44",
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
  // Fetch les stats d'avis pour les schemas SEO
  const reviewStats = await getGlobalReviewStats();
  // Promise pour le streaming des wishlist IDs
  const wishlistIdsPromise = getWishlistProductIds();

  return (
    <>
      {/* Schemas JSON-LD pour SEO (LocalBusiness, Organization, WebSite, Founder) */}
      <StructuredData reviewStats={reviewStats} />

      {/* 1. Hero - Capture d'attention + Tagline rotative */}
      <HeroSection />

      {/* 2. Value Proposition Bar - L'ADN Synclune (fait main, Nantes, couleurs, amour) */}
      <ValuePropositionBar />

      {/* 3. Coups de Coeur de Léane - Sélection curée (storytelling > data) */}
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

      {/* 4. Latest Creations - Nouveautés: 8 dernières créations */}
      <Suspense fallback={<LatestCreationsSkeleton productsCount={8} />}>
        <LatestCreations
          productsPromise={getProducts(
            {
              perPage: 8,
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

      {/* 5. Collections - Exploration thématique avec descriptions et badge "Nouvelle" */}
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

      {/* 6. AtelierStory - Storytelling intimiste de Léane avec galerie de 4 polaroids */}
      <AtelierStory />

      {/* 7. CreativeProcess - Processus créatif détaillé avec durées et matériaux */}
      <CreativeProcess />

      {/* 8. FAQ - Questions fréquentes personnalisées (je/tu) + CTA contact */}
      <FaqSection />

      {/* 9. Newsletter - Version storytelling avec incentive cadeau */}
      <NewsletterSection />
    </>
  );
}
