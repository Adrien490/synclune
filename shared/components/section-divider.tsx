import { cn } from "@/shared/utils/cn";

type DividerVariant = "wave" | "wave-gentle" | "curve";

interface SectionDividerProps {
	/** Variante de la forme */
	variant?: DividerVariant;
	/** Couleur de remplissage (défaut: background) */
	fillColor?: string;
	/** Inverser le divider (pour bas de section) */
	flip?: boolean;
	/** Hauteur en pixels */
	height?: number;
	className?: string;
}

const paths: Record<DividerVariant, string> = {
	// Vague douce standard
	wave: "M0,32 C200,80 400,0 600,48 C800,96 1000,16 1200,64 L1200,120 L0,120 Z",
	// Vague très douce
	"wave-gentle": "M0,64 C300,96 600,32 900,64 C1050,80 1150,48 1200,56 L1200,120 L0,120 Z",
	// Simple courbe
	curve: "M0,80 Q600,0 1200,80 L1200,120 L0,120 Z",
};

const SPARKLE_PATH =
	"M12 2L13.09 8.26L18 6L14.74 11.09L21 12L14.74 12.91L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 12.91L3 12L9.26 11.09L6 6L10.91 8.26L12 2Z";

/**
 * Séparateur de section avec forme SVG ondulée.
 * Crée une transition fluide entre sections.
 *
 * @example
 * ```tsx
 * // En bas d'une section
 * <section className="bg-muted relative">
 *   <div>Content...</div>
 *   <SectionDivider fillColor="var(--background)" />
 * </section>
 *
 * // En haut d'une section (inversé)
 * <section className="bg-background relative">
 *   <SectionDivider flip fillColor="var(--muted)" className="absolute top-0" />
 *   <div>Content...</div>
 * </section>
 * ```
 */
export function SectionDivider({
	variant = "wave",
	fillColor = "var(--background)",
	flip = false,
	height = 60,
	className,
}: SectionDividerProps) {
	return (
		<div
			className={cn(
				"w-full overflow-hidden leading-none pointer-events-none",
				flip && "rotate-180",
				className
			)}
			aria-hidden="true"
			role="presentation"
		>
			<svg
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
				className="w-full block"
				style={{ height }}
			>
				<path
					d={paths[variant]}
					fill={fillColor}
					className="transition-colors duration-300"
				/>
			</svg>
		</div>
	);
}

function SparkleIcon({ size, className }: { size: number; className?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			className={className}
		>
			<path d={SPARKLE_PATH} fill="currentColor" />
		</svg>
	);
}

/**
 * Séparateur décoratif avec sparkles et gradient.
 * Pour transitions plus festives/girly.
 */
export function SparklesDivider({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex justify-center items-center gap-2 py-8",
				className
			)}
			aria-hidden="true"
			role="presentation"
		>
			<div className="h-px w-16 bg-linear-to-r from-transparent to-primary/30" />
			<SparkleIcon size={20} className="text-primary/60" />
			<div className="h-px w-24 bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30" />
			<SparkleIcon size={24} className="text-secondary" />
			<div className="h-px w-24 bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30" />
			<SparkleIcon size={20} className="text-primary/60" />
			<div className="h-px w-16 bg-linear-to-l from-transparent to-primary/30" />
		</div>
	);
}
