"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { Separator } from "@/shared/components/ui/separator";
import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import { useAppForm } from "@/shared/components/forms";
import { withViewTransition } from "@/shared/utils/view-transition";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, Suspense, type ComponentProps } from "react";

import {
	VARIANT_ACTIVE_STATUS_OPTIONS,
	VARIANT_FILTER_KEYS,
	VARIANT_STOCK_STATUS_OPTIONS,
	type VariantActiveFilter,
	type VariantsFilterFormData,
} from "./variants-filter/variants-filter-options";

interface CheckboxArrayField {
	state: { value: string[] };
	pushValue: (value: string) => void;
	removeValue: (index: number) => void;
}

interface CheckboxOption {
	id: string;
	name: string;
	hex?: string | null;
}

/**
 * Groupe de checkboxes type « filtre multi-select » (couleur/matériau),
 * construit sur le `CheckboxFilterItem` partagé (zone tactile 44px) — le
 * groupe local sur `Checkbox`/`Label` bruts était le seul des 9 modules
 * hors pattern (audit UI design system 2026-08-01).
 */
function FilterCheckboxGroup({
	legend,
	options,
	field,
	idPrefix,
}: {
	legend: string;
	options: CheckboxOption[];
	field: CheckboxArrayField;
	idPrefix: string;
}) {
	return (
		<fieldset className="space-y-1">
			<legend className="text-foreground mb-2 text-sm font-medium">{legend}</legend>
			<div className="max-h-48 space-y-1 overflow-y-auto">
				{options.map((option) => {
					const isSelected = field.state.value.includes(option.id);
					return (
						<CheckboxFilterItem
							key={option.id}
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
							indicator={
								option.hex ? (
									<span
										className="border-border size-4 rounded-full border"
										style={{ backgroundColor: option.hex }}
									/>
								) : undefined
							}
						>
							{option.name}
						</CheckboxFilterItem>
					);
				})}
			</div>
		</fieldset>
	);
}

interface VariantsFilterSheetProps {
	className?: string;
	colorOptions: ColorOption[];
	materialOptions: MaterialOption[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
	/** DOM `id` of the sheet content (paired with `aria-controls`). */
	id?: string;
}

function readFiltersFromSearchParams(searchParams: URLSearchParams): VariantsFilterFormData {
	const stockStatuses: string[] = [];
	const colorIds: string[] = [];
	const materialIds: string[] = [];
	let active: VariantActiveFilter = "all";

	searchParams.forEach((value, key) => {
		if (key === "filter_stockStatus" && value !== "all") {
			stockStatuses.push(value);
		} else if (key === "filter_colorId") {
			colorIds.push(value);
		} else if (key === "filter_materialId") {
			materialIds.push(value);
		} else if (key === "filter_isActive") {
			if (value === "true") active = "active";
			else if (value === "false") active = "inactive";
		}
	});

	return {
		stockStatuses: [...new Set(stockStatuses)],
		colorIds: [...new Set(colorIds)],
		materialIds: [...new Set(materialIds)],
		active,
	};
}

function buildFilterUrl(searchParams: URLSearchParams, formData: VariantsFilterFormData): string {
	const params = new URLSearchParams(searchParams.toString());
	VARIANT_FILTER_KEYS.forEach((key) => params.delete(key));
	params.delete("cursor");
	params.delete("direction");

	formData.stockStatuses.forEach((s) => params.append("filter_stockStatus", s));
	formData.colorIds.forEach((id) => params.append("filter_colorId", id));
	formData.materialIds.forEach((id) => params.append("filter_materialId", id));

	if (formData.active === "active") params.set("filter_isActive", "true");
	else if (formData.active === "inactive") params.set("filter_isActive", "false");

	return params.toString();
}

function countActiveFilters(searchParams: URLSearchParams): number {
	let count = 0;
	searchParams.forEach((value, key) => {
		if ((VARIANT_FILTER_KEYS as readonly string[]).includes(key) && value !== "all") count += 1;
	});
	return count;
}

function VariantsFilterSheetInner({
	className,
	colorOptions,
	materialOptions,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: VariantsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;

	// Focus restoration WCAG 2.4.3 — capture activeElement à l'ouverture,
	// restaure via rAF + preventScroll à la fermeture (évite jump iOS).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
		}
		(controlledOnOpenChange ?? setInternalOpen)(nextOpen);
		if (!nextOpen) {
			requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
		}
	};

	const initialValues = readFiltersFromSearchParams(searchParams);

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: VariantsFilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: VariantsFilterFormData) => {
		const query = buildFilterUrl(searchParams, formData);
		startTransition(() => {
			withViewTransition(() => router.push(`?${query}`, { scroll: false }));
		});
	};

	const clearAllFilters = () => {
		const defaultValues: VariantsFilterFormData = {
			stockStatuses: [],
			colorIds: [],
			materialIds: [],
			active: "all",
		};
		form.reset(defaultValues);
		const query = buildFilterUrl(searchParams, defaultValues);
		startTransition(() => {
			withViewTransition(() => router.push(`?${query}`, { scroll: false }));
		});
	};

	const activeFiltersCount = countActiveFilters(searchParams);
	const hasActiveFilters = activeFiltersCount > 0;

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			id={id}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Statut actif/inactif */}
				<form.Field name="active">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de la variante
							</legend>
							{VARIANT_ACTIVE_STATUS_OPTIONS.map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`active-${value}`}
									name="filter-variant-active"
									value={value}
									checked={field.state.value === value}
									onCheckedChange={(checked) => {
										if (checked) field.handleChange(value as VariantActiveFilter);
									}}
								>
									{label}
								</RadioFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>

				<Separator />

				{/* Statut du stock */}
				<form.Field name="stockStatuses" mode="array">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Statut du stock</legend>
							{VARIANT_STOCK_STATUS_OPTIONS.map(({ value, label }) => {
								const isSelected = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`stock-${value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(value);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(value);
												field.removeValue(index);
											}
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</fieldset>
					)}
				</form.Field>

				{/* Couleurs */}
				{colorOptions.length > 0 && (
					<>
						<Separator />
						<form.Field name="colorIds" mode="array">
							{(field) => (
								<FilterCheckboxGroup
									legend="Couleur"
									options={colorOptions.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
									field={field as CheckboxArrayField}
									idPrefix="color"
								/>
							)}
						</form.Field>
					</>
				)}

				{/* Materiaux */}
				{materialOptions.length > 0 && (
					<>
						<Separator />
						<form.Field name="materialIds" mode="array">
							{(field) => (
								<FilterCheckboxGroup
									legend="Matériau"
									options={materialOptions.map((m) => ({ id: m.id, name: m.name }))}
									field={field as CheckboxArrayField}
									idPrefix="material"
								/>
							)}
						</form.Field>
					</>
				)}
			</form>
		</FilterSheetWrapper>
	);
}

export function VariantsFilterSheet(props: ComponentProps<typeof VariantsFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<VariantsFilterSheetInner {...props} />
		</Suspense>
	);
}
