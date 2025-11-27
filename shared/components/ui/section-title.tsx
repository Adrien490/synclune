import { crimsonPro } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { type ReactNode } from "react";

export interface SectionTitleProps {
	children: ReactNode;
	id?: string;
	className?: string;
	/**
	 * Niveau de titre sémantique
	 * @default "h2"
	 */
	as?: "h1" | "h2" | "h3";
	/**
	 * Variante de taille
	 * @default "default"
	 */
	size?: "hero" | "default" | "small";
	/**
	 * Alignement du texte
	 * @default "center"
	 */
	align?: "left" | "center" | "right";
	/**
	 * Graisse de la police
	 * @default "semibold"
	 */
	weight?: "light" | "normal" | "medium" | "semibold";
	/**
	 * Utiliser l'italique (Fraunces italic)
	 * @default false
	 */
	italic?: boolean;
	/**
	 * Schema.org itemProp attribute
	 */
	itemProp?: string;
}

const sizeVariants = {
	hero: "text-4xl sm:text-5xl lg:text-7xl leading-tight",
	default: "text-2xl sm:text-3xl lg:text-5xl leading-tight",
	small: "text-xl sm:text-2xl lg:text-3xl leading-normal",
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
 * - Font display (serif élégante)
 * - Italique + uppercase + tracking-wider
 * - Font-weight semibold
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
	weight = "semibold",
	italic = false,
	itemProp,
}: SectionTitleProps) {
	return (
		<Component
			id={id}
			itemProp={itemProp}
			className={cn(
				// Police Crimson Pro - Serif élégante
				crimsonPro.className,
				// Style de base unifié
				"text-foreground tracking-wide",
				// Graisse
				weightVariants[weight],
				// Italique optionnel
				italic && "italic",
				// Taille responsive
				sizeVariants[size],
				// Alignement
				alignVariants[align],
				// Classes personnalisées
				className
			)}
		>
			{children}
		</Component>
	);
}
