"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- TanStack Form field value is typed `any` by design */

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PriceRangeInputs } from "../price-range-inputs";
import { SectionHeader } from "./products-filter-sheet-ui";
import { STATUS_OPTIONS } from "./products-filter-sheet.types";
import { ColorsSection, MaterialsSection } from "./products-filter-sections-searchable";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterForm, FilterFieldApi } from "./products-filter-sheet.types";

// ============================================================================
// STATUS SECTION
// ============================================================================

function StatusSection({ form }: { form: FilterForm }) {
	return (
		<form.Field name="statuses" mode="array">
			{(field: FilterFieldApi) => (
				<AccordionItem value="status">
					<AccordionTrigger headingLevel={3} className="hover:no-underline">
						<SectionHeader
							label="Statut"
							count={field.state.value.length}
							onReset={() => field.handleChange([])}
						/>
					</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-1">
							{STATUS_OPTIONS.map((option) => {
								const isSelected = field.state.value.includes(option.value);
								return (
									<CheckboxFilterItem
										key={option.value}
										id={`admin-status-${option.value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(option.value);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(option.value);
												field.removeValue(index);
											}
										}}
									>
										{option.label}
									</CheckboxFilterItem>
								);
							})}
						</div>
					</AccordionContent>
				</AccordionItem>
			)}
		</form.Field>
	);
}

// ============================================================================
// PRODUCT TYPES SECTION
// ============================================================================

function ProductTypesSection({
	form,
	productTypes,
}: {
	form: FilterForm;
	productTypes: Array<{ id: string; label: string; slug: string }>;
}) {
	if (productTypes.length === 0) return null;

	return (
		<form.Field name="typeSlugs" mode="array">
			{(field: FilterFieldApi) => (
				<AccordionItem value="types">
					<AccordionTrigger headingLevel={3} className="hover:no-underline">
						<SectionHeader
							label="Types de produit"
							count={field.state.value.length}
							onReset={() => field.handleChange([])}
						/>
					</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-1">
							{productTypes.map((type) => {
								const isSelected = field.state.value.includes(type.slug);
								return (
									<CheckboxFilterItem
										key={type.slug}
										id={`admin-type-${type.slug}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(type.slug);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(type.slug);
												field.removeValue(index);
											}
										}}
									>
										{type.label}
									</CheckboxFilterItem>
								);
							})}
						</div>
					</AccordionContent>
				</AccordionItem>
			)}
		</form.Field>
	);
}

// ============================================================================
// PRICE SECTION
// ============================================================================

function PriceSection({
	form,
	defaultPriceRange,
	maxPriceInEuros,
}: {
	form: FilterForm;
	defaultPriceRange: [number, number];
	maxPriceInEuros: number;
}) {
	return (
		<form.Field name="priceRange">
			{(field: FilterFieldApi) => {
				const hasCustomPrice =
					field.state.value[0] !== defaultPriceRange[0] ||
					field.state.value[1] !== defaultPriceRange[1];
				return (
					<AccordionItem value="price">
						<AccordionTrigger headingLevel={3} className="hover:no-underline">
							<SectionHeader
								label="Prix"
								count={hasCustomPrice ? 1 : 0}
								badgeContent={
									hasCustomPrice ? `${field.state.value[0]}€ - ${field.state.value[1]}€` : undefined
								}
								onReset={() => field.handleChange(defaultPriceRange)}
							/>
						</AccordionTrigger>
						<AccordionContent>
							<PriceRangeInputs
								value={field.state.value}
								onChange={field.handleChange}
								maxPrice={maxPriceInEuros}
							/>
						</AccordionContent>
					</AccordionItem>
				);
			}}
		</form.Field>
	);
}

// ============================================================================
// COLLECTIONS SECTION
// ============================================================================

