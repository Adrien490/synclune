import { cn } from "@/shared/utils/cn";

interface HeroGradientWordProps {
	/** Word to render with the multicolor gradient */
	children: React.ReactNode;
	/** Additional classes for the gradient span */
	className?: string;
}

/**
 * Hero accent word painted with a multicolor gradient (rose → violet → mint).
 *
 * Server Component — no client JS. The real text stays in the DOM, so the h1
 * ("Des bijoux colorés") is fully present in the initial SSR HTML (good LCP)
 * and unchanged for screen readers / SEO.
 *
 * The gradient lives in the `.text-gradient-multicolor` utility (app/styles/utilities.css),
 * whose stops come from the brand tokens `--gradient-hero-*` (globals.css). The diagonal gradient
 * is a closed loop (rose→violet→mint→violet→rose) so the ambient shimmer flows continuously
 * (`infinite`, no visible rewind). A brand-tinted `drop-shadow` glow lifts the word off the soft
 * hero background. The utility also carries `forced-colors` / `prefers-contrast: more` fallbacks to
 * a solid brand color (glow dropped), and disables the shimmer under `prefers-reduced-motion`.
 *
 * Font weight is inherited from the parent title (`SectionTitle weight="light"`); this component
 * only owns the gradient paint, so it stays reusable at any weight.
 */
export function HeroGradientWord({ children, className }: HeroGradientWordProps) {
	return <span className={cn("text-gradient-multicolor inline-block", className)}>{children}</span>;
}
