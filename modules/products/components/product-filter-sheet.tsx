"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Separator } from "@/shared/components/ui/separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import { Slider } from "@/shared/components/ui/slider";
import { cn } from "@/shared/utils/cn";
import { useForm } from "@tanstack/react-form";
import { Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

interface FilterSheetProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	maxPriceInEuros: number;
	className?: string;
}

// Types pour TanStack Form
interface FilterFormData {
	colors: string[];
	materials: string[];
	priceRange: [number, number];
}

export function ProductFilterSheet({
	colors = [],
	materials = [],
	maxPriceInEuros,
	className,
}: FilterSheetProps) {
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
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];

		// Parser les paramètres URL (directement sans préfixe)
		searchParams.forEach((value, key) => {
			if (key === "color") {
				colors.push(value);
			} else if (key === "material") {
				materials.push(value);
			} else if (key === "priceMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0];
			} else if (key === "priceMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1];
			}
		});

		return {
			colors: [...new Set(colors)], // Dédoublonner
			materials: [...new Set(materials)], // Dédoublonner
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
		const filterKeys = ["color", "material", "priceMin", "priceMax"];
		filterKeys.forEach((key) => {
			params.delete(key);
		});

		// Reset page to 1 when applying filters
		params.set("page", "1");

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
			priceRange: [DEFAULT_PRICE_RANGE[0], DEFAULT_PRICE_RANGE[1]],
		};

		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		// Supprimer tous les paramètres de filtres
		const filterKeys = ["color", "material", "priceMin", "priceMax"];
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
			if (key === "color") {
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
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"relative h-11 w-11 p-0",
						"sm:h-auto sm:w-auto sm:px-3 sm:gap-2 sm:text-sm sm:font-medium",
						"border-border/60 hover:border-border hover:bg-accent/50 transition-all duration-200",
						activeFiltersCount > 0 && "border-primary/30 bg-primary/5",
						className
					)}
					aria-label={`Filtres${activeFiltersCount > 0 ? ` (${activeFiltersCount} actifs)` : ""}`}
				>
					<Filter className="w-4 h-4" />
					<span className="hidden sm:inline">Filtres</span>
					{activeFiltersCount > 0 && (
						<Badge
							variant="secondary"
							className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-primary text-primary-foreground"
						>
							{activeFiltersCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>

			<SheetContent
				side="right"
				className="w-80 sm:w-96 p-0 flex flex-col h-full"
			>
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
							e.stopPropagation();
							form.handleSubmit();
						}}
						data-pending={isPending ? "" : undefined}
					>
						<div className="px-6 py-4 space-y-6">
							{/* Couleurs - dynamiques depuis la base */}
							<form.Field name="colors" mode="array">
								{(field) => (
									<div className="space-y-3">
										<h4 className="font-medium text-sm text-foreground">
											Couleurs
										</h4>
										<div className="space-y-2">
											{colors.map((color) => {
												const isSelected = field.state.value.includes(
													color.slug
												);
												return (
													<div
														key={color.slug}
														className="flex items-center space-x-2"
													>
														<Checkbox
															id={`color-${color.slug}`}
															checked={isSelected}
															onCheckedChange={(checked) => {
																if (checked && !isSelected) {
																	field.pushValue(color.slug);
																} else if (!checked && isSelected) {
																	const index = field.state.value.indexOf(
																		color.slug
																	);
																	field.removeValue(index);
																}
															}}
															className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
														/>
														<Label
															htmlFor={`color-${color.slug}`}
															className="text-sm font-normal cursor-pointer flex-1 flex items-center gap-2"
														>
															<span
																className="w-4 h-4 rounded-full border-2 border-border shrink-0"
																style={{ backgroundColor: color.hex }}
																aria-hidden="true"
															/>
															<span className="flex-1">{color.name}</span>
															{color._count?.skus && (
																<span className="text-xs text-muted-foreground">
																	({color._count.skus})
																</span>
															)}
														</Label>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</form.Field>

							{/* Matériaux - dynamiques depuis la base */}
							{materials.length > 0 && (
								<>
									<Separator />
									<form.Field name="materials" mode="array">
										{(field) => (
											<div className="space-y-3">
												<h4 className="font-medium text-sm text-foreground">
													Matériaux
												</h4>
												<div className="space-y-2">
													{materials.map((material) => {
														const isSelected = field.state.value.includes(
															material.id
														);
														return (
															<div
																key={material.id}
																className="flex items-center space-x-2"
															>
																<Checkbox
																	id={`material-${material.id}`}
																	checked={isSelected}
																	onCheckedChange={(checked) => {
																		if (checked && !isSelected) {
																			field.pushValue(material.id);
																		} else if (!checked && isSelected) {
																			const index = field.state.value.indexOf(
																				material.id
																			);
																			field.removeValue(index);
																		}
																	}}
																	className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
																/>
																<Label
																	htmlFor={`material-${material.id}`}
																	className="text-sm font-normal cursor-pointer flex-1"
																>
																	{material.name}
																</Label>
															</div>
														);
													})}
												</div>
											</div>
										)}
									</form.Field>
								</>
							)}

							<Separator />

							{/* Prix */}
							<form.Field name="priceRange">
								{(field) => (
									<div className="space-y-3">
										<h4 className="font-medium text-sm text-foreground">
											Prix (€)
										</h4>
										<div className="space-y-3">
											<Slider
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange([value[0], value[1]])
												}
												max={maxPriceInEuros}
												min={0}
												step={5}
												className="w-full"
											/>
											<div className="flex items-center justify-between text-sm text-muted-foreground">
												<span>{field.state.value[0]}€</span>
												<span>{field.state.value[1]}€</span>
											</div>
										</div>
									</div>
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
