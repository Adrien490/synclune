import { Fade, HandDrawnUnderline, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { SITE_URL } from "@/shared/constants/seo-config";
import Link from "next/link";
import { use } from "react";

interface LatestCreationsProps {
  productsPromise: Promise<GetProductsReturn>;
}

/**
 * Latest Creations section - Grid of most recent jewelry.
 *
 * Accepts a Promise for streaming with React Suspense.
 * Wishlist state is loaded client-side by WishlistButton to avoid
 * cookies() forcing dynamic rendering on the homepage.
 */
export function LatestCreations({
  productsPromise,
}: LatestCreationsProps) {
  const { products } = use(productsPromise);

  // Don't render section with no products
  if (products.length === 0) {
    return null;
  }

  // ItemList JSON-LD for latest creations (SEO rich snippets)
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const defaultSku = product.skus.find(s => s.isDefault) ?? product.skus[0];
      const primaryImage = defaultSku?.images.find(img => img.isPrimary) ?? defaultSku?.images[0];
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.title,
          url: `${SITE_URL}/creations/${product.slug}`,
          ...(primaryImage && { image: primaryImage.url }),
          ...(defaultSku && {
            offers: {
              "@type": "Offer",
              price: (defaultSku.priceInclTax / 100).toFixed(2),
              priceCurrency: "EUR",
              availability: defaultSku.inventory > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        },
      };
    }),
  };

  return (
    <section
      id="latest-creations"
      className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
      aria-labelledby="latest-creations-title"
      aria-describedby="latest-creations-subtitle"
    >
      {/* ItemList JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c"),
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Baymard UX: Full scope labels - "Nouveaux bijoux" au lieu de "Nouveautés" */}
        <header className="mb-8 text-center lg:mb-12">
          <Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
            <SectionTitle id="latest-creations-title">
              Nouvelles créations
            </SectionTitle>
            <HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
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
