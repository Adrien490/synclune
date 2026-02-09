import { Fade, GlitterSparkles, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { cn } from "@/shared/utils/cn";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { dancingScript } from "@/shared/styles/fonts";
import { Sparkles } from "lucide-react";
import { NewsletterForm } from "@/modules/newsletter/components/newsletter-form";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Homepage newsletter section.
 *
 * Features personal storytelling headline, content preview,
 * gift incentive, and subtle GlitterSparkles background.
 */
export async function NewsletterSection() {
  "use cache";
  cacheLife("reference");
  cacheTag("newsletter-section");

  return (
    <section
      aria-labelledby="newsletter-title"
      aria-describedby="newsletter-subtitle"
      className={cn(
        "relative overflow-hidden bg-muted/20",
        "mask-t-from-90% mask-t-to-100% mask-b-from-90% mask-b-to-100%",
        SECTION_SPACING.section,
      )}
    >
      {/* Subtle animated background - hidden on mobile for performance */}
      <div className="hidden md:block absolute inset-0 pointer-events-none" aria-hidden="true">
        <GlitterSparkles count={12} sizeRange={[4, 8]} glowIntensity={0.6} />
      </div>

      <div className={cn("relative z-10", CONTAINER_CLASS)}>
        {/* Storytelling header */}
        <header className="mb-8 text-center lg:mb-12">
          <Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
            <SectionTitle id="newsletter-title">Ma newsletter</SectionTitle>
            <HandDrawnUnderline color="var(--secondary)" delay={0.3} className="mx-auto mt-2" />
          </Fade>
          <Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
            <p
              id="newsletter-subtitle"
              className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
            >
              Les nouveautés en avant-première, des offres exclusives et
              des surprises réservées aux abonnées !
            </p>
          </Fade>
        </header>

        {/* Centered form */}
        <Fade y={MOTION_CONFIG.section.cta.y} delay={0.2} duration={MOTION_CONFIG.section.title.duration}>
          <div className="max-w-md mx-auto">
            <NewsletterForm />
          </div>
        </Fade>

        {/* Anti-spam assurance + signature */}
        <Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              1 à 2 emails par mois maximum. Désinscription en un clic.
            </p>
            <p
              className={`${dancingScript.className} mt-2 text-lg text-foreground/70 italic`}
            >
              À très vite !
            </p>
          </div>
        </Fade>
      </div>
    </section>
  );
}
