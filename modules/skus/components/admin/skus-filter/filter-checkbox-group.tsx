"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";

export interface CheckboxOption {
	id: string;
	name: string;
	hex?: string;
}

export interface CheckboxArrayField {
	state: { value: string[] };
	pushValue: (value: string) => void;
	removeValue: (index: number) => void;
}

interface FilterCheckboxGroupProps {
	legend: string;
	options: CheckboxOption[];
	field: CheckboxArrayField;
	idPrefix: string;
}

/**
 * Group de checkboxes type "filtre multi-select" partagé entre les sections
 * couleur/matériau du SkusFilterSheet.
 */
export function FilterCheckboxGroup({
	legend,
	options,
	field,
	idPrefix,
}: FilterCheckboxGroupProps) {
	return (
		<fieldset className="space-y-3">
			<legend className="text-foreground text-sm font-medium">{legend}</legend>
			<div className="max-h-48 space-y-2 overflow-y-auto">
				{options.map((option) => {
					const isSelected = field.state.value.includes(option.id);
					return (
						<div key={option.id} className="flex items-center space-x-2">
							<Checkbox
								id={`${idPrefix}-${option.id}`}
								checked={isSelected}
								onCheckedChange={(checked) => {
									if (checked && !isSelected) {
										field.pushValue(option.id);
									} else if (!checked && isSelected) {
										const index = field.state.value.indexOf(option.id);
										field.removeValue(index);
									}
								}}
								className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
							/>
							{option.hex && (
								<span
									className="border-border h-4 w-4 shrink-0 rounded-full border"
									style={{ backgroundColor: option.hex }}
								/>
							)}
							<Label
								htmlFor={`${idPrefix}-${option.id}`}
								className="flex-1 cursor-pointer text-sm font-normal"
							>
								{option.name}
							</Label>
						</div>
					);
				})}
			</div>
		</fieldset>
	);
}
