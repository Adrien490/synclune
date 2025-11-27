import { Fade, Slide } from "@/shared/components/animations";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Button } from "@/shared/components/ui/button";

import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { LiquidGradient } from "@/shared/components/animations/liquid-gradient";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { BRAND } from "@/shared/constants/brand";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCarousel } from "@/modules/products/components/product-carousel";
import { ProductCarouselSkeleton } from "@/modules/products/components/product-carousel-skeleton";

export async function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative min-h-[calc(100vh-4rem)] sm:min-h-screen flex items-center overflow-hidden pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-20 md:pb-28"
      itemScope
      itemType="https://schema.org/WebPageElement"
      itemProp="mainContentOfPage"
    >
      {/* Fond avec gradient pastel doux */}
      <div className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20" />

      {/* Couche 1: Liquid Gradient (base fluide) - Optimisé mobile & desktop */}
      <LiquidGradient intensity={0.15} speed={1} />

      {/* Couche 2: Glitter Sparkles (overlay scintillant) - Auto-adaptatif: 50 desktop / 20 mobile */}
      <GlitterSparkles sizeRange={[2, 6]} glowIntensity={0.8} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Contenu à gauche */}
          <div className="space-y-6 sm:space-y-8 md:space-y-10 flex flex-col items-center lg:items-start">
            {/* Titre principal */}
            <div className="space-y-4 sm:space-y-6 text-center lg:text-left w-full">
              <Fade y={12} duration={0.6}>
                <SectionTitle
                  as="h1"
                  size="hero"
                  align="center"
                  weight="light"
                  id="hero-title"
                  className="text-foreground lg:text-left"
                  itemProp="headline"
                >
                  Des bijoux à ton image
                </SectionTitle>
              </Fade>
              <Fade y={8} delay={0.2} duration={0.6}>
                <p className="text-lg/7 sm:text-xl/8 md:text-2xl/9 text-foreground font-light tracking-tight antialiased max-w-2xl mx-auto lg:mx-0">
                  Je transforme tes passions en bijoux colorés que tu ne
                  trouveras nulle part ailleurs{" "}
                  <span role="img" aria-label="coeur">
                    <Heart
                      size={22}
                      fill="currentColor"
                      className="text-primary inline align-middle"
                      aria-hidden="true"
                    />
                  </span>
                </p>
              </Fade>
            </div>

            {/* CTA optimisés - Boutique en primaire (conversion e-commerce), Personnalisation en secondaire */}
            <Slide direction="up" distance={20} delay={0.4} duration={0.5}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="shadow-xl hover:shadow-2xl transition-all duration-300 ease-out font-semibold w-full sm:w-auto"
                >
                  <Link
                    href="/produits"
                    aria-label="Découvrir mes créations de bijoux artisanaux colorés"
                    className="flex items-center justify-center"
                  >
                    Découvrir mes créations
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="shadow-lg hover:shadow-2xl transition-all duration-300 ease-out font-semibold w-full sm:w-auto"
                >
                  <Link
                    href="/personnalisation"
                    aria-label="Créer un bijou personnalisé sur-mesure - Contact gratuit"
                    className="flex items-center justify-center"
                  >
                    Création sur-mesure
                  </Link>
                </Button>
              </div>
            </Slide>

            {/* Réseaux sociaux */}
            <Fade y={8} delay={0.6} duration={0.5}>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full">
                <p className="text-sm text-muted-foreground">Mes réseaux :</p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <Link
                    href={BRAND.social.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Suivre Synclune sur Instagram"
                  >
                    <InstagramIcon
                      decorative
                      size={20}
                      className="text-foreground"
                    />
                    <span className="text-sm font-medium">
                      {BRAND.social.instagram.handle}
                    </span>
                  </Link>
                  <Link
                    href={BRAND.social.tiktok.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Suivre Synclune sur TikTok"
                  >
                    <TikTokIcon
                      decorative
                      size={20}
                      className="text-foreground"
                    />
                    <span className="text-sm font-medium">
                      {BRAND.social.tiktok.handle}
                    </span>
                  </Link>
                </div>
              </div>
            </Fade>
          </div>

          {/* Carousel de bijoux à droite */}
          <Fade y={20} delay={0.3} duration={0.7}>
            <Suspense fallback={<ProductCarouselSkeleton />}>
              <ProductCarousel />
            </Suspense>
          </Fade>
        </div>
      </div>

      {/* Mask bottom pour transition douce vers About */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
