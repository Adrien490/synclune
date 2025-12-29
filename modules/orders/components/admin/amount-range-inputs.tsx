"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface AmountRangeInputsProps {
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxPrice?: number;
}

export function AmountRangeInputs({
	value,
	onChange,
	maxPrice = 10000,
}: AmountRangeInputsProps) {
	const [min, max] = value;

	return (
		<fieldset className="space-y-3">
			<legend className="font-medium text-sm text-foreground">
				Montant de la commande
			</legend>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label htmlFor="price-min" className="text-xs text-muted-foreground">
						Min
					</Label>
					<div className="relative">
						<Input
							id="price-min"
							type="number"
							min={0}
							max={maxPrice}
							value={min || ""}
							onChange={(e) => {
								const newMin = e.target.value ? Number(e.target.value) : 0;
								onChange([newMin, max]);
							}}
							placeholder="0"
							className="pr-7"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
							EUR
						</span>
					</div>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="price-max" className="text-xs text-muted-foreground">
						Max
					</Label>
					<div className="relative">
						<Input
							id="price-max"
							type="number"
							min={0}
							max={maxPrice}
							value={max || ""}
							onChange={(e) => {
								const newMax = e.target.value ? Number(e.target.value) : maxPrice;
								onChange([min, newMax]);
							}}
							placeholder={String(maxPrice)}
							className="pr-7"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
							EUR
						</span>
					</div>
				</div>
			</div>
		</fieldset>
	);
}
