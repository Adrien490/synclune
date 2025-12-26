"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { motion, useReducedMotion } from "framer-motion";
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
	const shouldReduceMotion = useReducedMotion();

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
		// Pour les tableaux, on ne passe pas de valeur spécifique (supprime la clé entière)
		// Pour les autres types primitifs, on convertit en string
		let value: string | undefined;

		if (typeof filter.value === "string") {
			value = filter.value;
		} else if (
			typeof filter.value === "number" ||
			typeof filter.value === "boolean"
		) {
			value = String(filter.value);
		} else if (filter.value instanceof Date) {
			value = filter.value.toISOString();
		}
		// Pour string[] et undefined, on laisse value = undefined

		onRemove(filter.key, value);
	};

	// Animation props conditionnelles pour prefers-reduced-motion
	const animationProps = shouldReduceMotion
		? {}
		: {
				initial: { opacity: 0, scale: 0.92 },
				animate: { opacity: 1, scale: 1 },
				exit: { opacity: 0, scale: 0.92 },
			};

	const transitionProps = shouldReduceMotion
		? { layout: { duration: 0 } }
		: {
				duration: 0.15,
				ease: [0.25, 0.1, 0.25, 1] as const,
				layout: { type: "spring" as const, stiffness: 500, damping: 35 },
			};

	// Styles communs du badge
	const badgeStyles = cn(
		// Layout
		"flex items-center gap-1.5",
		"h-11 sm:h-8",
		"pl-3 pr-2",
		// Forme pill cohérente
		"rounded-full border",
		// Typographie
		"text-sm font-medium",
		// Largeur max
		"max-w-[280px] sm:max-w-[320px]",
		// États
		"transition-all duration-150",
		"hover:bg-accent hover:border-primary/40",
		// Focus visible pour accessibilité clavier
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	);

	const textContent = (
		<span className="truncate font-medium">
			{displayValue && displayValue.length > 0 ? displayValue : displayLabel}
		</span>
	);

	// Mobile : utiliser un vrai <button> pour l'accessibilité
	if (isMobile) {
		return (
			<motion.button
				type="button"
				layoutId={filter.id}
				{...animationProps}
				transition={transitionProps}
				onClick={handleRemove}
				aria-label={ariaLabelRemove}
				className={cn(
					badgeStyles,
					// Mobile spécifique
					"cursor-pointer",
					"active:scale-[0.97]",
					"active:bg-destructive/10"
				)}
			>
				{textContent}
			</motion.button>
		);
	}

	// Desktop : Badge avec bouton X séparé
	return (
		<motion.div
			layoutId={filter.id}
			{...animationProps}
			transition={transitionProps}
		>
			<Badge
				variant="outline"
				className={cn(
					badgeStyles,
					// Desktop : pas de clic sur le badge, seulement sur X
					"cursor-default",
					"pointer-events-none"
				)}
				aria-label={ariaLabelGroup}
			>
				{textContent}

				{/* Bouton X */}
				<Button
					variant="ghost"
					size="icon"
					onClick={handleRemove}
					className={cn(
						"size-6 rounded-full",
						"hover:bg-destructive/10 hover:text-destructive",
						"transition-colors",
						"pointer-events-auto"
					)}
					aria-label={ariaLabelRemove}
				>
					<X className="size-3.5" />
				</Button>
			</Badge>
		</motion.div>
	);
}
