"use client";

import { useEffect, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Slider } from "@/shared/components/ui/slider";

interface PriceRangeInputsProps {
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxPrice: number;
}

/**
 * Composant pour gerer les inputs de prix avec etat local
 * Resout les problemes de synchronisation avec le slider
 */
export function PriceRangeInputs({
	value,
	onChange,
	maxPrice,
}: PriceRangeInputsProps) {
	// Etat local pour permettre l'edition libre
	const [minInput, setMinInput] = useState(String(value[0]));
	const [maxInput, setMaxInput] = useState(String(value[1]));

	// Synchroniser l'etat local quand la valeur externe change (ex: slider)
	useEffect(() => {
		setMinInput(String(value[0]));
	}, [value[0]]);

	useEffect(() => {
		setMaxInput(String(value[1]));
	}, [value[1]]);

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
						value={value}
						onValueChange={(newValue) => onChange([newValue[0], newValue[1]])}
						max={maxPrice}
						min={0}
						step={5}
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
