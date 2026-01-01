"use client";

import { FilterDefinition } from "@/shared/hooks/use-filter";
import { cn } from "@/shared/utils/cn";
import { motion, useReducedMotion } from "motion/react";
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

	// Suppression optimiste - disparition instantanée du badge
	const handleRemove = () => {
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

		onRemove(filter.key, value);
	};

	// Animation props conditionnelles pour prefers-reduced-motion
	// Opacity seulement - pas de scale pour éviter le flickering avec AnimatePresence
	const animationProps = shouldReduceMotion
		? {}
		: {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
			};

	const transitionProps = shouldReduceMotion
		? { duration: 0 }
		: {
				duration: 0.15,
				ease: [0.25, 0.1, 0.25, 1] as const,
			};

	// Variants Framer Motion pour l'animation hover desktop
	const iconVariants = {
		initial: { width: 0, opacity: 0 },
		hover: { width: 20, opacity: 1 },
	};

	return (
		<motion.button
			type="button"
			layout
			{...animationProps}
			transition={transitionProps}
			onClick={handleRemove}
			aria-label={ariaLabelRemove}
			whileHover={shouldReduceMotion ? undefined : "hover"}
			className={cn(
				// Layout
				"flex items-center gap-1.5",
				"h-11 sm:h-8",
				"px-3",
				// Forme pill
				"rounded-full border",
				// Typographie
				"text-sm font-medium",
				// Largeur max
				"max-w-[280px] sm:max-w-[320px]",
				// Etats
				"cursor-pointer",
				"transition-colors duration-150",
				"can-hover:hover:bg-accent can-hover:hover:border-primary/40",
				// Active (mobile)
				"active:scale-[0.95] sm:active:scale-[0.98]",
				"active:bg-destructive/15 active:border-destructive/30",
				// Focus
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			)}
		>
			{/* Texte */}
			<span className="truncate font-medium">
				{displayValue && displayValue.length > 0 ? displayValue : displayLabel}
			</span>

			{/* Icone X mobile - toujours visible */}
			<X
				className="size-3.5 opacity-50 shrink-0 sm:hidden"
				aria-hidden="true"
			/>

			{/* Icone X desktop - animation width au hover */}
			<motion.span
				aria-hidden="true"
				variants={iconVariants}
				initial="initial"
				transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
				className={cn(
					"hidden sm:flex items-center justify-center",
					"h-5 overflow-hidden rounded-full",
					"bg-destructive/10 text-destructive"
				)}
			>
				<X className="size-3 shrink-0" />
			</motion.span>
		</motion.button>
	);
}
