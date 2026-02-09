import { ScrollIndicator } from "@/shared/components/animations";
import { DesktopParticles } from "./desktop-particles";
import { HeroFloatingImages } from "./hero";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { LayoutTextFlip } from "@/shared/components/ui/layout-text-flip";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { extractHeroImages } from "../_utils/extract-hero-images";
import { Heart } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface HeroSectionProps {
  productsPromise: Promise<GetProductsReturn>;
}

/**
 * Homepage hero section.
 *
 * Displays rotating tagline, floating product images on desktop,
 * and particle background. Products come from the shared latest
 * creations fetch (no extra query).
 */
export function HeroSection({ productsPromise }: HeroSectionProps) {
  const { products } = use(productsPromise);
  const heroImages = extractHeroImages(products);

  return (
    <section
      id="hero-section"
      role="region"
      aria-labelledby="hero-title"
      aria-describedby="hero-subtitle"
      className="relative min-h-[calc(85dvh-4rem)] sm:min-h-[calc(90dvh-5rem)] lg:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%"
    >
      {/* Particle background - Desktop only (lazy loaded to save ~30KB on mobile) */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0">
          <DesktopParticles />
        </div>
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Floating product images - Desktop only, between particles and text */}
      <HeroFloatingImages images={heroImages} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl 2xl:max-w-7xl relative z-10">
        <div className="flex flex-col items-center">
          {/* Centered content */}
          <div className="space-y-5 sm:space-y-7 md:space-y-10 flex flex-col items-center">
            {/* Main title - Immediate render for LCP */}
            <div className="space-y-4 sm:space-y-6 text-center w-full">
              <SectionTitle
                as="h1"
                size="hero"
                align="center"
                weight="normal"
                id="hero-title"
                className="text-foreground"
                itemProp="headline"
              >
                <LayoutTextFlip
                  text="Des bijoux"
                  words={["colorés", "uniques", "joyeux"]}
                  duration={2000}
                />
              </SectionTitle>
              <p
                id="hero-subtitle"
                className="text-lg/7 sm:text-xl/8 md:text-2xl/9 2xl:text-3xl/10 text-foreground font-normal tracking-tight antialiased max-w-2xl 2xl:max-w-3xl mx-auto"
              >
                <span className="sm:hidden">
                  Faits main pour sublimer votre quotidien{" "}
                </span>
                <span className="hidden sm:inline">
                  Créés à la main pour des occasions particulières, ou pour
                  sublimer votre quotidien{" "}
                </span>
                <Heart
                  size={22}
                  fill="currentColor"
                  className="text-primary inline align-middle"
                  aria-label="coeur"
                />
              </p>
            </div>

            {/* CTA - Immediate render for LCP */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="shadow-lg font-semibold w-full sm:w-auto"
              >
                <Link
                  href="/produits"
                  className="flex items-center justify-center"
                >
                  Découvrir la boutique !
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="shadow-md font-semibold w-full sm:w-auto"
              >
                <Link
                  href="/personnalisation"
                  className="flex items-center justify-center"
                >
                  Personnalisation
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator
        targetIds={[
          "value-proposition",
          "latest-creations",
          "collections",
        ]}
        ariaLabel="Voir la suite"
        className="hidden sm:block"
      />
    </section>
  );
}
