"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { FilterDefinition, useFilter } from "@/shared/hooks/use-filter";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useRef } from "react";

interface FilterBadgeProps {
	filter: FilterDefinition;
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	filterOptions?: {
		filterPrefix?: string;
		preservePage?: boolean;
	};
}

export function FilterBadge({
	filter,
	formatFilter,
	filterOptions,
}: FilterBadgeProps) {
	const { removeFilter, isPending } = useFilter(filterOptions);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isMobile = useIsMobile();

	// Formater le filtre si une fonction est fournie
	const formatted = formatFilter?.(filter);

	// Si la fonction retourne null, ne pas afficher le badge
	if (formatted === null) {
		return null;
	}

	const displayLabel = formatted?.label || filter.label;
	const displayValue = formatted?.displayValue || filter.displayValue;
	const ariaLabel = `Supprimer le filtre ${displayLabel}${displayValue ? ` ${displayValue}` : ""}`;

	// Gérer le focus après suppression
	const handleRemove = () => {
		// Trouver le prochain élément focusable
		const parent = buttonRef.current?.closest('[role="region"]');
		const allButtons = parent?.querySelectorAll(
			"button:not([disabled])"
		) as NodeListOf<HTMLButtonElement>;
		const currentIndex = buttonRef.current
			? Array.from(allButtons || []).indexOf(buttonRef.current)
			: -1;
		const nextButton =
			allButtons?.[currentIndex + 1] || allButtons?.[currentIndex - 1];

		removeFilter(filter.key, filter.value as string);

		// Focus sur le prochain badge ou le bouton "Tout effacer"
		if (nextButton) {
			setTimeout(() => nextButton.focus(), 200);
		}
	};

	// Handler pour le clic sur le badge (mobile uniquement)
	const handleBadgeClick = () => {
		if (isMobile && !isPending) {
			handleRemove();
		}
	};

	return (
		<motion.div
			layoutId={filter.id}
			initial={{ opacity: 0, scale: 0.92 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.92 }}
			transition={{
				duration: 0.15,
				ease: [0.25, 0.1, 0.25, 1],
				layout: { type: "spring", stiffness: 500, damping: 35 },
			}}
		>
			<Badge
				variant="outline"
				className={cn(
					// Layout
					"flex items-center gap-1.5",
					"h-9 sm:h-8",
					"pl-3 pr-1.5 sm:pr-2",
					// Forme pill cohérente
					"rounded-full",
					// Typographie
					"text-sm font-medium",
					// Largeur max
					"max-w-[280px] sm:max-w-[320px]",
					// États
					"transition-all duration-150",
					"hover:bg-accent hover:border-primary/40",
					// Mobile : cliquable avec feedback
					"sm:cursor-default",
					isMobile && [
						"cursor-pointer",
						"active:scale-[0.97]",
						"active:bg-destructive/10",
					],
					isPending && "opacity-50 pointer-events-none"
				)}
				onClick={handleBadgeClick}
				role={isMobile ? "button" : undefined}
				tabIndex={isMobile ? 0 : undefined}
				aria-label={isMobile ? ariaLabel : undefined}
			>
				<span className="truncate">
					<span className="font-medium">{displayLabel}</span>
					{displayValue && displayValue.length > 0 && (
						<span className="text-muted-foreground ml-1">
							: {displayValue}
						</span>
					)}
				</span>

				{/* Bouton X visible seulement sur desktop */}
				<Button
					ref={buttonRef}
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						handleRemove();
					}}
					disabled={isPending}
					className={cn(
						"hidden sm:flex",
						"size-7 rounded-full",
						"hover:bg-destructive/10 hover:text-destructive",
						"transition-colors"
					)}
					aria-label={ariaLabel}
				>
					{isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<X className="size-3.5" />
					)}
				</Button>
			</Badge>
		</motion.div>
	);
}
