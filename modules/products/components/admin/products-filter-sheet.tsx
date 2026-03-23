"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { Check, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useDeferredValue,
	useRef,
	useState,
	useTransition,
} from "react";
import { useForm } from "@tanstack/react-form";
import { PriceRangeInputs } from "../price-range-inputs";
import { isLightColor, getContrastTextColor } from "@/modules/colors/utils/color-contrast.utils";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// TYPES
// ============================================================================

const EMPTY_PRODUCT_TYPES: Array<{ id: string; label: string; slug: string }> = [];
const EMPTY_COLLECTIONS: Array<{ id: string; name: string }> = [];
const EMPTY_COLORS: GetColorsReturn["colors"] = [];
const EMPTY_MATERIALS: MaterialOption[] = [];

interface ProductsFilterSheetProps {
	className?: string;
	productTypes?: Array<{ id: string; label: string; slug: string }>;
	collections?: Array<{ id: string; name: string }>;
	colors?: GetColorsReturn["colors"];
	materials?: MaterialOption[];
	maxPriceInCents?: number;
}

interface AdminFilterFormData {
	priceRange: [number, number];
	typeSlugs: string[];
	collectionIds: string[];
	colorSlugs: string[];
	materialSlugs: string[];
	stockStatus: string | null;
	onSale: boolean;
	createdAfter: string;
	createdBefore: string;
	updatedAfter: string;
	updatedBefore: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SEARCH_THRESHOLD = 8;

const ALL_FILTER_KEYS = [
	"filter_priceMin",
	"filter_priceMax",
	"filter_typeId",
	"filter_collectionId",
	"filter_color",
	"filter_material",
	"filter_stockStatus",
	"filter_onSale",
	"filter_createdAfter",
	"filter_createdBefore",
	"filter_updatedAfter",
	"filter_updatedBefore",
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionHeader({
	label,
	count,
	badgeContent,
	onReset,
}: {
	label: string;
	count?: number;
	badgeContent?: React.ReactNode;
	onReset?: () => void;
}) {
	return (
		<div className="flex flex-1 items-center gap-2">
			<span>{label}</span>
			{count !== undefined && count > 0 && (
				<Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
					{badgeContent ?? count}
				</Badge>
			)}
			{onReset && count !== undefined && count > 0 && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onReset();
					}}
					className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-ring ml-auto flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					aria-label={`Effacer le filtre ${label}`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</div>
	);
}

function SectionSearch({
	value,
	onChange,
	placeholder = "Rechercher...",
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<div className="relative mb-2">
			<Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
			<Input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="h-10 pr-3 pl-8 text-xs"
			/>
		</div>
	);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductsFilterSheet({
	className,
	productTypes = EMPTY_PRODUCT_TYPES,
	collections = EMPTY_COLLECTIONS,
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	maxPriceInCents = 50000,
}: ProductsFilterSheetProps) {
	const maxPriceInEuros = Math.ceil(maxPriceInCents / 100);
	const DEFAULT_PRICE_RANGE: [number, number] = [0, maxPriceInEuros];

	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// P1.1: Controlled open state for sync on open
	const [isOpen, setIsOpen] = useState(false);

	// P1.2: Focus restoration (WCAG 2.4.3)
	const triggerRef = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (isOpen) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [isOpen]);

	// Search state for long lists
	const [colorSearch, setColorSearch] = useState("");
	const [materialSearch, setMaterialSearch] = useState("");
	const deferredColorSearch = useDeferredValue(colorSearch);
	const deferredMaterialSearch = useDeferredValue(materialSearch);

	const getValuesFromURL = (): AdminFilterFormData => {
		const typeSlugs: string[] = [];
		const collectionIds: string[] = [];
		const colorSlugs: string[] = [];
		const materialSlugs: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];
		let stockStatus: string | null = null;
		let onSale = false;
		let createdAfter = "";
		let createdBefore = "";
		let updatedAfter = "";
		let updatedBefore = "";

		searchParams.forEach((value, key) => {
			if (key === "filter_typeId") typeSlugs.push(value);
			else if (key === "filter_collectionId") collectionIds.push(value);
			else if (key === "filter_color") colorSlugs.push(value);
			else if (key === "filter_material") materialSlugs.push(value);
			else if (key === "filter_priceMin") {
				const n = Number(value);
				if (!isNaN(n)) priceMin = Math.round(n / 100);
			} else if (key === "filter_priceMax") {
				const n = Number(value);
				if (!isNaN(n)) priceMax = Math.round(n / 100);
			} else if (key === "filter_stockStatus") {
				if (value === "in_stock" || value === "out_of_stock") stockStatus = value;
			} else if (key === "filter_onSale") {
				onSale = value === "true";
			} else if (key === "filter_createdAfter") createdAfter = value;
			else if (key === "filter_createdBefore") createdBefore = value;
			else if (key === "filter_updatedAfter") updatedAfter = value;
			else if (key === "filter_updatedBefore") updatedBefore = value;
		});

		return {
			priceRange: [priceMin, priceMax],
			typeSlugs: [...new Set(typeSlugs)],
			collectionIds: [...new Set(collectionIds)],
			colorSlugs: [...new Set(colorSlugs)],
			materialSlugs: [...new Set(materialSlugs)],
			stockStatus,
			onSale,
			createdAfter,
			createdBefore,
			updatedAfter,
			updatedBefore,
		};
	};

	const initialValues = getValuesFromURL();

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: AdminFilterFormData }) => {
			applyFilters(value);
		},
	});

	// P1.1: Sync form values from URL when sheet opens or URL changes
	const onSheetSync = useEffectEvent(() => {
		const values = getValuesFromURL();
		form.reset(values);
		setColorSearch("");
		setMaterialSearch("");
	});

	useEffect(() => {
		if (isOpen) {
			onSheetSync();
		}
	}, [isOpen, searchParams]);

	const applyFilters = (formData: AdminFilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		ALL_FILTER_KEYS.forEach((key) => params.delete(key));
		params.set("page", "1");

		// Types (slug-based)
		formData.typeSlugs.forEach((slug) => params.append("filter_typeId", slug));

		// Collections
		formData.collectionIds.forEach((id) => params.append("filter_collectionId", id));

		// Colors
		formData.colorSlugs.forEach((slug) => params.append("filter_color", slug));

		// Materials
		formData.materialSlugs.forEach((slug) => params.append("filter_material", slug));

		// Price (convert euros to cents)
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("filter_priceMin", (formData.priceRange[0] * 100).toString());
			params.set("filter_priceMax", (formData.priceRange[1] * 100).toString());
		}

		// Stock status
		if (formData.stockStatus) {
			params.set("filter_stockStatus", formData.stockStatus);
		}

		// On sale
		if (formData.onSale) {
			params.set("filter_onSale", "true");
		}

		// Date filters
		if (formData.createdAfter) params.set("filter_createdAfter", formData.createdAfter);
		if (formData.createdBefore) params.set("filter_createdBefore", formData.createdBefore);
		if (formData.updatedAfter) params.set("filter_updatedAfter", formData.updatedAfter);
		if (formData.updatedBefore) params.set("filter_updatedBefore", formData.updatedBefore);

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			priceRange: DEFAULT_PRICE_RANGE,
			typeSlugs: [],
			collectionIds: [],
			colorSlugs: [],
			materialSlugs: [],
			stockStatus: null,
			onSale: false,
			createdAfter: "",
			createdBefore: "",
			updatedAfter: "",
			updatedBefore: "",
		});

		const params = new URLSearchParams(searchParams.toString());
		ALL_FILTER_KEYS.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		searchParams.forEach((_, key) => {
			if (ALL_FILTER_KEYS.includes(key)) count += 1;
		});
		// Group priceMin/priceMax as 1
		const hasPriceMin = searchParams.has("filter_priceMin");
		const hasPriceMax = searchParams.has("filter_priceMax");
		if (hasPriceMin && hasPriceMax) count -= 1;
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	// Sort colors and materials by count (descending)
	const sortedColors = [...colors].sort((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = [...materials].sort(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);

	// Filter lists by deferred search term
	const filteredColors = deferredColorSearch
		? sortedColors.filter((c) => c.name.toLowerCase().includes(deferredColorSearch.toLowerCase()))
		: sortedColors;
	const filteredMaterials = deferredMaterialSearch
		? sortedMaterials.filter((m) =>
				m.name.toLowerCase().includes(deferredMaterialSearch.toLowerCase()),
			)
		: sortedMaterials;

	// Default open sections: types + price + any section with active filters
	const defaultOpenSections = (() => {
		const sections = ["types", "price"];
		if (initialValues.colorSlugs.length > 0) sections.push("colors");
		if (initialValues.materialSlugs.length > 0) sections.push("materials");
		if (initialValues.stockStatus || initialValues.onSale) sections.push("availability");
		if (
			initialValues.createdAfter ||
			initialValues.createdBefore ||
			initialValues.updatedAfter ||
			initialValues.updatedBefore
		)
			sections.push("dates");
		return sections;
	})();

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={(newOpen) => {
				if (newOpen) {
					setIsOpen(true);
				} else {
					setIsOpen(false);
					triggerRef.current?.focus();
				}
			}}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
			title="Filtres"
			description="Affinez votre recherche"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<Accordion
					type="multiple"
					defaultValue={defaultOpenSections}
					className="w-full"
					aria-label="Filtres de recherche"
				>
					{/* 1. Types de produit */}
					{productTypes.length > 0 && (
						<form.Field name="typeSlugs" mode="array">
							{(field) => (
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
					)}

					{/* 2. Prix */}
					<form.Field name="priceRange">
						{(field) => {
							const hasCustomPrice =
								field.state.value[0] !== DEFAULT_PRICE_RANGE[0] ||
								field.state.value[1] !== DEFAULT_PRICE_RANGE[1];
							return (
								<AccordionItem value="price">
									<AccordionTrigger headingLevel={3} className="hover:no-underline">
										<SectionHeader
											label="Prix"
											count={hasCustomPrice ? 1 : 0}
											badgeContent={
												hasCustomPrice
													? `${field.state.value[0]}€ - ${field.state.value[1]}€`
													: undefined
											}
											onReset={() => field.handleChange(DEFAULT_PRICE_RANGE)}
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

					{/* 3. Couleurs */}
					{sortedColors.length > 0 && (
						<form.Field name="colorSlugs" mode="array">
							{(field) => (
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
												<p className="text-muted-foreground py-2 text-center text-xs">
													Aucun résultat
												</p>
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
					)}

					{/* 4. Matériaux */}
					{sortedMaterials.length > 0 && (
						<form.Field name="materialSlugs" mode="array">
							{(field) => (
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
												<p className="text-muted-foreground py-2 text-center text-xs">
													Aucun résultat
												</p>
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
					)}

					{/* 5. Collections */}
					{collections.length > 0 && (
						<form.Field name="collectionIds" mode="array">
							{(field) => (
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
					)}

					{/* 6. Stock & Disponibilité */}
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
									{(field) => (
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
									{(field) => (
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

					{/* 7. Dates */}
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
											{(field) => (
												<div className="flex-1">
													<Label
														htmlFor="admin-created-after"
														className="text-muted-foreground text-xs"
													>
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
											{(field) => (
												<div className="flex-1">
													<Label
														htmlFor="admin-created-before"
														className="text-muted-foreground text-xs"
													>
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
									<legend className="text-foreground text-sm font-medium">
										Date de modification
									</legend>
									<div className="flex items-center gap-2">
										<form.Field name="updatedAfter">
											{(field) => (
												<div className="flex-1">
													<Label
														htmlFor="admin-updated-after"
														className="text-muted-foreground text-xs"
													>
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
											{(field) => (
												<div className="flex-1">
													<Label
														htmlFor="admin-updated-before"
														className="text-muted-foreground text-xs"
													>
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
				</Accordion>
			</form>
		</FilterSheetWrapper>
	);
}
