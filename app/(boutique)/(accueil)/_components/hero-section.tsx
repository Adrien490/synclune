import { Fade, ParticleBackground, ScrollIndicator } from "@/shared/components/animations";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { LayoutTextFlip } from "@/shared/components/ui/layout-text-flip";
import { BRAND } from "@/shared/constants/brand";
import { Heart } from "lucide-react";
import Link from "next/link";

const socialLinkClassName = "inline-flex items-center justify-center size-11 rounded-full bg-card/50 hover:bg-accent motion-safe:transition-colors motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function HeroSection() {
  return (
    <section
      id="hero-section"
      role="region"
      aria-labelledby="hero-title"
      aria-describedby="hero-subtitle"
      className="relative min-h-[calc(85dvh-4rem)] sm:min-h-[calc(90dvh-5rem)] lg:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%"
    >
      {/* JSON-LD structured data pour SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Synclune",
            url: "https://synclune.fr",
            description: "Bijoux artisanaux faits main, colorés et uniques pour sublimer votre quotidien",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://synclune.fr/produits?search={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      {/* Background particules - Desktop uniquement */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="hidden md:block absolute inset-0">
          <ParticleBackground
            shape={["heart", "pearl"]}
            colors={[
              "var(--primary)",
              "var(--secondary)",
              "oklch(0.78 0.15 340)", // Rose vif
              "oklch(0.75 0.12 280)", // Lavande
              "oklch(0.82 0.14 160)", // Menthe
            ]}
            count={10}
            size={[40, 80]}
            opacity={[0.25, 0.45]}
            blur={[5, 14]}
            animationStyle="drift"
            depthParallax={true}
          />
        </div>
        <div className="absolute inset-0 bg-background/20" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl 2xl:max-w-7xl relative z-10">
        <div className="flex flex-col items-center">
          {/* Contenu centré */}
          <div className="space-y-5 sm:space-y-7 md:space-y-10 flex flex-col items-center">
            {/* Titre principal - Affichage immédiat pour LCP */}
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
                  duration={3000}
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
                  Créés à la main pour des occasions particulières, ou pour sublimer votre quotidien{" "}
                </span>
                <Heart
                  size={22}
                  fill="currentColor"
                  className="text-primary inline align-middle"
                  aria-label="coeur"
                />
              </p>
            </div>

            {/* CTA - Affichage immédiat pour LCP */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Button
                asChild
                size="lg"
                className="shadow-lg font-semibold w-full sm:w-auto"
              >
                <Link href="/produits" className="flex items-center justify-center">
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
                  className="flex items-center justify-center"
                >
                  <span className="sm:hidden">Personnalisation</span>
                  <span className="hidden sm:inline">Je veux un bijou personnalisé</span>
                </Link>
              </Button>
            </div>

            {/* Réseaux sociaux - Version compacte */}
            <Fade y={8} delay={0.5} duration={0.4}>
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Suivez-moi :
                </span>
                <div className="flex items-center gap-4">
                  <Link
                    href={BRAND.social.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialLinkClassName}
                    aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
                  >
                    <InstagramIcon decorative size={20} className="text-foreground" />
                  </Link>
                  <Link
                    href={BRAND.social.tiktok.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialLinkClassName}
                    aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
                  >
                    <TikTokIcon decorative size={20} className="text-foreground" />
                  </Link>
                </div>
              </div>
            </Fade>
          </div>
        </div>
      </div>

      {/* Indicateur de scroll */}
      <ScrollIndicator
        targetIds={["value-proposition", "coups-de-coeur", "latest-creations", "collections"]}
        ariaLabel="Voir la suite"
        className="hidden sm:block"
      />
    </section>
  );
}
