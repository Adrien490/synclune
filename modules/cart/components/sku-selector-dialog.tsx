"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { useAppForm } from "@/shared/components/forms";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import type { Product } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { getPrimaryImageForList } from "@/modules/products/services/product-list-helpers";
import { slugify } from "@/shared/utils/generate-slug";

export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

export type SkuSelectorDialogData = {
	product: Product;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	[key: string]: unknown;
};

/**
 * Dialog de sélection de variante pour ajout rapide au panier
 *
 * S'affiche quand l'utilisateur clique sur "Ajouter au panier"
 * sur une ProductCard avec plusieurs variantes.
 *
 * Utilise TanStack Form (useAppForm) pour la gestion du formulaire
 */
export function SkuSelectorDialog() {
	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(
		SKU_SELECTOR_DIALOG_ID
	);
	const { action, isPending } = useAddToCart({
		openSheetOnSuccess: true,
		onSuccess: close, // Ferme le dialog après ajout réussi
	});

	const form = useAppForm({
		defaultValues: {
			color: "",
			material: "",
			size: "",
			quantity: 1,
		},
	});

	const product = data?.product;
	const preselectedColor = data?.preselectedColor;

	// Reset form quand le dialog s'ouvre avec un nouveau produit
	// Utilise la couleur pré-sélectionnée si disponible
	useEffect(() => {
		if (isOpen && product) {
			form.reset({
				color: preselectedColor || "",
				material: "",
				size: "",
				quantity: 1,
			});
		}
	}, [isOpen, product, preselectedColor, form]);

	// Handler de fermeture
	const handleClose = () => {
		form.reset();
		close();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	if (!product) {
		return (
			<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
				<ResponsiveDialogContent className="sm:max-w-[520px]">
					<ResponsiveDialogHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-32 mt-1" />
					</ResponsiveDialogHeader>
					<div className="space-y-6 py-4">
						{/* Image + Prix skeleton */}
						<div className="flex gap-4">
							<Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg shrink-0" />
							<div className="flex flex-col justify-center gap-2">
								<Skeleton className="h-8 w-20" />
							</div>
						</div>
						{/* Sélecteurs skeleton */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<div className="flex flex-wrap gap-2">
								<Skeleton className="h-11 w-24 rounded-lg" />
								<Skeleton className="h-11 w-28 rounded-lg" />
								<Skeleton className="h-11 w-20 rounded-lg" />
							</div>
						</div>
						{/* Quantité skeleton */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<div className="flex items-center gap-3">
								<Skeleton className="h-11 w-11 rounded-md" />
								<Skeleton className="h-6 w-8" />
								<Skeleton className="h-11 w-11 rounded-md" />
							</div>
						</div>
					</div>
					<ResponsiveDialogFooter>
						<Skeleton className="h-11 w-full rounded-md" />
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		);
	}

	// Extraire les variantes disponibles
	const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];

	// Couleurs uniques
	const uniqueColors = new Map<
		string,
		{ slug: string; hex: string; name: string }
	>();
	for (const sku of activeSkus) {
		if (sku.color?.slug && sku.color?.hex) {
			if (!uniqueColors.has(sku.color.slug)) {
				uniqueColors.set(sku.color.slug, {
					slug: sku.color.slug,
					hex: sku.color.hex,
					name: sku.color.name,
				});
			}
		}
	}
	const colors = Array.from(uniqueColors.values());

	// Matériaux uniques
	const uniqueMaterials = new Map<string, { slug: string; name: string }>();
	for (const sku of activeSkus) {
		if (sku.material?.name) {
			const slug = slugify(sku.material.name);
			if (!uniqueMaterials.has(slug)) {
				uniqueMaterials.set(slug, {
					slug,
					name: sku.material.name,
				});
			}
		}
	}
	const materials = Array.from(uniqueMaterials.values());

	// Tailles uniques
	const uniqueSizes = new Set<string>();
	for (const sku of activeSkus) {
		if (sku.size) {
			uniqueSizes.add(sku.size);
		}
	}
	const sizes = Array.from(uniqueSizes);

	// Déterminer si la taille est requise
	const hasAdjustableSizes = sizes.some((s) =>
		s.toLowerCase().includes("ajustable")
	);
	const requiresSize =
		!hasAdjustableSizes &&
		sizes.length > 0 &&
		PRODUCT_TYPES_REQUIRING_SIZE.includes(
			product.type?.slug as (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number]
		);

	// Filtrer les SKUs compatibles
	const filterCompatibleSkus = (selectors: {
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	}) => {
		return activeSkus.filter((sku) => {
			if (sku.inventory <= 0) return false;
			if (selectors.colorSlug && sku.color?.slug !== selectors.colorSlug)
				return false;
			if (selectors.materialSlug) {
				const skuMaterialSlug = sku.material?.name
					? slugify(sku.material.name)
					: null;
				if (skuMaterialSlug !== selectors.materialSlug) return false;
			}
			if (selectors.size && sku.size !== selectors.size) return false;
			return true;
		});
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Choisir une variante</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{product.title}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{/* Conteneur scrollable avec indicateur de défilement */}
				<div className="relative flex-1 min-h-0">
					<form action={action} className="space-y-6 py-4 overflow-y-auto h-full pr-1">
					{/* Subscribe pour obtenir les valeurs et calculer le SKU */}
					<form.Subscribe selector={(state) => state.values}>
						{(values) => {
							const selectedColor = values.color;
							const selectedMaterial = values.material;
							const selectedSize = values.size;
							const quantity = values.quantity;
							// Disponibilité des options
							const isColorAvailable = (colorSlug: string) =>
								filterCompatibleSkus({
									colorSlug,
									materialSlug: selectedMaterial || undefined,
									size: selectedSize || undefined,
								}).length > 0;

							const isMaterialAvailable = (materialSlug: string) =>
								filterCompatibleSkus({
									colorSlug: selectedColor || undefined,
									materialSlug,
									size: selectedSize || undefined,
								}).length > 0;

							const isSizeAvailable = (size: string) =>
								filterCompatibleSkus({
									colorSlug: selectedColor || undefined,
									materialSlug: selectedMaterial || undefined,
									size,
								}).length > 0;

							// Trouver le SKU correspondant
							const selectedSku = activeSkus.find((sku) => {
								if (sku.inventory <= 0) return false;
								if (colors.length > 1) {
									if (!selectedColor || sku.color?.slug !== selectedColor)
										return false;
								}
								if (materials.length > 1) {
									if (!selectedMaterial) return false;
									const skuMaterialSlug = sku.material?.name
										? slugify(sku.material.name)
										: null;
									if (skuMaterialSlug !== selectedMaterial) return false;
								}
								if (requiresSize && sizes.length > 0) {
									if (!selectedSize || sku.size !== selectedSize) return false;
								}
								return true;
							});

							// Image dynamique selon la couleur
							const getImageForSelection = () => {
								if (selectedColor) {
									const skuWithColor = activeSkus.find(
										(sku) =>
											sku.color?.slug === selectedColor &&
											sku.images?.length > 0
									);
									if (skuWithColor?.images?.length) {
										const img =
											skuWithColor.images.find((i) => i.isPrimary) ||
											skuWithColor.images[0];
										return {
											url: img.url,
											alt: img.altText || `${product.title} - ${selectedColor}`,
											blurDataUrl: img.blurDataUrl,
										};
									}
								}
								const primaryImage = getPrimaryImageForList(product);
								return {
									url: primaryImage.url,
									alt: primaryImage.alt || product.title,
									blurDataUrl: primaryImage.blurDataUrl,
								};
							};

							const currentImage = getImageForSelection();

							// Validation
							const validationErrors: string[] = [];
							if (colors.length > 1 && !selectedColor) {
								validationErrors.push("Veuillez sélectionner une couleur");
							}
							if (materials.length > 1 && !selectedMaterial) {
								validationErrors.push("Veuillez sélectionner un matériau");
							}
							if (requiresSize && sizes.length > 0 && !selectedSize) {
								validationErrors.push("Veuillez sélectionner une taille");
							}

							const canAddToCart =
								selectedSku && validationErrors.length === 0;
							const displayPrice = selectedSku
								? selectedSku.priceInclTax
								: activeSkus[0]?.priceInclTax || 0;
							const maxQuantity = selectedSku
								? Math.min(selectedSku.inventory, 10)
								: 10;

							return (
								<>
									{/* Hidden fields pour form action */}
									{selectedSku && (
										<>
											<input
												type="hidden"
												name="skuId"
												value={selectedSku.id}
											/>
											<input type="hidden" name="quantity" value={quantity} />
										</>
									)}

									{/* Image + Prix */}
									<div className="flex gap-4">
										<div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted shrink-0">
											<Image
												key={currentImage.url}
												src={currentImage.url}
												alt={currentImage.alt}
												fill
												className="object-cover animate-in fade-in duration-300"
												placeholder={
													currentImage.blurDataUrl ? "blur" : "empty"
												}
												blurDataURL={currentImage.blurDataUrl ?? undefined}
												sizes="128px"
											/>
										</div>
										<div className="flex flex-col justify-center">
											<AnimatePresence mode="wait">
												<motion.span
													key={displayPrice}
													initial={{ opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 10 }}
													transition={{ duration: 0.2 }}
													className="font-mono text-2xl font-bold text-foreground"
													role="status"
													aria-live="polite"
												>
													{formatEuro(displayPrice)}
													<span className="sr-only"> - Prix du produit</span>
												</motion.span>
											</AnimatePresence>
											{selectedSku && selectedSku.inventory <= 5 && (
												<span className="text-xs text-amber-600 mt-1">
													Plus que {selectedSku.inventory} en stock
												</span>
											)}
										</div>
									</div>

									{/* Sélecteur de couleur */}
									{colors.length > 1 && (
										<form.Field name="color">
											{(field) => {
												// Navigation clavier pour les sélecteurs radio
												const handleColorKeyDown = (
													e: React.KeyboardEvent<HTMLButtonElement>,
													index: number
												) => {
													const availableColors = colors.filter((c) =>
														isColorAvailable(c.slug)
													);
													if (availableColors.length === 0) return;

													const currentAvailableIndex = availableColors.findIndex(
														(c) => c.slug === colors[index].slug
													);
													let nextIndex: number | null = null;

													switch (e.key) {
														case "ArrowRight":
														case "ArrowDown":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex < availableColors.length - 1
																	? colors.findIndex(
																			(c) =>
																				c.slug ===
																				availableColors[currentAvailableIndex + 1]
																					.slug
																		)
																	: colors.findIndex(
																			(c) => c.slug === availableColors[0].slug
																		);
															break;
														case "ArrowLeft":
														case "ArrowUp":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex > 0
																	? colors.findIndex(
																			(c) =>
																				c.slug ===
																				availableColors[currentAvailableIndex - 1]
																					.slug
																		)
																	: colors.findIndex(
																			(c) =>
																				c.slug ===
																				availableColors[availableColors.length - 1]
																					.slug
																		);
															break;
														case "Home":
															e.preventDefault();
															nextIndex = colors.findIndex(
																(c) => c.slug === availableColors[0].slug
															);
															break;
														case "End":
															e.preventDefault();
															nextIndex = colors.findIndex(
																(c) =>
																	c.slug ===
																	availableColors[availableColors.length - 1].slug
															);
															break;
													}

													if (nextIndex !== null && nextIndex >= 0) {
														const nextButton = document.querySelector(
															`[data-color-index="${nextIndex}"]`
														) as HTMLButtonElement | null;
														nextButton?.focus();
														field.handleChange(colors[nextIndex].slug);
													}
												};

												return (
													<fieldset className="space-y-2">
														<Label
															className="text-sm font-medium"
															id="color-label"
														>
															Couleur
															{field.state.value && (
																<span className="font-normal text-muted-foreground ml-1">
																	:{" "}
																	{
																		colors.find(
																			(c) => c.slug === field.state.value
																		)?.name
																	}
																</span>
															)}
														</Label>
														<div
															className="flex flex-wrap gap-2"
															role="radiogroup"
															aria-labelledby="color-label"
														>
															{colors.map((color, index) => {
																const isSelected =
																	color.slug === field.state.value;
																const isAvailable = isColorAvailable(color.slug);

																return (
																	<button
																		key={color.slug}
																		data-color-index={index}
																		type="button"
																		role="radio"
																		aria-checked={isSelected}
																		tabIndex={
																			isSelected ||
																			(!field.state.value && index === 0)
																				? 0
																				: -1
																		}
																		onClick={() =>
																			field.handleChange(color.slug)
																		}
																		onKeyDown={(e) =>
																			handleColorKeyDown(e, index)
																		}
																		disabled={!isAvailable || isPending}
																		className={cn(
																			"relative flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																			"hover:shadow-sm active:scale-[0.98]",
																			"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																			"disabled:opacity-50 disabled:cursor-not-allowed",
																			isSelected
																				? "border-primary bg-primary/5"
																				: "border-border hover:border-primary/50"
																		)}
																		aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
																	>
																		<div
																			className="w-5 h-5 rounded-full border border-border/50 shadow-sm shrink-0"
																			style={{ backgroundColor: color.hex }}
																		/>
																		<span className="text-sm">{color.name}</span>
																		{isSelected && (
																			<Check className="w-4 h-4 text-primary shrink-0" />
																		)}
																	</button>
																);
															})}
														</div>
													</fieldset>
												);
											}}
										</form.Field>
									)}

									{/* Sélecteur de matériau */}
									{materials.length > 1 && (
										<form.Field name="material">
											{(field) => {
												// Navigation clavier
												const handleMaterialKeyDown = (
													e: React.KeyboardEvent<HTMLButtonElement>,
													index: number
												) => {
													const availableMaterials = materials.filter((m) =>
														isMaterialAvailable(m.slug)
													);
													if (availableMaterials.length === 0) return;

													const currentAvailableIndex = availableMaterials.findIndex(
														(m) => m.slug === materials[index].slug
													);
													let nextIndex: number | null = null;

													switch (e.key) {
														case "ArrowRight":
														case "ArrowDown":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex < availableMaterials.length - 1
																	? materials.findIndex(
																			(m) =>
																				m.slug ===
																				availableMaterials[currentAvailableIndex + 1].slug
																		)
																	: materials.findIndex(
																			(m) => m.slug === availableMaterials[0].slug
																		);
															break;
														case "ArrowLeft":
														case "ArrowUp":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex > 0
																	? materials.findIndex(
																			(m) =>
																				m.slug ===
																				availableMaterials[currentAvailableIndex - 1].slug
																		)
																	: materials.findIndex(
																			(m) =>
																				m.slug ===
																				availableMaterials[availableMaterials.length - 1].slug
																		);
															break;
														case "Home":
															e.preventDefault();
															nextIndex = materials.findIndex(
																(m) => m.slug === availableMaterials[0].slug
															);
															break;
														case "End":
															e.preventDefault();
															nextIndex = materials.findIndex(
																(m) =>
																	m.slug ===
																	availableMaterials[availableMaterials.length - 1].slug
															);
															break;
													}

													if (nextIndex !== null && nextIndex >= 0) {
														const nextButton = document.querySelector(
															`[data-material-index="${nextIndex}"]`
														) as HTMLButtonElement | null;
														nextButton?.focus();
														field.handleChange(materials[nextIndex].slug);
													}
												};

												return (
													<fieldset className="space-y-2">
														<Label
															className="text-sm font-medium"
															id="material-label"
														>
															Matériau
														</Label>
														<div
															className="grid grid-cols-2 gap-2"
															role="radiogroup"
															aria-labelledby="material-label"
														>
															{materials.map((material, index) => {
																const isSelected =
																	material.slug === field.state.value;
																const isAvailable = isMaterialAvailable(
																	material.slug
																);

																return (
																	<button
																		key={material.slug}
																		data-material-index={index}
																		type="button"
																		role="radio"
																		aria-checked={isSelected}
																		tabIndex={
																			isSelected ||
																			(!field.state.value && index === 0)
																				? 0
																				: -1
																		}
																		onClick={() =>
																			field.handleChange(material.slug)
																		}
																		onKeyDown={(e) =>
																			handleMaterialKeyDown(e, index)
																		}
																		disabled={!isAvailable || isPending}
																		className={cn(
																			"flex items-center justify-between px-4 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																			"hover:shadow-sm active:scale-[0.98]",
																			"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																			"disabled:opacity-50 disabled:cursor-not-allowed",
																			isSelected
																				? "border-primary bg-primary/5"
																				: "border-border hover:border-primary/50"
																		)}
																	>
																		<span className="text-sm">
																			{material.name}
																		</span>
																		{isSelected && (
																			<Check className="w-4 h-4 text-primary shrink-0" />
																		)}
																	</button>
																);
															})}
														</div>
													</fieldset>
												);
											}}
										</form.Field>
									)}

									{/* Sélecteur de taille */}
									{requiresSize && sizes.length > 0 && (
										<form.Field name="size">
											{(field) => {
												// Navigation clavier
												const handleSizeKeyDown = (
													e: React.KeyboardEvent<HTMLButtonElement>,
													index: number
												) => {
													const availableSizes = sizes.filter((s) =>
														isSizeAvailable(s)
													);
													if (availableSizes.length === 0) return;

													const currentAvailableIndex = availableSizes.findIndex(
														(s) => s === sizes[index]
													);
													let nextIndex: number | null = null;

													switch (e.key) {
														case "ArrowRight":
														case "ArrowDown":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex < availableSizes.length - 1
																	? sizes.findIndex(
																			(s) =>
																				s === availableSizes[currentAvailableIndex + 1]
																		)
																	: sizes.findIndex(
																			(s) => s === availableSizes[0]
																		);
															break;
														case "ArrowLeft":
														case "ArrowUp":
															e.preventDefault();
															nextIndex =
																currentAvailableIndex > 0
																	? sizes.findIndex(
																			(s) =>
																				s === availableSizes[currentAvailableIndex - 1]
																		)
																	: sizes.findIndex(
																			(s) =>
																				s ===
																				availableSizes[availableSizes.length - 1]
																		);
															break;
														case "Home":
															e.preventDefault();
															nextIndex = sizes.findIndex(
																(s) => s === availableSizes[0]
															);
															break;
														case "End":
															e.preventDefault();
															nextIndex = sizes.findIndex(
																(s) =>
																	s === availableSizes[availableSizes.length - 1]
															);
															break;
													}

													if (nextIndex !== null && nextIndex >= 0) {
														const nextButton = document.querySelector(
															`[data-size-index="${nextIndex}"]`
														) as HTMLButtonElement | null;
														nextButton?.focus();
														field.handleChange(sizes[nextIndex]);
													}
												};

												return (
													<fieldset className="space-y-2">
														<Label
															className="text-sm font-medium"
															id="size-label"
														>
															Taille
															{product.type?.slug === "ring" && (
																<span className="font-normal text-muted-foreground ml-1">
																	(Diamètre)
																</span>
															)}
															{product.type?.slug === "bracelet" && (
																<span className="font-normal text-muted-foreground ml-1">
																	(Tour de poignet)
																</span>
															)}
														</Label>
														<div
															className="grid grid-cols-3 sm:grid-cols-4 gap-2"
															role="radiogroup"
															aria-labelledby="size-label"
														>
															{sizes.map((size, index) => {
																const isSelected = size === field.state.value;
																const isAvailable = isSizeAvailable(size);

																return (
																	<button
																		key={size}
																		data-size-index={index}
																		type="button"
																		role="radio"
																		aria-checked={isSelected}
																		tabIndex={
																			isSelected ||
																			(!field.state.value && index === 0)
																				? 0
																				: -1
																		}
																		onClick={() => field.handleChange(size)}
																		onKeyDown={(e) =>
																			handleSizeKeyDown(e, index)
																		}
																		disabled={!isAvailable || isPending}
																		className={cn(
																			"relative flex items-center justify-center px-2 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																			"hover:shadow-sm active:scale-[0.98]",
																			"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																			"disabled:opacity-50 disabled:cursor-not-allowed",
																			isSelected
																				? "border-primary bg-primary/5"
																				: "border-border hover:border-primary/50"
																		)}
																	>
																		<span className="text-sm font-medium truncate">
																			{size}
																		</span>
																		{isSelected && (
																			<Check className="w-3.5 h-3.5 text-primary absolute top-1.5 right-1.5" />
																		)}
																	</button>
																);
															})}
														</div>
													</fieldset>
												);
											}}
										</form.Field>
									)}

									{/* Sélecteur de quantité */}
									<form.Field name="quantity">
										{(field) => (
											<fieldset className="space-y-2">
												<Label className="text-sm font-medium">Quantité</Label>
												<div className="flex items-center gap-3">
													<Button
														type="button"
														variant="outline"
														size="icon"
														onClick={() =>
															field.handleChange(
																Math.max(1, field.state.value - 1)
															)
														}
														disabled={isPending || field.state.value <= 1}
														aria-label="Diminuer la quantité"
													>
														<Minus className="h-4 w-4" />
													</Button>
													<span className="w-12 text-center text-lg font-semibold tabular-nums">
														{field.state.value}
													</span>
													<Button
														type="button"
														variant="outline"
														size="icon"
														onClick={() =>
															field.handleChange(
																Math.min(maxQuantity, field.state.value + 1)
															)
														}
														disabled={
															isPending || field.state.value >= maxQuantity
														}
														aria-label="Augmenter la quantité"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
											</fieldset>
										)}
									</form.Field>

									{/* Message d'erreur de validation */}
									<AnimatePresence mode="wait">
										{validationErrors.length > 0 && (
											<motion.p
												key="validation-error"
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: "auto" }}
												exit={{ opacity: 0, height: 0 }}
												className="text-sm text-amber-600 overflow-hidden"
												role="alert"
											>
												{validationErrors[0]}
											</motion.p>
										)}
									</AnimatePresence>

									<ResponsiveDialogFooter className="pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
										<Button
											type="submit"
											disabled={!canAddToCart || isPending}
											className="w-full"
										>
											{isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Ajout en cours...
												</>
											) : (
												"Ajouter au panier"
											)}
										</Button>
									</ResponsiveDialogFooter>
								</>
							);
						}}
					</form.Subscribe>
				</form>
					{/* Gradient indicateur de scroll en bas */}
					<div
						className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent z-10"
						aria-hidden="true"
					/>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
