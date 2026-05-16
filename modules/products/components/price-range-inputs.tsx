"use client";

import { useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Slider } from "@/shared/components/ui/slider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { priceToSlider, sliderToPrice, SLIDER_MAX } from "../constants/price-filter";

interface PriceRangeInputsProps {
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxPrice: number;
}

/**
 * Composant pour gerer les inputs de prix avec etat local
 * Resout les problemes de synchronisation avec le slider
 *
 * Utilise une echelle quadratique non-lineaire pour le slider:
 * - Plus de precision dans la gamme 0-100€ (ou la majorite des produits se trouvent)
 * - Les prix eleves restent accessibles sans monopoliser le slider
 */
export function PriceRangeInputs({ value, onChange, maxPrice }: PriceRangeInputsProps) {
	const haptic = useHaptic();
	// Tracks if we've tickled haptic during current drag (avoid spam per tick)
	const draggingRef = useRef(false);

	const minValue = value[0];
	const maxValue = value[1];

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
		}
	};

	return (
		<fieldset className="m-0 space-y-3 border-0 p-0" aria-labelledby="price-filter-label">
			<legend id="price-filter-label" className="text-foreground text-sm font-medium">
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
					onValueCommit={() => {
						draggingRef.current = false;
						haptic("selection");
					}}
					max={SLIDER_MAX}
					min={0}
					step={1}
					className="w-full"
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
							aria-description="en euros"
						/>
					</div>
					<span className="text-muted-foreground shrink-0">—</span>
					<div className="flex-1">
						<Input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							placeholder="0"
							value={maxInput}
							onChange={handleMaxChange}
							onBlur={handleMaxBlur}
							className="h-10 text-sm"
							aria-label="Prix maximum"
							aria-description="en euros"
						/>
					</div>
					<span className="text-muted-foreground shrink-0 text-sm">€</span>
				</div>
			</div>
		</fieldset>
	);
}
