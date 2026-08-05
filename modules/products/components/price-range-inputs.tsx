"use client";

import { useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Slider } from "@/shared/components/ui/slider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { priceToSlider, sliderToPrice, SLIDER_MAX } from "../constants/price-filter";

interface PriceRangeInputsProps {
	/**
	 * Préfixe de l'`id` de la légende. Optionnel : le seul autre appelant
	 * (formulaires admin) n'a qu'une instance par document, alors que le filtre
	 * boutique en monte deux (rail masqué + panneau).
	 */
	idPrefix?: string;
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxPrice: number;
	/**
	 * Appelé UNIQUEMENT au relâchement du curseur (et au blur d'un champ) — pour
	 * un hôte dont chaque changement coûte une navigation : le rail desktop
	 * applique à la coche, et un `onChange` par frame de drag y déclencherait un
	 * `router.replace` par pixel. Sans cette prop, comportement inchangé.
	 */
	onCommit?: (value: [number, number]) => void;
}

/**
 * Composant pour gerer les inputs de prix avec etat local
 * Resout les problemes de synchronisation avec le slider
 *
 * Utilise une echelle quadratique non-lineaire pour le slider:
 * - Plus de precision dans la gamme 0-100€ (ou la majorite des produits se trouvent)
 * - Les prix eleves restent accessibles sans monopoliser le slider
 */
export function PriceRangeInputs({
	idPrefix,
	value,
	onChange,
	maxPrice,
	onCommit,
}: PriceRangeInputsProps) {
	const legendId = idPrefix ? `${idPrefix}-price-filter-label` : "price-filter-label";
	const haptic = useHaptic();
	// Tracks if we've tickled haptic during current drag (avoid spam per tick)
	const draggingRef = useRef(false);

	const minValue = value[0];
	const maxValue = value[1];

	// Au repos (plage = [0, max]), le remplissage rose courait d'un bout à
	// l'autre de la piste : l'élément le plus saturé du filtre disait « réglé »
	// quand rien ne l'était (audit rail 2026-08-05, P3). La piste reste nue tant
	// que la plage est celle par défaut ; les poignées gardent leur couleur —
	// elles sont l'affordance, pas l'état.
	const isDefaultRange = minValue === 0 && maxValue === maxPrice;

	// Etat local pour permettre l'edition libre des inputs texte
	const [minInput, setMinInput] = useState(() => String(minValue));
	const [maxInput, setMaxInput] = useState(() => String(maxValue));

	// Position interne du slider (0-100) avec echelle non-lineaire
	const [sliderPosition, setSliderPosition] = useState<[number, number]>(() => [
		priceToSlider(minValue, maxPrice),
		priceToSlider(maxValue, maxPrice),
	]);

	// Sync state when external props change — set during render (no useEffect).
	// React 19 idiomatic pattern: https://react.dev/reference/react/useState#storing-information-from-previous-renders
	const [prevSync, setPrevSync] = useState({ min: minValue, max: maxValue, cap: maxPrice });
	if (prevSync.min !== minValue || prevSync.max !== maxValue || prevSync.cap !== maxPrice) {
		setPrevSync({ min: minValue, max: maxValue, cap: maxPrice });
		setMinInput(String(minValue));
		setMaxInput(String(maxValue));
		setSliderPosition([priceToSlider(minValue, maxPrice), priceToSlider(maxValue, maxPrice)]);
	}

	const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMinInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Appliquer les contraintes et mettre a jour le form
			const constrainedValue = Math.min(Math.max(0, Math.round(numValue)), value[1]);
			onChange([constrainedValue, value[1]]);
		}
	};

	const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMaxInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Appliquer les contraintes et mettre a jour le form
			const constrainedValue = Math.max(Math.min(maxPrice, Math.round(numValue)), value[0]);
			onChange([value[0], constrainedValue]);
		}
	};

	const handleMinBlur = () => {
		// Sur blur, s'assurer que la valeur est valide et synchronisee
		const numValue = Number(minInput);
		if (isNaN(numValue) || minInput === "") {
			setMinInput(String(value[0]));
		} else {
			const constrainedValue = Math.min(Math.max(0, numValue), value[1]);
			setMinInput(String(constrainedValue));
			if (constrainedValue !== value[0]) {
				onChange([constrainedValue, value[1]]);
			}
			onCommit?.([constrainedValue, value[1]]);
		}
	};

	const handleMaxBlur = () => {
		// Sur blur, s'assurer que la valeur est valide et synchronisee
		const numValue = Number(maxInput);
		if (isNaN(numValue) || maxInput === "") {
			setMaxInput(String(value[1]));
		} else {
			const constrainedValue = Math.max(Math.min(maxPrice, numValue), value[0]);
			setMaxInput(String(constrainedValue));
			if (constrainedValue !== value[1]) {
				onChange([value[0], constrainedValue]);
			}
			onCommit?.([value[0], constrainedValue]);
		}
	};

	return (
		<fieldset className="m-0 space-y-3 border-0 p-0" aria-labelledby={legendId}>
			{/* sr-only : l'en-tête du compartiment « Prix » porte déjà le libellé
			    visuel — la légende ne sert plus qu'aux technologies d'assistance. */}
			<legend id={legendId} className="sr-only">
				Prix (€)
			</legend>
			<div className="space-y-4">
				<Slider
					value={sliderPosition}
					onValueChange={(newPos) => {
						if (!draggingRef.current) {
							draggingRef.current = true;
							haptic("light");
						}
						setSliderPosition([newPos[0]!, newPos[1]!]);
						// Convertir les positions en prix reels
						const newMinPrice = sliderToPrice(newPos[0]!, maxPrice);
						const newMaxPrice = sliderToPrice(newPos[1]!, maxPrice);
						onChange([newMinPrice, newMaxPrice]);
					}}
					onValueCommitted={(committedPos) => {
						draggingRef.current = false;
						haptic("selection");
						onCommit?.([
							sliderToPrice(committedPos[0]!, maxPrice),
							sliderToPrice(committedPos[1]!, maxPrice),
						]);
					}}
					max={SLIDER_MAX}
					min={0}
					step={1}
					className={cn("w-full", isDefaultRange && "[&_[data-slot=slider-range]]:bg-transparent")}
					// Sans formateur, les thumbs annoncent « N sur 100 » — la POSITION de
					// l'échelle quadratique interne, pas un prix.
					formatValue={(position) => `${sliderToPrice(position, maxPrice)} euros`}
				/>
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<Input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							placeholder="0"
							value={minInput}
							onChange={handleMinChange}
							onBlur={handleMinBlur}
							className="h-10 text-sm"
							aria-label="Prix minimum"
						/>
					</div>
					<span className="text-muted-foreground shrink-0">—</span>
					<div className="flex-1">
						<Input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							placeholder={String(maxPrice)}
							value={maxInput}
							onChange={handleMaxChange}
							onBlur={handleMaxBlur}
							className="h-10 text-sm"
							aria-label="Prix maximum"
						/>
					</div>
					<span className="text-muted-foreground shrink-0 text-sm">€</span>
				</div>
			</div>
		</fieldset>
	);
}
