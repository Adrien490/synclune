"use client";

import { useEffect, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Slider } from "@/shared/components/ui/slider";
import {
	priceToSlider,
	sliderToPrice,
	SLIDER_MAX,
} from "../constants/price-filter";

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
export function PriceRangeInputs({
	value,
	onChange,
	maxPrice,
}: PriceRangeInputsProps) {
	// Etat local pour permettre l'edition libre des inputs texte
	const [minInput, setMinInput] = useState(String(value[0]));
	const [maxInput, setMaxInput] = useState(String(value[1]));

	// Position interne du slider (0-100) avec echelle non-lineaire
	const [sliderPosition, setSliderPosition] = useState<[number, number]>([
		priceToSlider(value[0], maxPrice),
		priceToSlider(value[1], maxPrice),
	]);

	// Synchroniser l'etat local quand la valeur externe change
	useEffect(() => {
		setMinInput(String(value[0]));
		setSliderPosition((prev) => [priceToSlider(value[0], maxPrice), prev[1]]);
	}, [value[0], maxPrice]);

	useEffect(() => {
		setMaxInput(String(value[1]));
		setSliderPosition((prev) => [prev[0], priceToSlider(value[1], maxPrice)]);
	}, [value[1], maxPrice]);

	const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMinInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Appliquer les contraintes et mettre a jour le form
			const constrainedValue = Math.min(Math.max(0, numValue), value[1]);
			onChange([constrainedValue, value[1]]);
		}
	};

	const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMaxInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Appliquer les contraintes et mettre a jour le form
			const constrainedValue = Math.max(Math.min(maxPrice, numValue), value[0]);
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
		<fieldset
			className="space-y-3 border-0 p-0 m-0"
			role="group"
			aria-labelledby="price-filter-label"
		>
			<legend id="price-filter-label" className="font-medium text-sm text-foreground">
				Prix (€)
			</legend>
			<div className="space-y-4">
				{/* data-vaul-no-drag empeche le drawer de capturer le drag du slider */}
				<div data-vaul-no-drag>
					<Slider
						value={sliderPosition}
						onValueChange={(newPos) => {
							setSliderPosition([newPos[0], newPos[1]]);
							// Convertir les positions en prix reels
							const newMinPrice = sliderToPrice(newPos[0], maxPrice);
							const newMaxPrice = sliderToPrice(newPos[1], maxPrice);
							onChange([newMinPrice, newMaxPrice]);
						}}
						max={SLIDER_MAX}
						min={0}
						step={1}
						className="w-full"
					/>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<Input
							type="number"
							min={0}
							max={value[1]}
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
							type="number"
							min={value[0]}
							max={maxPrice}
							value={maxInput}
							onChange={handleMaxChange}
							onBlur={handleMaxBlur}
							className="h-10 text-sm"
							aria-label="Prix maximum"
						/>
					</div>
					<span className="text-muted-foreground text-sm shrink-0">€</span>
				</div>
			</div>
		</fieldset>
	);
}
