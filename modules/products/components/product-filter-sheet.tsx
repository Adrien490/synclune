"use client";

import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import { useForm } from "@tanstack/react-form";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { PRODUCT_FILTER_DIALOG_ID } from "./product-filter-fab";
import { PriceRangeInputs } from "./price-range-inputs";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

interface ProductTypeOption {
	slug: string;
	label: string;
}

interface FilterSheetProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	maxPriceInEuros: number;
}

// Types pour TanStack Form
interface FilterFormData {
	colors: string[];
	materials: string[];
	productTypes: string[];
	priceRange: [number, number];
}

export function ProductFilterSheet({
	colors = [],
	materials = [],
	productTypes = [],
	maxPriceInEuros,
}: FilterSheetProps) {
	// Utilise Zustand pour gerer l'etat d'ouverture
	const { isOpen, open, close } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	// Range de prix dynamique basé sur les données réelles
	const DEFAULT_PRICE_RANGE = [0, maxPriceInEuros];
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialisation des valeurs depuis les paramètres URL
	const initialValues = ((): FilterFormData => {
		const colors: string[] = [];
		const materials: string[] = [];
		const types: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];

		// Parser les paramètres URL (directement sans préfixe)
		searchParams.forEach((value, key) => {
			if (key === "color") {
				colors.push(value);
			} else if (key === "material") {
				materials.push(value);
			} else if (key === "type") {
				types.push(value);
			} else if (key === "priceMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0];
			} else if (key === "priceMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1];
			}
		});

		return {
			colors: [...new Set(colors)], // Dédoublonner
			materials: [...new Set(materials)], // Dédoublonner
			productTypes: [...new Set(types)], // Dédoublonner
			priceRange: [priceMin, priceMax],
		};
	})();

	// TanStack Form
	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			applyFilters(value);
		},
	});

	// Application des filtres selon le schéma réel
	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		// Nettoyer tous les anciens filtres (directement par nom)
		const filterKeys = ["color", "material", "type", "priceMin", "priceMax"];
		filterKeys.forEach((key) => {
			params.delete(key);
		});

		// Reset page to 1 when applying filters
		params.set("page", "1");

		// Types de produits (schéma: type - peut être string ou array)
		if (formData.productTypes.length > 0) {
			if (formData.productTypes.length === 1) {
				params.set("type", formData.productTypes[0]);
			} else {
				formData.productTypes.forEach((type) => params.append("type", type));
			}
		}

		// Couleurs (schéma: color - peut être string ou array)
		if (formData.colors.length > 0) {
			if (formData.colors.length === 1) {
				params.set("color", formData.colors[0]);
			} else {
				formData.colors.forEach((color) => params.append("color", color));
			}
		}

		// Matériaux (schéma: material - peut être string ou array)
		if (formData.materials.length > 0) {
			if (formData.materials.length === 1) {
				params.set("material", formData.materials[0]);
			} else {
				formData.materials.forEach((material) => params.append("material", material));
			}
		}

		// Prix (schéma: priceMin/priceMax - numbers)
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("priceMin", formData.priceRange[0].toString());
			params.set("priceMax", formData.priceRange[1].toString());
		}

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`);
		});
	};

	// Réinitialisation des filtres
	const clearAllFilters = () => {
		const defaultValues: FilterFormData = {
			colors: [],
			materials: [],
			productTypes: [],
			priceRange: [DEFAULT_PRICE_RANGE[0], DEFAULT_PRICE_RANGE[1]],
		};

		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		// Supprimer tous les paramètres de filtres
		const filterKeys = ["color", "material", "type", "priceMin", "priceMax"];
		filterKeys.forEach((key) => {
			params.delete(key);
		});
		params.set("page", "1");

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`);
		});
	};

	// Calculer si des filtres sont actifs depuis l'URL (source de vérité)
	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;

		// Compter depuis l'URL plutôt que l'état local
		searchParams.forEach((value, key) => {
			// Ignorer les paramètres de navigation
			if (["page", "perPage", "sortBy", "search"].includes(key)) {
				return;
			}

			// Compter les filtres actifs
			if (key === "type") {
				count += 1; // Chaque type compte pour 1
			} else if (key === "color") {
				count += 1; // Chaque couleur compte pour 1
			} else if (key === "material") {
				count += 1; // Chaque matériau compte pour 1
			} else if (key === "priceMin" || key === "priceMax") {
				// Éviter de compter deux fois pour le prix
				if (key === "priceMin") count += 1;
			}
		});

		return {
			hasActiveFilters: count > 0,
			activeFiltersCount: count,
		};
	})();

	return (
		<Sheet direction="right" open={isOpen} onOpenChange={(newOpen) => (newOpen ? open() : close())}>

			<SheetContent className="w-full sm:w-[400px] md:w-[440px] p-0 flex flex-col h-full">
				<SheetHeader className="px-6 py-4 border-b bg-background/95 shrink-0">
					<div className="flex items-center justify-between">
						<div>
							<SheetTitle className="text-lg font-semibold">Filtres</SheetTitle>
							<SheetDescription className="text-sm text-muted-foreground">
								Affine ta recherche
							</SheetDescription>
						</div>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearAllFilters}
								className="text-xs hover:bg-destructive/10 hover:text-destructive"
							>
								<X className="w-3 h-3 mr-1" />
								Tout effacer
							</Button>
						)}
					</div>
				</SheetHeader>

				<ScrollArea className="flex-1 min-h-0">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
						data-pending={isPending ? "" : undefined}
					>
						<div className="px-6 py-4 space-y-6">
							{/* Types de produits */}
							{productTypes.length > 0 && (
								<form.Field name="productTypes" mode="array">
									{(field) => (
										<fieldset className="space-y-1 border-0 p-0 m-0">
											<legend className="font-medium text-sm text-foreground mb-2">
												Types de bijoux
											</legend>
											{productTypes.map((type) => {
												const isSelected = field.state.value.includes(type.slug);
												return (
													<CheckboxFilterItem
														key={type.slug}
														id={`type-${type.slug}`}
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
										</fieldset>
									)}
								</form.Field>
							)}

							{/* Couleurs - dynamiques depuis la base */}
							{productTypes.length > 0 && colors.length > 0 && <Separator />}
							<form.Field name="colors" mode="array">
								{(field) => (
									<fieldset className="space-y-1 border-0 p-0 m-0">
										<legend className="font-medium text-sm text-foreground mb-2">
											Couleurs
										</legend>
										{colors.map((color) => {
											const isSelected = field.state.value.includes(color.slug);
											return (
												<CheckboxFilterItem
													key={color.slug}
													id={`color-${color.slug}`}
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
															className="w-5 h-5 rounded-full border border-border/50 shadow-sm ring-1 ring-inset ring-black/5"
															style={{ backgroundColor: color.hex }}
														/>
													}
													count={color._count?.skus}
												>
													{color.name}
												</CheckboxFilterItem>
											);
										})}
									</fieldset>
								)}
							</form.Field>

							{/* Matériaux - dynamiques depuis la base */}
							{materials.length > 0 && (
								<>
									<Separator />
									<form.Field name="materials" mode="array">
										{(field) => (
											<fieldset className="space-y-1 border-0 p-0 m-0">
												<legend className="font-medium text-sm text-foreground mb-2">
													Matériaux
												</legend>
												{materials.map((material) => {
													const isSelected = field.state.value.includes(material.id);
													return (
														<CheckboxFilterItem
															key={material.id}
															id={`material-${material.id}`}
															checked={isSelected}
															onCheckedChange={(checked) => {
																if (checked && !isSelected) {
																	field.pushValue(material.id);
																} else if (!checked && isSelected) {
																	const index = field.state.value.indexOf(material.id);
																	field.removeValue(index);
																}
															}}
														>
															{material.name}
														</CheckboxFilterItem>
													);
												})}
											</fieldset>
										)}
									</form.Field>
								</>
							)}

							<Separator />

							{/* Prix */}
							<form.Field name="priceRange">
								{(field) => (
									<PriceRangeInputs
										value={field.state.value}
										onChange={field.handleChange}
										maxPrice={maxPriceInEuros}
									/>
								)}
							</form.Field>
						</div>
					</form>
				</ScrollArea>

				<SheetFooter className="px-6 py-4 border-t bg-background/95 shrink-0">
					<ButtonGroup className="w-full" aria-label="Filter actions">
						<SheetClose asChild className="flex-1">
							<Button variant="outline">Annuler</Button>
						</SheetClose>
						<SheetClose asChild className="flex-1">
							<Button type="submit" onClick={() => form.handleSubmit()}>
								Appliquer
							</Button>
						</SheetClose>
					</ButtonGroup>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
