"use client";

import { useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useIsTouchDevice } from "@/shared/hooks";
import type { ColorSwatch } from "@/modules/products/services/product-list-helpers";

interface ColorSwatchesProps {
	colors: ColorSwatch[];
	maxVisible?: number;
	size?: "xs" | "sm" | "md" | "lg";
	className?: string;
	/** Mode interactif : les pastilles deviennent cliquables */
	interactive?: boolean;
	/** Couleur actuellement sélectionnée (slug) */
	selectedColor?: string | null;
	/** Callback quand une couleur est sélectionnée */
	onColorSelect?: (colorSlug: string) => void;
	/** Désactive le composant pendant un chargement */
	disabled?: boolean;
}

const sizeClasses = {
	xs: "size-4", // 16px - décoratif uniquement
	sm: "size-5", // 20px - compact pour cards
	md: "size-7", // 28px - WCAG 2.5.5 avec espacement ≥16px = 44px total
	lg: "size-9 sm:size-7", // 36px mobile → 28px desktop (responsive)
};

/**
 * Pastilles couleur pour ProductCard
 *
 * Deux modes :
 * - Décoratif (défaut) : affichage simple des couleurs disponibles
 * - Interactif : pastilles cliquables pour changer la variante affichée
 *
 * Accessibilité :
 * - Role radiogroup avec navigation clavier (flèches, Home/End)
 * - Indication de sélection subtile (ring + scale)
 */
