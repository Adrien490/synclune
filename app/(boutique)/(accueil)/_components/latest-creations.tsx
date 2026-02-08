import { Fade, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import Link from "next/link";
import { use } from "react";

interface LatestCreationsProps {
  productsPromise: Promise<GetProductsReturn>;
  wishlistProductIdsPromise: Promise<Set<string>>;
}

/**
 * Latest Creations section - Grid of most recent jewelry.
 *
 * Accepts a Promise for streaming with React Suspense.
 */
export function LatestCreations({
  productsPromise,
  wishlistProductIdsPromise,
}: LatestCreationsProps) {
  const { products } = use(productsPromise);
  const wishlistProductIds = use(wishlistProductIdsPromise);

  // Don't render section with no products
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      id="latest-creations"
      className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
      aria-labelledby="latest-creations-title"
      aria-describedby="latest-creations-subtitle"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Baymard UX: Full scope labels - "Nouveaux bijoux" au lieu de "Nouveautés" */}
        <header className="mb-8 text-center lg:mb-12">
          <Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
            <SectionTitle id="latest-creations-title">
              Nouvelles créations
            </SectionTitle>
          </Fade>
          <Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
            <p
              id="latest-creations-subtitle"
              className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
            >
              Tout juste sorties de l'atelier et réalisées avec amour !
            </p>
          </Fade>
        </header>
        <Stagger
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12"
          stagger={MOTION_CONFIG.section.grid.stagger}
          y={MOTION_CONFIG.section.grid.y}
          inView
          once={true}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              isInWishlist={wishlistProductIds.has(product.id)}
              sectionId="latest"
            />
          ))}
        </Stagger>
        <Fade
          y={MOTION_CONFIG.section.cta.y}
          delay={MOTION_CONFIG.section.cta.delay}
          duration={MOTION_CONFIG.section.cta.duration}
          inView
          once
          className="text-center"
        >
          <Button
            asChild
            size="lg"
            variant="outline"
            className="hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
            aria-describedby="latest-creations-cta-description"
          >
            <Link href="/produits?sortBy=created-descending">
              Voir tous les nouveaux bijoux
            </Link>
          </Button>
          <span id="latest-creations-cta-description" className="sr-only">
            Découvrir tous les bijoux récemment créés dans la boutique Synclune
          </span>
        </Fade>
      </div>
    </section>
  );
}
