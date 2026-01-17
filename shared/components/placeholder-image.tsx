import { ImageIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Placeholder esthetique avec gradient pour les photos en attente
 * Ameliore : gradient plus visible, icone centrale, bordure subtile
 * @param className - Classes additionnelles pour aspect ratio responsive
 * @param label - Label accessible pour les lecteurs d'ecran (si fourni, le placeholder est annonce)
 */
export function PlaceholderImage({
	className,
	label,
}: {
	className?: string;
	label?: string;
}) {
	return (
		<div
			className={cn(
				"relative rounded-xl overflow-hidden bg-linear-to-br from-secondary/40 via-muted/50 to-primary/30 border border-border/30 flex items-center justify-center transition-opacity duration-500 aspect-square",
				className
			)}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<ImageIcon className="w-12 h-12 text-muted-foreground/60" aria-hidden="true" />
		</div>
	);
}
