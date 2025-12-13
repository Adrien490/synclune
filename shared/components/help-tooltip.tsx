import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface HelpTooltipProps {
	/**
	 * Contenu de l'aide (texte ou React node)
	 */
	content: React.ReactNode;

	/**
	 * Position du tooltip par rapport au trigger
	 * @default "top"
	 */
	side?: "top" | "right" | "bottom" | "left";

	/**
	 * Alignement du tooltip
	 * @default "center"
	 */
	align?: "start" | "center" | "end";

	/**
	 * Classe CSS personnalisée pour l'icône
	 */
	className?: string;

	/**
	 * Taille de l'icône
	 * @default "sm"
	 */
	size?: "sm" | "md" | "lg";
}

const iconSizes = {
	sm: "h-3.5 w-3.5",
	md: "h-4 w-4",
	lg: "h-5 w-5",
};

/**
 * Tooltip d'aide contextuel
 * Affiche une icône HelpCircle avec un tooltip au survol/focus
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Label>Prix</Label>
 *   <HelpTooltip content="Prix final" />
 * </div>
 * ```
 */
export function HelpTooltip({
	content,
	side = "top",
	align = "center",
	className,
	size = "sm",
}: HelpTooltipProps) {
	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger
					type="button"
					className={cn(
						"inline-flex items-center justify-center rounded-full",
						"text-muted-foreground hover:text-foreground",
						"transition-colors cursor-help",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
						className
					)}
					aria-label="Afficher l'aide"
					onClick={(e) => e.preventDefault()} // Prevent form submission
				>
					<HelpCircle className={cn(iconSizes[size])} aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent
					side={side}
					align={align}
					className="max-w-xs text-sm leading-relaxed"
				>
					{content}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
