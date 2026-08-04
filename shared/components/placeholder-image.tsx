import { ImageIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";

/**
 * Placeholder esthetique avec gradient pour les photos en attente
 * @param className - Classes additionnelles (aspect, rounding, etc.)
 * @param label - Label accessible pour les lecteurs d'ecran
 * @param preserveAspect - Si true, retire aspect-square par defaut pour laisser un aspect parent prendre effet sans conflit Tailwind (anti-CLS)
 */
export function PlaceholderImage({
	className,
	label,
	preserveAspect = false,
}: {
	className?: string;
	label?: string;
	preserveAspect?: boolean;
}) {
	return (
		<div
			className={cn(
				"from-secondary/40 via-muted/50 to-primary/30 border-border/30 relative flex items-center justify-center overflow-hidden rounded-xl border bg-linear-to-br transition-opacity duration-500",
				!preserveAspect && "aspect-square",
				className,
			)}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<ImageIcon className="text-muted-foreground/60 size-12" aria-hidden="true" />
		</div>
	);
}
