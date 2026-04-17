"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- TanStack Form field value is typed `any` by design */

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { cn } from "@/shared/utils/cn";
import { Check } from "lucide-react";
import { isLightColor, getContrastTextColor } from "@/modules/colors/utils/color-contrast.utils";
import { SectionHeader, SectionSearch } from "./products-filter-sheet-ui";
import { SEARCH_THRESHOLD } from "./products-filter-sheet.types";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterForm, FilterFieldApi } from "./products-filter-sheet.types";

// ============================================================================
// COLORS SECTION
// ============================================================================

export function ColorsSection({
	form,
	sortedColors,
	filteredColors,
	colorSearch,
	setColorSearch,
}: {
	form: FilterForm;
	sortedColors: GetColorsReturn["colors"];
	filteredColors: GetColorsReturn["colors"];
	colorSearch: string;
	setColorSearch: (value: string) => void;
}) {
	if (sortedColors.length === 0) return null;

	return (
		<form.Field name="colorSlugs" mode="array">
			{(field: FilterFieldApi) => (
				<AccordionItem value="colors">
					<AccordionTrigger headingLevel={3} className="hover:no-underline">
						<SectionHeader
							label="Couleurs"
							count={field.state.value.length}
							onReset={() => field.handleChange([])}
						/>
					</AccordionTrigger>
					<AccordionContent>
						{sortedColors.length > SEARCH_THRESHOLD && (
							<SectionSearch
								value={colorSearch}
								onChange={setColorSearch}
								placeholder="Rechercher une couleur..."
							/>
						)}
						<div className="space-y-1">
							{filteredColors.length === 0 ? (
								<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
							) : (
								filteredColors.map((color) => {
									const isSelected = field.state.value.includes(color.slug);
									const light = isLightColor(color.hex, 0.85);
									return (
										<CheckboxFilterItem
											key={color.slug}
											id={`admin-color-${color.slug}`}
											checked={isSelected}
											onCheckedChange={(checked) => {
												if (checked && !isSelected) {
													field.pushValue(color.slug);
												} else if (!checked && isSelected) {
													const index = field.state.value.indexOf(color.slug);
													field.removeValue(index);
												}
											}}
											indicator={
												<span
													className={cn(
														"relative h-6 w-6 rounded-full shadow-sm",
														light ? "border-border border" : "border-border/50 border",
														isSelected
															? "ring-primary ring-2 ring-offset-1"
															: "ring-1 ring-black/5 ring-inset",
													)}
													style={{ backgroundColor: color.hex }}
												>
													{isSelected && (
														<Check
															className="absolute inset-0 m-auto h-3 w-3"
															style={{ color: getContrastTextColor(color.hex) }}
															strokeWidth={3}
														/>
													)}
												</span>
											}
											count={color._count.skus}
										>
											{color.name}
										</CheckboxFilterItem>
									);
								})
							)}
						</div>
					</AccordionContent>
				</AccordionItem>
			)}
		</form.Field>
	);
}

// ============================================================================
// MATERIALS SECTION
// ============================================================================

export function MaterialsSection({
	form,
	sortedMaterials,
	filteredMaterials,
	materialSearch,
	setMaterialSearch,
}: {
	form: FilterForm;
	sortedMaterials: MaterialOption[];
	filteredMaterials: MaterialOption[];
	materialSearch: string;
	setMaterialSearch: (value: string) => void;
}) {
	if (sortedMaterials.length === 0) return null;

	return (
		<form.Field name="materialSlugs" mode="array">
			{(field: FilterFieldApi) => (
				<AccordionItem value="materials">
					<AccordionTrigger headingLevel={3} className="hover:no-underline">
						<SectionHeader
							label="Matériaux"
							count={field.state.value.length}
							onReset={() => field.handleChange([])}
						/>
					</AccordionTrigger>
					<AccordionContent>
						{sortedMaterials.length > SEARCH_THRESHOLD && (
							<SectionSearch
								value={materialSearch}
								onChange={setMaterialSearch}
								placeholder="Rechercher un matériau..."
							/>
						)}
						<div className="space-y-1">
							{filteredMaterials.length === 0 ? (
								<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
							) : (
								filteredMaterials.map((material) => {
									const isSelected = field.state.value.includes(material.slug);
									return (
										<CheckboxFilterItem
											key={material.slug}
											id={`admin-material-${material.slug}`}
											checked={isSelected}
											onCheckedChange={(checked) => {
												if (checked && !isSelected) {
													field.pushValue(material.slug);
												} else if (!checked && isSelected) {
													const index = field.state.value.indexOf(material.slug);
													field.removeValue(index);
												}
											}}
											count={material._count?.skus}
										>
											{material.name}
										</CheckboxFilterItem>
									);
								})
							)}
						</div>
					</AccordionContent>
				</AccordionItem>
			)}
		</form.Field>
	);
}
