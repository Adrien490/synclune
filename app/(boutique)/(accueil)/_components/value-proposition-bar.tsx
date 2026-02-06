import { Fade, Stagger } from "@/shared/components/animations";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { Heart, MapPin, Paintbrush, Sparkles } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";

interface ValuePillar {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** Colored glow on hover */
  glowClass: string;
}

const valuePillars: ValuePillar[] = [
  {
    icon: <Paintbrush className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
    title: "Fait main",
    subtitle: "Chaque pièce est unique !",
    glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-pink)]",
  },
  {
    icon: <MapPin className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
    title: "Créé à Nantes",
    subtitle: "Dans mon petit atelier",
    glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-lavender)]",
  },
  {
    icon: <Sparkles className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
    title: "De la couleur",
    subtitle: "Et de l'originalité !",
    glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-mint)]",
  },
  {
    icon: <Heart className="w-6 h-6 lg:w-7 lg:h-7" aria-hidden="true" />,
    title: "Avec amour",
    subtitle: "Pour vous ou vos proches !",
    glowClass: "group-hover:shadow-[0_0_25px_var(--color-glow-yellow)]",
  },
];

/**
 * Value Proposition Bar - Synclune brand pillars.
 *
 * 4 pillars: Handmade, Made in Nantes, Colorful, With love.
 * Responsive: 2x2 grid on mobile, 4 columns on desktop.
 */
export async function ValuePropositionBar() {
  "use cache";
  cacheLife("reference");
  cacheTag("value-proposition-bar");

  return (
    <Fade y={10} duration={0.6}>
      <section
        id="value-proposition"
        aria-labelledby="value-proposition-title"
        itemScope
        itemType="https://schema.org/ItemList"
        data-voice-queries="bijoux faits main Nantes,artisan bijoutier Nantes,bijoux colorés artisanaux"
        data-content-type="brand-values"
        data-ai-category="unique-selling-points"
        className={`relative overflow-hidden ${SECTION_SPACING.compact} bg-muted/30`}
      >
        {/* Microdata for SEO */}
        <meta itemProp="name" content="Les valeurs Synclune" />
        <meta itemProp="numberOfItems" content="4" />

        {/* Visually hidden accessible title */}
        <h2 id="value-proposition-title" className="sr-only">
          Les valeurs Synclune : bijoux artisanaux faits main à Nantes
        </h2>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Stagger
            stagger={0.1}
            y={15}
            inView
            once
            role="list"
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {valuePillars.map((pillar, index) => (
              <div
                key={pillar.title}
                role="listitem"
                aria-label={pillar.title}
                itemScope
                itemType="https://schema.org/ListItem"
                itemProp="itemListElement"
                className="group flex flex-col items-center text-center gap-3 p-4 rounded-xl motion-safe:transition-all motion-safe:duration-300 hover:bg-card/80 active:scale-[0.98] active:bg-card/90"
              >
                <meta itemProp="position" content={String(index + 1)} />

                {/* Icon with hover animation + colored glow */}
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-card shadow-sm motion-safe:transition-all motion-safe:duration-300",
                    "border border-border/30 text-foreground/70",
                    "group-hover:scale-110 group-hover:text-foreground",
                    pillar.glowClass,
                  )}
                >
                  {pillar.icon}
                </div>

                {/* Text */}
                <div className="space-y-1">
                  <h3
                    itemProp="name"
                    className="font-semibold text-foreground text-sm sm:text-base tracking-tight"
                  >
                    {pillar.title}
                  </h3>
                  <p
                    itemProp="description"
                    className="text-sm text-muted-foreground leading-snug line-clamp-2"
                  >
                    {pillar.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
      </section>
    </Fade>
  );
}
