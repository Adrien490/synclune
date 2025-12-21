"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface FilterBadgeProps {
	filter: FilterDefinition;
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	onRemove: (key: string, value?: string) => void;
}

export function FilterBadge({
	filter,
	formatFilter,
	onRemove,
}: FilterBadgeProps) {
	const isMobile = useIsMobile();

	// Formater le filtre si une fonction est fournie
	const formatted = formatFilter?.(filter);

	// Si la fonction retourne null, ne pas afficher le badge
	if (formatted === null) {
		return null;
	}

	const displayLabel = formatted?.label || filter.label;
	const displayValue = formatted?.displayValue || filter.displayValue;
	const filterDescription = `${displayLabel}${displayValue ? ` ${displayValue}` : ""}`;
	const ariaLabelRemove = `Supprimer le filtre ${filterDescription}`;
	const ariaLabelGroup = `Filtre actif : ${filterDescription}`;

	// Suppression optimiste - disparition instantanée du badge
	const handleRemove = () => {
		const value = typeof filter.value === "string" ? filter.value : undefined;
		onRemove(filter.key, value);
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
					"h-11 sm:h-8",
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
					// Mobile : badge entier cliquable avec feedback
					"cursor-pointer sm:cursor-default",
					"max-sm:active:scale-[0.97]",
					"max-sm:active:bg-destructive/10",
					// Desktop : seul le bouton X est cliquable
					"sm:pointer-events-none"
				)}
				onClick={handleRemove}
				role={isMobile ? "button" : "group"}
				tabIndex={isMobile ? 0 : undefined}
				aria-label={isMobile ? ariaLabelRemove : ariaLabelGroup}
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
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						handleRemove();
					}}
					className={cn(
						"hidden sm:flex",
						"size-8 rounded-full",
						"hover:bg-destructive/10 hover:text-destructive",
						"transition-colors",
						"pointer-events-auto"
					)}
					aria-label={ariaLabelRemove}
				>
					<X className="size-4" />
				</Button>
			</Badge>
		</motion.div>
	);
}
