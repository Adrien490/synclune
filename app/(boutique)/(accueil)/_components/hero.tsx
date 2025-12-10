import { Fade, Slide } from "@/shared/components/animations";
import { GlitterSparkles } from "@/shared/components/animations/glitter-sparkles";
import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { BRAND } from "@/shared/constants/brand";
import { Heart } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section
      id="main-content"
      aria-labelledby="hero-title"
      className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex items-center overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%"
      itemScope
      itemType="https://schema.org/WebPageElement"
      itemProp="mainContentOfPage"
    >

      {/* Couche 1: Particules décoratives */}
      <ParticleSystem
        count={8}
        shape="circle"
        colors={[
          "var(--primary)",
          "var(--secondary)",
          "oklch(0.92 0.08 350)", // Blush pastel
        ]}
        opacity={[0.15, 0.35]}
        blur={[15, 40]}
        size={[30, 100]}
      />

      {/* Couche 2: Glitter Sparkles (overlay scintillant) - Allégé pour performance mobile */}
      <GlitterSparkles sizeRange={[2, 4]} glowIntensity={0.4} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        <div className="flex flex-col items-center">
          {/* Contenu centré */}
          <div className="space-y-5 sm:space-y-7 md:space-y-10 flex flex-col items-center">
            {/* Titre principal */}
            <div className="space-y-4 sm:space-y-6 text-center w-full">
              <Fade y={12} duration={0.6}>
                <SectionTitle
                  as="h1"
                  size="hero"
                  align="center"
                  weight="light"
                  id="hero-title"
                  className="text-foreground"
                  itemProp="headline"
                >
                  Des bijoux colorés
                </SectionTitle>
              </Fade>
              <Fade y={8} delay={0.15} duration={0.5}>
                <p className="text-lg/7 sm:text-xl/8 md:text-2xl/9 text-foreground font-light tracking-tight antialiased max-w-2xl mx-auto">
                  <span className="sm:hidden">
                    Faits main pour sublimer votre quotidien{" "}
                  </span>
                  <span className="hidden sm:inline">
                    Crées à la main pour des occasions particulières, ou pour sublimer votre quotidien{" "}
                  </span>
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

            {/* CTA optimisés - Plus visibles et engageants */}
            <Slide direction="up" distance={20} delay={0.3} duration={0.45}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="shadow-lg font-semibold w-full sm:w-auto"
                >
                  <Link
                    href="/produits"
                    aria-label="Découvrir mes créations de bijoux artisanaux colorés"
                    className="flex items-center justify-center"
                  >
                    Découvrir la boutique
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
                    aria-label="Créer un bijou personnalisé sur-mesure - Contact gratuit"
                    className="flex items-center justify-center"
                  >
                    <span className="sm:hidden">Personnalisation</span>
                    <span className="hidden sm:inline">Je veux un bijou personnalisé</span>
                  </Link>
                </Button>
              </div>
            </Slide>

            {/* Réseaux sociaux - Version compacte */}
            <Fade y={8} delay={0.5} duration={0.4}>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Suivez-moi :
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={BRAND.social.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center size-11 rounded-full bg-card/50 hover:bg-primary/10 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Suivre Synclune sur Instagram"
                  >
                    <InstagramIcon decorative size={20} className="text-foreground" />
                  </Link>
                  <Link
                    href={BRAND.social.tiktok.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center size-11 rounded-full bg-card/50 hover:bg-primary/10 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Suivre Synclune sur TikTok"
                  >
                    <TikTokIcon decorative size={20} className="text-foreground" />
                  </Link>
                </div>
              </div>
            </Fade>
          </div>
        </div>
      </div>
    </section>
  );
}