function CollectionsSection({
	form,
	collections,
}: {
	form: FilterForm;
	collections: Array<{ id: string; name: string }>;
}) {
	if (collections.length === 0) return null;

	return (
		<form.Field name="collectionIds" mode="array">
			{(field: FilterFieldApi) => (
				<AccordionItem value="collections">
					<AccordionTrigger headingLevel={3} className="hover:no-underline">
						<SectionHeader
							label="Collections"
							count={field.state.value.length}
							onReset={() => field.handleChange([])}
						/>
					</AccordionTrigger>
					<AccordionContent>
						<div className="max-h-48 space-y-1 overflow-y-auto">
							{collections.map((collection) => {
								const isSelected = field.state.value.includes(collection.id);
								return (
									<CheckboxFilterItem
										key={collection.id}
										id={`admin-collection-${collection.id}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(collection.id);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(collection.id);
												field.removeValue(index);
											}
										}}
									>
										{collection.name}
									</CheckboxFilterItem>
								);
							})}
						</div>
					</AccordionContent>
				</AccordionItem>
			)}
		</form.Field>
	);
}

// ============================================================================
// AVAILABILITY SECTION
// ============================================================================

function AvailabilitySection({ form }: { form: FilterForm }) {
	return (
		<AccordionItem value="availability">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader
					label="Disponibilité"
					count={(form.state.values.stockStatus ? 1 : 0) + (form.state.values.onSale ? 1 : 0)}
					onReset={() => {
						form.setFieldValue("stockStatus", null);
						form.setFieldValue("onSale", false);
					}}
				/>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-1">
					<form.Field name="stockStatus">
						{(field: FilterFieldApi) => (
							<>
								<CheckboxFilterItem
									id="admin-filter-in-stock"
									checked={field.state.value === "in_stock"}
									onCheckedChange={(checked) => {
										field.handleChange(checked ? "in_stock" : null);
									}}
								>
									En stock
								</CheckboxFilterItem>
								<CheckboxFilterItem
									id="admin-filter-out-of-stock"
									checked={field.state.value === "out_of_stock"}
									onCheckedChange={(checked) => {
										field.handleChange(checked ? "out_of_stock" : null);
									}}
								>
									Rupture de stock
								</CheckboxFilterItem>
							</>
						)}
					</form.Field>
					<form.Field name="onSale">
						{(field: FilterFieldApi) => (
							<CheckboxFilterItem
								id="admin-filter-on-sale"
								checked={field.state.value}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true);
								}}
							>
								En promotion
							</CheckboxFilterItem>
						)}
					</form.Field>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

// ============================================================================
// DATES SECTION
// ============================================================================

function DatesSection({ form }: { form: FilterForm }) {
	return (
		<AccordionItem value="dates" className="border-b-0">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader
					label="Dates"
					count={
						(form.state.values.createdAfter ? 1 : 0) +
						(form.state.values.createdBefore ? 1 : 0) +
						(form.state.values.updatedAfter ? 1 : 0) +
						(form.state.values.updatedBefore ? 1 : 0)
					}
					onReset={() => {
						form.setFieldValue("createdAfter", "");
						form.setFieldValue("createdBefore", "");
						form.setFieldValue("updatedAfter", "");
						form.setFieldValue("updatedBefore", "");
					}}
				/>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-4">
					<fieldset className="space-y-2">
						<legend className="text-foreground text-sm font-medium">Date de création</legend>
						<div className="flex items-center gap-2">
							<form.Field name="createdAfter">
								{(field: FilterFieldApi) => (
									<div className="flex-1">
										<Label htmlFor="admin-created-after" className="text-muted-foreground text-xs">
											Après
										</Label>
										<Input
											id="admin-created-after"
											type="date"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-10 text-sm"
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="createdBefore">
								{(field: FilterFieldApi) => (
									<div className="flex-1">
										<Label htmlFor="admin-created-before" className="text-muted-foreground text-xs">
											Avant
										</Label>
										<Input
											id="admin-created-before"
											type="date"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-10 text-sm"
										/>
									</div>
								)}
							</form.Field>
						</div>
					</fieldset>
					<fieldset className="space-y-2">
						<legend className="text-foreground text-sm font-medium">Date de modification</legend>
						<div className="flex items-center gap-2">
							<form.Field name="updatedAfter">
								{(field: FilterFieldApi) => (
									<div className="flex-1">
										<Label htmlFor="admin-updated-after" className="text-muted-foreground text-xs">
											Après
										</Label>
										<Input
											id="admin-updated-after"
											type="date"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-10 text-sm"
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="updatedBefore">
								{(field: FilterFieldApi) => (
									<div className="flex-1">
										<Label htmlFor="admin-updated-before" className="text-muted-foreground text-xs">
											Avant
										</Label>
										<Input
											id="admin-updated-before"
											type="date"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-10 text-sm"
										/>
									</div>
								)}
							</form.Field>
						</div>
					</fieldset>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

// ============================================================================
// COMPOSITE - All filter sections together
// ============================================================================

export interface ProductsFilterSectionsProps {
	form: FilterForm;
	productTypes: Array<{ id: string; label: string; slug: string }>;
	collections: Array<{ id: string; name: string }>;
	sortedColors: GetColorsReturn["colors"];
	sortedMaterials: MaterialOption[];
	filteredColors: GetColorsReturn["colors"];
	filteredMaterials: MaterialOption[];
	colorSearch: string;
	setColorSearch: (value: string) => void;
	materialSearch: string;
	setMaterialSearch: (value: string) => void;
	defaultPriceRange: [number, number];
	maxPriceInEuros: number;
}

export function ProductsFilterSections({
	form,
	productTypes,
	collections,
	sortedColors,
	sortedMaterials,
	filteredColors,
	filteredMaterials,
	colorSearch,
	setColorSearch,
	materialSearch,
	setMaterialSearch,
	defaultPriceRange,
	maxPriceInEuros,
}: ProductsFilterSectionsProps) {
	return (
		<>
			<StatusSection form={form} />
			<ProductTypesSection form={form} productTypes={productTypes} />
			<PriceSection
				form={form}
				defaultPriceRange={defaultPriceRange}
				maxPriceInEuros={maxPriceInEuros}
			/>
			<ColorsSection
				form={form}
				sortedColors={sortedColors}
				filteredColors={filteredColors}
				colorSearch={colorSearch}
				setColorSearch={setColorSearch}
			/>
			<MaterialsSection
				form={form}
				sortedMaterials={sortedMaterials}
				filteredMaterials={filteredMaterials}
				materialSearch={materialSearch}
				setMaterialSearch={setMaterialSearch}
			/>
			<CollectionsSection form={form} collections={collections} />
			<AvailabilitySection form={form} />
			<DatesSection form={form} />
		</>
	);
}
