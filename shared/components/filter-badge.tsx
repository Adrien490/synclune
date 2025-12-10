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
			initial={{ opacity: 0, scale: 0.85, y: -8 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.85 }}
			transition={{
				duration: 0.15,
				ease: [0.4, 0, 0.2, 1],
				layout: {
					type: "spring",
					stiffness: 400,
					damping: 35,
				},
			}}
		>
			<Badge
				variant="outline"
				className={cn(
					"flex items-center gap-1 pr-0.5 sm:pr-1 text-sm/5 tracking-normal antialiased relative font-medium",
					"max-w-[200px] sm:max-w-[300px]",
					"transition-all duration-200",
					"hover:bg-accent/50 hover:border-primary/30",
					isPending && "opacity-60",
					isMobile && "cursor-pointer active:scale-95"
				)}
				onClick={handleBadgeClick}
			>
				<span className="pl-2.5 truncate">
					{displayLabel}
					{displayValue && displayValue.length > 0 && (
						<span className="font-normal text-foreground/70 ml-1">
							: {displayValue}
						</span>
					)}
				</span>
				<Button
					ref={buttonRef}
					variant="ghost"
					size="icon"
					onClick={handleRemove}
					disabled={isPending}
					className={cn(
						"min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-full",
						"p-2 sm:p-1.5"
					)}
					aria-label={`Supprimer le filtre ${displayLabel}${displayValue ? ` ${displayValue}` : ""}`}
				>
					{isPending ? (
						<Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
					) : (
						<X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
					)}
				</Button>
			</Badge>
		</motion.div>
	);
}
