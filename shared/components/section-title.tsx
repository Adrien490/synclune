import { cn } from "@/shared/utils/cn";
import type { SectionTitleProps } from "@/shared/types/component.types";

const sizeVariants = {
	hero: "text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-wider",
	default: "text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-wide",
	small: "text-2xl sm:text-3xl lg:text-3xl leading-normal tracking-wide",
} as const;

const alignVariants = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
} as const;

const weightVariants = {
	light: "font-light",
	normal: "font-normal",
	medium: "font-medium",
	semibold: "font-semibold",
} as const;

/**
 * Composant de titre de section unifié pour l'application Synclune
 *
 * Style cohérent avec:
 * - Font display (Fraunces - serif artisanale), jamais uppercase
 * - Graisse paramétrable (`weight`, défaut `light`) — les h2 de la home
 *   passent `normal` via SectionHeader pour contraster avec le h1 hero light
 * - Italique optionnel (prop `italic`), tracking par taille (wide/wider)
 * - Progression responsive harmonisée
 * - Couleur foreground du thème
 *
 * @example
 * ```tsx
 * <SectionTitle id="collections-title">
 *   Collections Phares
 * </SectionTitle>
 *
 * <SectionTitle as="h1" size="hero" align="center">
 *   Synclune
 * </SectionTitle>
 *
 * <SectionTitle size="small" align="left" italic>
 *   Nos services
 * </SectionTitle>
 * ```
 */
export function SectionTitle({
	children,
	id,
	className,
	as: Component = "h2",
	size = "default",
	align = "center",
	weight = "light",
	italic = false,
	itemProp,
}: SectionTitleProps) {
	return (
		<Component
			id={id}
			itemProp={itemProp}
			className={cn(
				// Police Fraunces - Serif display artisanale
				"font-display",
				// Style de base unifié
				"text-foreground",
				// Graisse
				weightVariants[weight],
				// Italique optionnel
				italic && "italic",
				// Taille responsive
				sizeVariants[size],
				// Alignement
				alignVariants[align],
				// Classes personnalisées
				className,
			)}
		>
			{children}
		</Component>
	);
}
