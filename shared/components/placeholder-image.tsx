import { ImageIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

/**
 * Placeholder esthetique avec gradient pour les photos en attente
 * Ameliore : gradient plus visible, icone centrale, bordure subtile
 * @param className - Classes additionnelles pour aspect ratio responsive
 * @param label - Label accessible pour les lecteurs d'ecran (si fourni, le placeholder est annonce)
 */
export function PlaceholderImage({ className, label }: { className?: string; label?: string }) {
	return (
		<div
			className={cn(
				"from-secondary/40 via-muted/50 to-primary/30 border-border/30 relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-linear-to-br transition-opacity duration-500",
				className,
			)}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<ImageIcon className="text-muted-foreground/60 h-12 w-12" aria-hidden="true" />
		</div>
	);
}