export function ColorSwatches({
	colors,
	maxVisible = 4,
	size = "sm",
	className,
	interactive = false,
	selectedColor,
	onColorSelect,
	disabled = false,
}: ColorSwatchesProps) {
	// Refs pour les boutons principaux et popover (navigation clavier)
	const mainButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
	const popoverButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);
	const isTouchDevice = useIsTouchDevice();

	if (colors.length === 0) return null;

	const visibleColors = colors.slice(0, maxVisible);
	const hiddenColors = colors.slice(maxVisible);
	const remainingCount = hiddenColors.length;

	// Fonction utilitaire pour assigner les refs sans sparse array
	const setMainButtonRef = (index: number, el: HTMLButtonElement | null) => {
		if (el) {
			mainButtonsRef.current.set(index, el);
		} else {
			mainButtonsRef.current.delete(index);
		}
	};

	const setPopoverButtonRef = (index: number, el: HTMLButtonElement | null) => {
		if (el) {
			popoverButtonsRef.current.set(index, el);
		} else {
			popoverButtonsRef.current.delete(index);
		}
	};

	// Navigation clavier WAI-ARIA Radio Group (fonctionne dans main ET popover)
	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLButtonElement>,
		index: number,
		inPopover: boolean
	) => {
		if (!interactive) return;

		// Détermine la liste de couleurs et les refs selon le contexte
		const colorList = inPopover ? hiddenColors : visibleColors;
		const buttonsMap = inPopover ? popoverButtonsRef.current : mainButtonsRef.current;
		const baseIndex = inPopover ? maxVisible : 0;

		// Indices des couleurs activées (en stock)
		const enabledIndices = colorList
			.map((c, i) => (c.inStock ? baseIndex + i : -1))
			.filter((i) => i !== -1);

		if (enabledIndices.length === 0) return;

		const currentEnabledIndex = enabledIndices.indexOf(index);
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				if (currentEnabledIndex < enabledIndices.length - 1) {
					nextIndex = enabledIndices[currentEnabledIndex + 1];
				} else {
					nextIndex = enabledIndices[0]; // Loop to start
				}
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				if (currentEnabledIndex > 0) {
					nextIndex = enabledIndices[currentEnabledIndex - 1];
				} else {
					nextIndex = enabledIndices[enabledIndices.length - 1]; // Loop to end
				}
				break;
			case "Home":
				e.preventDefault();
				nextIndex = enabledIndices[0];
				break;
			case "End":
				e.preventDefault();
				nextIndex = enabledIndices[enabledIndices.length - 1];
				break;
		}

		if (nextIndex !== null) {
			buttonsMap.get(nextIndex)?.focus();
		}
	};

	// Rendu d'une pastille couleur (réutilisé dans popover)
	const renderSwatch = (
		color: ColorSwatch,
		index: number,
		inPopover = false
	) => {
		const isSelected = selectedColor === color.slug;
		const swatchSize = inPopover ? "md" : size;
		const isDisabled = !color.inStock || disabled;

		if (interactive) {
			// Chaque couleur est tabbable individuellement (sauf si disabled)
			// Plus intuitif pour les utilisateurs e-commerce
			return (
				<button
					key={color.slug}
					ref={(el) => {
						if (inPopover) {
							setPopoverButtonRef(index, el);
						} else {
							setMainButtonRef(index, el);
						}
					}}
					type="button"
					aria-pressed={isSelected}
					aria-label={`${color.name}${isSelected ? " (sélectionnée)" : ""}${!color.inStock ? " (rupture)" : ""}`}
					// Chaque couleur est tabbable sauf si rupture de stock
					tabIndex={isDisabled ? -1 : 0}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						if (color.inStock && onColorSelect) {
							onColorSelect(color.slug);
						}
					}}
					onKeyDown={(e) => handleKeyDown(e, index, inPopover)}
					disabled={isDisabled}
					className={cn(
						"rounded-full border-2 motion-safe:transition-all motion-safe:active:scale-90 motion-safe:active:ring-4 motion-safe:active:ring-primary/20",
						sizeClasses[swatchSize],
						"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
						isSelected
							? "border-primary ring-2 ring-primary/40 motion-safe:scale-110"
							: "border-border/50 shadow-sm can-hover:hover:border-primary/50 motion-safe:can-hover:hover:scale-105",
						!color.inStock && "opacity-40 cursor-not-allowed"
					)}
					style={{ backgroundColor: color.hex }}
				/>
			);
		}

		// Mode décoratif - span avec sr-only pour accessibilité
		return (
			<span
				key={color.slug}
				className={cn(
					"rounded-full border border-border/50 shadow-sm motion-safe:transition-opacity relative",
					sizeClasses[swatchSize],
					!color.inStock && "opacity-40"
				)}
				style={{ backgroundColor: color.hex }}
			>
				<span className="sr-only">
					{color.name}
					{!color.inStock && " (rupture)"}
				</span>
			</span>
		);
	};

	return (
		<div
			className={cn(
				"flex items-center",
				// Scroll horizontal sur mobile si beaucoup de couleurs
				interactive ? "overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3 sm:gap-4 -mx-1 px-1" : "flex-wrap gap-1.5",
				className
			)}
			aria-label={`${colors.length} couleur${colors.length > 1 ? "s" : ""} disponible${colors.length > 1 ? "s" : ""}`}
		>
			{visibleColors.map((color, index) =>
				isTouchDevice ? (
					<span key={color.slug} className={interactive ? "snap-start shrink-0" : undefined}>
						{renderSwatch(color, index)}
					</span>
				) : (
					<Tooltip key={color.slug}>
						<TooltipTrigger asChild>
							<span className={interactive ? "snap-start shrink-0" : undefined}>
								{renderSwatch(color, index)}
							</span>
						</TooltipTrigger>
						<TooltipContent side="top" className="text-xs">
							{color.name}
							{!color.inStock && " (rupture)"}
						</TooltipContent>
					</Tooltip>
				)
			)}

			{/* Badge +N avec Popover pour voir/sélectionner les couleurs masquées */}
			{remainingCount > 0 && (
				<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							onClick={(e) => e.stopPropagation()}
							className={cn(
								"flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium transition-colors",
								"hover:bg-muted/80 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
								sizeClasses[size]
							)}
							aria-label={`Voir ${remainingCount} autre${remainingCount > 1 ? "s" : ""} couleur${remainingCount > 1 ? "s" : ""}`}
							aria-expanded={isPopoverOpen}
							aria-haspopup="dialog"
						>
							+{remainingCount}
						</button>
					</PopoverTrigger>
					<PopoverContent
						side="top"
						align="start"
						className="w-auto p-3"
						onClick={(e) => e.stopPropagation()}
					>
						<p className="text-xs text-muted-foreground mb-2">
							{remainingCount} autre{remainingCount > 1 ? "s" : ""} couleur
							{remainingCount > 1 ? "s" : ""}
						</p>
						<div className="flex flex-wrap gap-3">
							{hiddenColors.map((color, index) =>
								isTouchDevice ? (
									<span key={color.slug}>
										{renderSwatch(color, maxVisible + index, true)}
									</span>
								) : (
									<Tooltip key={color.slug}>
										<TooltipTrigger asChild>
											{renderSwatch(color, maxVisible + index, true)}
										</TooltipTrigger>
										<TooltipContent side="top" className="text-xs">
											{color.name}
											{!color.inStock && " (rupture)"}
										</TooltipContent>
									</Tooltip>
								)
							)}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
