import { cn } from "@/shared/utils/cn";

interface DecorativeHaloProps {
	/**
	 * Taille du halo principal
	 */
	size?: "sm" | "md" | "lg" | "xl";
	/**
	 * Variante de couleur
	 */
	variant?: "rose" | "gold" | "mixed";
	/**
	 * Position du halo (pour les particules autour)
	 */
	position?:
		| "top-left"
		| "top-right"
		| "bottom-left"
		| "bottom-right"
		| "custom";
	/**
	 * Classe CSS personnalisée pour la position
	 */
	className?: string;
	/**
	 * Intensité du blur
	 */
	blur?: "sm" | "md" | "lg" | "xl";
	/**
	 * Opacité
	 */
	opacity?: "light" | "medium" | "strong";
	/**
	 * Animation
	 */
	animate?: "float" | "pulse" | "none";
	/**
	 * Délai d'animation (en secondes)
	 */
	animationDelay?: number;
}

const sizeClasses = {
	sm: "w-6 h-6",
	md: "w-8 h-8",
	lg: "w-12 h-12",
	xl: "w-16 h-16",
};

const variantClasses = {
	rose: "bg-[color:var(--rose-300)]",
	gold: "bg-[color:var(--gold-400)]",
	mixed: "from-[color:var(--rose-300)] to-[color:var(--gold-400)]",
};

const positionClasses = {
	"top-left": "-top-4 -left-4",
	"top-right": "-top-4 -right-4",
	"bottom-left": "-bottom-4 -left-4",
	"bottom-right": "-bottom-4 -right-4",
	custom: "",
};

const blurClasses = {
	sm: "blur-sm",
	md: "blur-md",
	lg: "blur-lg",
	xl: "blur-xl",
};

const opacityClasses = {
	light: "opacity-30",
	medium: "opacity-50",
	strong: "opacity-70",
};

const animationClasses = {
	float: "animate-float",
	pulse: "animate-pulse",
	none: "",
};

export function DecorativeHalo({
	size = "md",
	variant = "mixed",
	position = "custom",
	className = "",
	blur = "sm",
	opacity = "medium",
	animate = "float",
	animationDelay = 0,
}: DecorativeHaloProps) {
	const style =
		animationDelay > 0
			? {
					animationDelay: `${animationDelay}s`,
				}
			: undefined;

	return (
		<div
			className={cn(
				"absolute rounded-full",
				sizeClasses[size],
				variantClasses[variant],
				position !== "custom" && positionClasses[position],
				blurClasses[blur],
				opacityClasses[opacity],
				animationClasses[animate],
				className
			)}
			style={style}
			aria-hidden="true"
		/>
	);
}

/**
 * Composant pour créer un groupe de halos décoratifs autour d'un élément
 */
interface DecorativeHaloGroupProps {
	/**
	 * Container className
	 */
	className?: string;
	/**
	 * Variante de couleurs pour le groupe
	 */
	variant?: "rose" | "gold" | "mixed";
	/**
	 * Densité des halos (nombre d'éléments)
	 */
	density?: "light" | "medium" | "heavy";
	/**
	 * Taille des halos
	 */
	size?: "sm" | "md" | "lg";
}

const densityConfigs = {
	light: [
		{ position: "top-right" as const, variant: "rose" as const, delay: 0 },
		{ position: "bottom-left" as const, variant: "gold" as const, delay: 2 },
	],
	medium: [
		{ position: "top-right" as const, variant: "rose" as const, delay: 0 },
		{ position: "bottom-left" as const, variant: "gold" as const, delay: 2 },
		{ position: "top-left" as const, variant: "mixed" as const, delay: 4 },
	],
	heavy: [
		{ position: "top-right" as const, variant: "rose" as const, delay: 0 },
		{ position: "bottom-left" as const, variant: "gold" as const, delay: 2 },
		{ position: "top-left" as const, variant: "mixed" as const, delay: 4 },
		{ position: "bottom-right" as const, variant: "rose" as const, delay: 6 },
	],
};

export function DecorativeHaloGroup({
	className = "",
	variant = "mixed",
	density = "medium",
	size = "md",
}: DecorativeHaloGroupProps) {
	const halos = densityConfigs[density];

	return (
		<div className={cn("relative", className)} aria-hidden="true">
			{halos.map((halo, index) => (
				<DecorativeHalo
					key={index}
					position={halo.position}
					variant={variant === "mixed" ? halo.variant : variant}
					size={size}
					animationDelay={halo.delay}
					animate="float"
				/>
			))}
		</div>
	);
}
