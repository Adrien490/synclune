"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, use } from "react";
import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAppForm } from "@/shared/components/forms";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import type { Product } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { filterCompatibleSkus as filterCompatibleSkusService } from "@/modules/skus/services/sku-filter.service";
import {
	hasActiveDiscount,
	calculateDiscountPercent,
} from "@/modules/products/services/product-pricing.service";
import { slugify } from "@/shared/utils/generate-slug";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import ScrollFade from "@/shared/components/scroll-fade";

import type { SkuSelectorDialogData } from "../types/dialog-data.types";

export type { SkuSelectorDialogData };

// Lazy loading - size guide dialog loads only when opened
const SizeGuideDialog = dynamic(() =>
	import("@/modules/skus/components/size-guide-dialog").then(
		(mod) => mod.SizeGuideDialog
	)
);

export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

/** Quantité maximale par ajout au panier */
const MAX_QUANTITY_PER_ADD = 10;

/** ID pour aria-describedby des erreurs de validation */
const VALIDATION_ERROR_ID = "sku-selector-validation-error";

// ============================================================================
// Types locaux
// ============================================================================

type ColorOption = { slug: string; hex: string; name: string };
type MaterialOption = { slug: string; name: string };
type ActiveSku = NonNullable<Product["skus"]>[number];

interface ImageSelection {
	url: string;
	alt: string;
	blurDataUrl: string | null;
}

interface AvailabilityMaps {
	color: Map<string, boolean>;
	material: Map<string, boolean>;
	size: Map<string, boolean>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Construit les maps de disponibilité pour chaque option de variante
 * en fonction des sélections actuelles
 */
function buildAvailabilityMaps(
	product: Product,
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string
): AvailabilityMaps {
	const filterSkus = (selectors: {
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	}) => filterCompatibleSkusService(product, selectors);

	return {
		color: new Map(
			colors.map((c) => [
				c.slug,
				filterSkus({
					colorSlug: c.slug,
					materialSlug: selectedMaterial || undefined,
					size: selectedSize || undefined,
				}).length > 0,
			])
		),
		material: new Map(
			materials.map((m) => [
				m.slug,
				filterSkus({
					colorSlug: selectedColor || undefined,
					materialSlug: m.slug,
					size: selectedSize || undefined,
				}).length > 0,
			])
		),
		size: new Map(
			sizes.map((s) => [
				s,
				filterSkus({
					colorSlug: selectedColor || undefined,
					materialSlug: selectedMaterial || undefined,
					size: s,
				}).length > 0,
			])
		),
	};
}

/**
 * Retourne l'image à afficher en fonction de la couleur sélectionnée
 */
function getImageForColor(
	selectedColor: string,
	activeSkus: ActiveSku[],
	product: Product
): ImageSelection {
	if (selectedColor) {
		const skuWithColor = activeSkus.find(
			(sku) => sku.color?.slug === selectedColor && sku.images?.length > 0
		);
		if (skuWithColor?.images?.length) {
			const img =
				skuWithColor.images.find((i) => i.isPrimary) || skuWithColor.images[0];
			return {
				url: img.url,
				alt: img.altText || `${product.title} - ${selectedColor}`,
				blurDataUrl: img.blurDataUrl ?? null,
			};
		}
	}
	const primaryImage = getPrimaryImageForList(product);
	return {
		url: primaryImage.url,
		alt: primaryImage.alt || product.title,
		blurDataUrl: primaryImage.blurDataUrl ?? null,
	};
}

/**
 * Calcule les erreurs de validation basées sur les sélections requises
 */
function computeValidationErrors(
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	requiresSize: boolean,
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string
): string[] {
	const errors: string[] = [];
	if (colors.length > 1 && !selectedColor) {
		errors.push("Veuillez sélectionner une couleur");
	}
	if (materials.length > 1 && !selectedMaterial) {
		errors.push("Veuillez sélectionner un matériau");
	}
	if (requiresSize && sizes.length > 0 && !selectedSize) {
		errors.push("Veuillez sélectionner une taille");
	}
	return errors;
}

// ============================================================================
// Component
// ============================================================================

interface SkuSelectorDialogProps {
	/** Promise du panier pour vérifier les quantités disponibles */
	cartPromise: Promise<GetCartReturn>;
}

/**
 * Dialog de sélection de variante pour ajout rapide au panier
 *
 * S'affiche quand l'utilisateur clique sur "Ajouter au panier"
 * sur une ProductCard avec plusieurs variantes.
 *
 * Utilise TanStack Form (useAppForm) pour la gestion du formulaire
 */
export function SkuSelectorDialog({ cartPromise }: SkuSelectorDialogProps) {
	const cart = use(cartPromise);
	const cartItems =
		cart?.items?.map((item) => ({
			skuId: item.sku.id,
			quantity: item.quantity,
		})) ?? [];

	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(
		SKU_SELECTOR_DIALOG_ID
	);
	const { action, isPending } = useAddToCart({
		openSheetOnSuccess: true,
		onSuccess: close,
	});
	const shouldReduceMotion = useReducedMotion();

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
	// Pré-sélectionne les variantes du SKU par défaut pour une meilleure UX
	useEffect(() => {
		if (isOpen && product) {
			// Trouver le SKU par défaut (isDefault: true ou premier SKU actif)
			const activeSkus = product.skus?.filter((sku) => sku.isActive) || [];
			const defaultSku =
				activeSkus.find((sku) => sku.isDefault) ?? activeSkus[0];

			// Extraire les variantes uniques pour l'auto-sélection
			const uniqueColors = new Set(
				activeSkus.map((sku) => sku.color?.slug).filter(Boolean)
			);
			const uniqueMaterials = new Set(
				activeSkus
					.map((sku) =>
						sku.material?.name ? slugify(sku.material.name) : null
					)
					.filter(Boolean)
			);
			const uniqueSizes = new Set(
				activeSkus.map((sku) => sku.size).filter(Boolean)
			);

			// Calculer les valeurs initiales avec auto-sélection intelligente
			// Priorité : preselectedColor > SKU par défaut > auto-sélection si unique
			const initialColor =
				preselectedColor ||
				defaultSku?.color?.slug ||
				(uniqueColors.size === 1 ? [...uniqueColors][0] : "") ||
				"";

			const initialMaterial =
				(defaultSku?.material?.name
					? slugify(defaultSku.material.name)
					: "") ||
				(uniqueMaterials.size === 1 ? [...uniqueMaterials][0] : "") ||
				"";

			const initialSize =
				defaultSku?.size ||
				(uniqueSizes.size === 1 ? [...uniqueSizes][0] : "") ||
				"";

			form.reset({
				color: initialColor,
				material: initialMaterial,
				size: initialSize,
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
				<ResponsiveDialogContent className="sm:max-w-130">
					<ResponsiveDialogHeader>
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-4 w-32 mt-1" />
					</ResponsiveDialogHeader>
					<div className="space-y-6 py-4">
						{/* Image + Prix skeleton */}
						<div className="flex gap-4">
							<Skeleton className="w-24 h-24 sm:w-40 sm:h-40 rounded-lg shrink-0" />
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

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="group/sku-selector sm:max-w-130 sm:max-h-[85vh]">
				<ResponsiveDialogHeader className="shrink-0">
					{/* #6 - Product name as dialog title */}
					<ResponsiveDialogTitle className="line-clamp-1">
						{product.title}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Choisis tes options pour ajouter au panier
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{/* Form avec layout flex pour scroll + footer fixe */}
				<form
					action={action}
					className="flex flex-col flex-1 min-h-0"
					data-pending={isPending ? "" : undefined}
				>
					{/* Subscribe pour obtenir les valeurs et calculer le SKU */}
					<form.Subscribe selector={(state) => state.values}>
						{(values) => {
							const selectedColor = values.color;
							const selectedMaterial = values.material;
							const selectedSize = values.size;
							const quantity = values.quantity;

							// Calcul des disponibilités via helper
							const availability = buildAvailabilityMaps(
								product,
								colors,
								materials,
								sizes,
								selectedColor,
								selectedMaterial,
								selectedSize
							);

							const isColorAvailable = (slug: string) =>
								availability.color.get(slug) ?? false;
							const isMaterialAvailable = (slug: string) =>
								availability.material.get(slug) ?? false;
							const isSizeAvailable = (size: string) =>
								availability.size.get(size) ?? false;

							// Trouver le SKU correspondant
							const selectedSku = activeSkus.find((sku) => {
								if (sku.inventory <= 0) return false;
								if (colors.length > 1) {
									if (
										!selectedColor ||
										sku.color?.slug !== selectedColor
									)
										return false;
								}
								if (materials.length > 1) {
									if (!selectedMaterial) return false;
									const skuMaterialSlug = sku.material?.name
										? slugify(sku.material.name)
										: null;
									if (skuMaterialSlug !== selectedMaterial)
										return false;
								}
								if (requiresSize && sizes.length > 0) {
									if (
										!selectedSize ||
										sku.size !== selectedSize
									)
										return false;
								}
								return true;
							});

							// Image dynamique selon la couleur (via helper)
							const currentImage = getImageForColor(
								selectedColor,
								activeSkus,
								product
							);

							// Validation (via helper)
							const validationErrors = computeValidationErrors(
								colors,
								materials,
								sizes,
								requiresSize,
								selectedColor,
								selectedMaterial,
								selectedSize
							);

							// Calcul de la quantité déjà dans le panier pour ce SKU
							const quantityInCart = selectedSku
								? (cartItems.find(
										(item) => item.skuId === selectedSku.id
									)?.quantity ?? 0)
								: 0;
							const availableToAdd = selectedSku
								? Math.max(
										0,
										selectedSku.inventory - quantityInCart
									)
								: 0;

							const canAddToCart =
								selectedSku &&
								validationErrors.length === 0 &&
								availableToAdd > 0;
							const displayPrice = selectedSku
								? selectedSku.priceInclTax
								: activeSkus[0]?.priceInclTax || 0;

							// #1 - Discount info
							const compareAtPrice =
								selectedSku?.compareAtPrice ??
								activeSkus[0]?.compareAtPrice;
							const showDiscount = hasActiveDiscount(
								compareAtPrice,
								displayPrice
							);
							const discountPercent = showDiscount
								? calculateDiscountPercent(
										compareAtPrice,
										displayPrice
									)
								: 0;

							const maxQuantity = selectedSku
								? Math.min(availableToAdd, MAX_QUANTITY_PER_ADD)
								: MAX_QUANTITY_PER_ADD;

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
											<input
												type="hidden"
												name="quantity"
												value={quantity}
											/>
										</>
									)}

									{/* Contenu scrollable avec effets CSS pendant submit */}
									<div
										className={cn(
											"relative flex-1 min-h-0 overflow-y-auto space-y-6 py-4 pb-6 pr-2 overscroll-contain",
											"group-has-[[data-pending]]/sku-selector:opacity-50",
											"group-has-[[data-pending]]/sku-selector:pointer-events-none",
											"transition-opacity duration-200"
										)}
									>
										{/* Image + Prix */}
										<div className="flex gap-4">
											{/* #8 - Larger image on desktop */}
											<motion.div
												key={currentImage.url}
												initial={
													shouldReduceMotion
														? { opacity: 0 }
														: {
																scale: 0.95,
																opacity: 0,
															}
												}
												animate={{
													scale: 1,
													opacity: 1,
												}}
												transition={{ duration: 0.2 }}
												className="relative w-24 h-24 sm:w-40 sm:h-40 rounded-lg overflow-hidden bg-muted shrink-0"
											>
												<Image
													src={currentImage.url}
													alt={currentImage.alt}
													fill
													className="object-cover"
													placeholder={
														currentImage.blurDataUrl
															? "blur"
															: "empty"
													}
													blurDataURL={
														currentImage.blurDataUrl ??
														undefined
													}
													sizes="(min-width: 640px) 160px, 96px"
													quality={85}
												/>
											</motion.div>
											<div className="flex flex-col justify-center">
												{/* #1 - Price with discount display */}
												<AnimatePresence mode="wait">
													<motion.div
														key={displayPrice}
														initial={
															shouldReduceMotion
																? { opacity: 0 }
																: {
																		opacity: 0,
																		y: -10,
																	}
														}
														animate={{
															opacity: 1,
															y: 0,
														}}
														exit={
															shouldReduceMotion
																? { opacity: 0 }
																: {
																		opacity: 0,
																		y: 10,
																	}
														}
														transition={{
															duration:
																shouldReduceMotion
																	? 0.1
																	: 0.2,
														}}
														role="status"
														aria-live="polite"
													>
														<div className="flex items-center gap-2">
															<span className="tabular-nums text-2xl font-bold text-foreground">
																{formatEuro(
																	displayPrice
																)}
															</span>
															{showDiscount &&
																discountPercent >
																	0 && (
																	<span className="text-xs font-semibold text-white bg-destructive px-1.5 py-0.5 rounded">
																		-
																		{
																			discountPercent
																		}
																		%
																	</span>
																)}
														</div>
														{showDiscount &&
															compareAtPrice && (
																<>
																	<span className="sr-only">
																		Prix
																		original
																		:{" "}
																		{formatEuro(
																			compareAtPrice
																		)}
																	</span>
																	<span
																		className="tabular-nums text-foreground/60 line-through text-sm"
																		aria-hidden="true"
																	>
																		{formatEuro(
																			compareAtPrice
																		)}
																	</span>
																</>
															)}
														<span className="sr-only">
															{" "}
															- Prix du produit
														</span>
													</motion.div>
												</AnimatePresence>
												{/* Badge stock avec animation pulse */}
												{selectedSku &&
													selectedSku.inventory <=
														STOCK_THRESHOLDS.LOW &&
													availableToAdd > 0 && (
														<motion.span
															animate={
																shouldReduceMotion
																	? {}
																	: {
																			opacity:
																				[
																					1,
																					0.7,
																					1,
																				],
																		}
															}
															transition={{
																repeat: Infinity,
																duration: 2,
																ease: "easeInOut",
															}}
															className="text-xs text-amber-600 mt-1 font-medium"
														>
															Plus que{" "}
															{
																selectedSku.inventory
															}{" "}
															en stock
														</motion.span>
													)}
												{quantityInCart > 0 && (
													<span className="text-xs text-muted-foreground mt-1">
														{quantityInCart} déjà
														dans le panier
													</span>
												)}
												{/* #4 - More visible out-of-stock badge */}
												{selectedSku &&
													availableToAdd === 0 && (
														<span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded mt-1">
															Stock maximum
															atteint
														</span>
													)}
											</div>
										</div>

										{/* #3 - Link to product page */}
										<Link
											href={`/creations/${product.slug}`}
											onClick={handleClose}
											className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
										>
											Voir la fiche produit
											<ArrowRight className="w-3.5 h-3.5" />
										</Link>

										{/* #9 + #7 - Color selector with radio group + ScrollFade */}
										{colors.length > 1 && (
											<form.Field name="color">
												{(colorField) => (
													<ColorSelector
														colors={colors}
														selectedValue={
															colorField
																.state
																.value
														}
														onSelect={
															colorField.handleChange
														}
														isPending={
															isPending
														}
														hasValidationErrors={
															validationErrors.length >
															0
														}
														isColorAvailable={
															isColorAvailable
														}
													/>
												)}
											</form.Field>
										)}

										{/* #9 - Material selector with radio group */}
										{materials.length > 1 && (
											<form.Field name="material">
												{(materialField) => (
													<MaterialSelector
														materials={
															materials
														}
														selectedValue={
															materialField
																.state
																.value
														}
														onSelect={
															materialField.handleChange
														}
														isPending={
															isPending
														}
														hasValidationErrors={
															validationErrors.length >
															0
														}
														isMaterialAvailable={
															isMaterialAvailable
														}
													/>
												)}
											</form.Field>
										)}

										{/* #2 + #9 - Size selector with guide + radio group */}
										{requiresSize && sizes.length > 0 && (
											<form.Field name="size">
												{(sizeField) => (
													<SizeSelectorGroup
														sizes={sizes}
														selectedValue={
															sizeField
																.state
																.value
														}
														onSelect={
															sizeField.handleChange
														}
														isPending={
															isPending
														}
														hasValidationErrors={
															validationErrors.length >
															0
														}
														isSizeAvailable={
															isSizeAvailable
														}
														productTypeSlug={
															product
																.type
																?.slug
														}
													/>
												)}
											</form.Field>
										)}

										{/* #4 - Quantity selector: hidden when stock max reached */}
										{(!selectedSku ||
											availableToAdd > 0) && (
											<form.Field name="quantity">
												{(field) => (
													<fieldset
														className="space-y-2"
														disabled={isPending}
													>
														<legend className="text-sm font-medium">
															Quantité
														</legend>
														<div className="flex items-center gap-4 sm:gap-3">
															<Button
																type="button"
																variant="outline"
																size="icon"
																onClick={() =>
																	field.handleChange(
																		Math.max(
																			1,
																			field
																				.state
																				.value -
																				1
																		)
																	)
																}
																disabled={
																	isPending ||
																	field.state
																		.value <=
																		1
																}
																aria-label="Diminuer la quantité"
															>
																<Minus className="h-4 w-4" />
															</Button>
															<input
																type="text"
																inputMode="numeric"
																pattern="[0-9]*"
																value={
																	field.state
																		.value
																}
																onChange={(
																	e
																) => {
																	const val =
																		parseInt(
																			e
																				.target
																				.value
																		) || 1;
																	field.handleChange(
																		Math.max(
																			1,
																			Math.min(
																				maxQuantity,
																				val
																			)
																		)
																	);
																}}
																disabled={
																	isPending
																}
																className="w-12 text-center text-lg font-semibold tabular-nums bg-transparent focus:outline-none"
																aria-label="Quantité à ajouter au panier"
															/>
															<Button
																type="button"
																variant="outline"
																size="icon"
																onClick={() =>
																	field.handleChange(
																		Math.min(
																			maxQuantity,
																			field
																				.state
																				.value +
																				1
																		)
																	)
																}
																disabled={
																	isPending ||
																	field.state
																		.value >=
																		maxQuantity
																}
																aria-label="Augmenter la quantité"
															>
																<Plus className="h-4 w-4" />
															</Button>
														</div>
														{/* #10 - Subtotal when quantity > 1 */}
														{quantity > 1 &&
															selectedSku && (
																<p className="text-xs text-muted-foreground">
																	{quantity} x{" "}
																	{formatEuro(
																		displayPrice
																	)}
																</p>
															)}
													</fieldset>
												)}
											</form.Field>
										)}
									</div>
									{/* Fin du contenu scrollable */}

									{/* Footer fixe - hors du scroll */}
									<ResponsiveDialogFooter className="shrink-0 pt-4 border-t mt-auto pb-[max(0px,env(safe-area-inset-bottom))]">
										<Button
											type="submit"
											disabled={
												!canAddToCart || isPending
											}
											className="w-full"
											size="lg"
										>
											{isPending
												? "Ajout en cours..."
												: `Ajouter au panier · ${formatEuro(displayPrice * quantity)}`}
										</Button>
										{/* #5 - Single validation message in footer only, with shake */}
										<AnimatePresence mode="wait">
											{!canAddToCart &&
												validationErrors.length > 0 &&
												!isPending && (
													<motion.p
														id={
															VALIDATION_ERROR_ID
														}
														key={validationErrors.join()}
														initial={{
															opacity: 0,
															x: 0,
														}}
														animate={{
															opacity: 1,
															x: shouldReduceMotion
																? 0
																: [
																		0, -8, 8,
																		-8, 0,
																	],
														}}
														exit={{ opacity: 0 }}
														transition={{
															duration: 0.35,
														}}
														className="text-xs text-muted-foreground text-center mt-2"
														role="alert"
													>
														{validationErrors.length ===
														1
															? validationErrors[0]
															: `${validationErrors.length} sélections requises`}
													</motion.p>
												)}
										</AnimatePresence>
									</ResponsiveDialogFooter>
								</>
							);
						}}
					</form.Subscribe>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

// ============================================================================
// Sub-components for radio group keyboard navigation (#9)
// ============================================================================

interface ColorSelectorProps {
	colors: ColorOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	isColorAvailable: (slug: string) => boolean;
}

function ColorSelector({
	colors,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	isColorAvailable,
}: ColorSelectorProps) {
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: colors,
		getOptionId: (color) => color.slug,
		isOptionDisabled: (color) => !isColorAvailable(color.slug),
		onSelect: (color) => onSelect(color.slug),
	});

	const needsCarousel = colors.length > 5;
	const colorButtons = colors.map((color, index) => {
		const isSelected = color.slug === selectedValue;
		const isAvailable = isColorAvailable(color.slug);

		return (
			<button
				key={color.slug}
				type="button"
				role="radio"
				aria-checked={isSelected}
				data-option-id={color.slug}
				onClick={() => onSelect(color.slug)}
				onKeyDown={(e) => handleKeyDown(e, index)}
				tabIndex={
					isSelected || (!selectedValue && index === 0)
						? 0
						: -1
				}
				disabled={!isAvailable || isPending}
				className={cn(
					"relative flex items-center gap-2 px-4 py-3 min-h-11 rounded-lg border-2 transition-all",
					"hover:shadow-sm active:scale-[0.98]",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					"disabled:cursor-not-allowed",
					isSelected
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50",
					!isAvailable && "opacity-40 saturate-0",
					needsCarousel && "shrink-0 snap-start"
				)}
				aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
			>
				<div
					className={cn(
						"w-6 h-6 sm:w-5 sm:h-5 rounded-full shadow-sm shrink-0",
						isLightColor(color.hex, 0.85)
							? "border-2 border-border"
							: "border border-border/50"
					)}
					style={{ backgroundColor: color.hex }}
				/>
				<span className="text-sm">{color.name}</span>
				{isSelected && (
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{
							type: "spring",
							stiffness: 400,
							damping: 15,
						}}
					>
						<Check className="w-4 h-4 text-primary shrink-0" />
					</motion.div>
				)}
				{!isAvailable && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="w-full h-px bg-muted-foreground/50 rotate-[-8deg]" />
					</div>
				)}
			</button>
		);
	});

	return (
		<fieldset
			className="space-y-2"
			disabled={isPending}
			role="radiogroup"
			aria-label="Sélection de couleur"
			aria-describedby={
				hasValidationErrors && !selectedValue
					? VALIDATION_ERROR_ID
					: undefined
			}
		>
			<legend className="text-sm font-medium">
				Couleur
				<span
					className="text-destructive ml-0.5"
					aria-hidden="true"
				>
					*
				</span>
				<span className="sr-only">(obligatoire)</span>
				{selectedValue && (
					<span className="font-normal text-muted-foreground ml-1">
						:{" "}
						{
							colors.find((c) => c.slug === selectedValue)
								?.name
						}
					</span>
				)}
			</legend>
			{/* #7 - ScrollFade for color carousel */}
			{needsCarousel ? (
				<ScrollFade axis="horizontal" hideScrollbar>
					<div
						ref={containerRef}
						className="flex gap-2 pb-1"
					>
						{colorButtons}
					</div>
				</ScrollFade>
			) : (
				<div
					ref={containerRef}
					className="flex flex-wrap gap-2"
				>
					{colorButtons}
				</div>
			)}
		</fieldset>
	);
}

interface MaterialSelectorProps {
	materials: MaterialOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	isMaterialAvailable: (slug: string) => boolean;
}

function MaterialSelector({
	materials,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	isMaterialAvailable,
}: MaterialSelectorProps) {
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: materials,
		getOptionId: (material) => material.slug,
		isOptionDisabled: (material) => !isMaterialAvailable(material.slug),
		onSelect: (material) => onSelect(material.slug),
	});

	return (
		<fieldset
			className="space-y-2"
			disabled={isPending}
			role="radiogroup"
			aria-label="Sélection de matériau"
			aria-describedby={
				hasValidationErrors && !selectedValue
					? VALIDATION_ERROR_ID
					: undefined
			}
		>
			<legend className="text-sm font-medium">
				Matériau
				<span
					className="text-destructive ml-0.5"
					aria-hidden="true"
				>
					*
				</span>
				<span className="sr-only">(obligatoire)</span>
			</legend>
			<div
				ref={containerRef}
				className="grid grid-cols-1 sm:grid-cols-2 gap-2"
			>
				{materials.map((material, index) => {
					const isSelected = material.slug === selectedValue;
					const isAvailable = isMaterialAvailable(material.slug);

					return (
						<button
							key={material.slug}
							type="button"
							role="radio"
							aria-checked={isSelected}
							data-option-id={material.slug}
							onClick={() => onSelect(material.slug)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							tabIndex={
								isSelected ||
								(!selectedValue && index === 0)
									? 0
									: -1
							}
							disabled={!isAvailable || isPending}
							className={cn(
								"relative flex items-center justify-between px-4 py-3 min-h-11 rounded-lg border-2 transition-all",
								"hover:shadow-sm active:scale-[0.98]",
								"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
								"disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-40 saturate-0"
							)}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
						>
							<span className="text-sm">
								{material.name}
							</span>
							{isSelected && (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 15,
									}}
								>
									<Check className="w-4 h-4 text-primary shrink-0" />
								</motion.div>
							)}
							{!isAvailable && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="w-full h-px bg-muted-foreground/50 rotate-[-8deg]" />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

interface SizeSelectorGroupProps {
	sizes: string[];
	selectedValue: string;
	onSelect: (size: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	isSizeAvailable: (size: string) => boolean;
	productTypeSlug?: string | null;
}

function SizeSelectorGroup({
	sizes,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	isSizeAvailable,
	productTypeSlug,
}: SizeSelectorGroupProps) {
	// Wrap sizes as objects for the keyboard hook
	const sizeOptions = sizes.map((s) => ({ size: s }));
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: sizeOptions,
		getOptionId: (option) => option.size,
		isOptionDisabled: (option) => !isSizeAvailable(option.size),
		onSelect: (option) => onSelect(option.size),
	});

	return (
		<fieldset
			className="space-y-2"
			disabled={isPending}
			role="radiogroup"
			aria-label="Sélection de taille"
			aria-describedby={
				hasValidationErrors && !selectedValue
					? VALIDATION_ERROR_ID
					: undefined
			}
		>
			{/* #2 - Size guide in legend */}
			<div className="flex items-center justify-between">
				<legend className="text-sm font-medium">
					Taille
					<span
						className="text-destructive ml-0.5"
						aria-hidden="true"
					>
						*
					</span>
					<span className="sr-only">(obligatoire)</span>
					{productTypeSlug === "ring" && (
						<span className="font-normal text-muted-foreground ml-1">
							(Diamètre)
						</span>
					)}
					{productTypeSlug === "bracelet" && (
						<span className="font-normal text-muted-foreground ml-1">
							(Tour de poignet)
						</span>
					)}
				</legend>
				<SizeGuideDialog productTypeSlug={productTypeSlug} />
			</div>
			<div
				ref={containerRef}
				className="grid grid-cols-3 sm:grid-cols-4 gap-2"
			>
				{sizes.map((size, index) => {
					const isSelected = size === selectedValue;
					const isAvailable = isSizeAvailable(size);

					return (
						<button
							key={size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							data-option-id={size}
							onClick={() => onSelect(size)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							tabIndex={
								isSelected ||
								(!selectedValue && index === 0)
									? 0
									: -1
							}
							disabled={!isAvailable || isPending}
							className={cn(
								"relative flex items-center justify-center px-2 py-3 min-h-11 rounded-lg border-2 transition-all",
								"hover:shadow-sm active:scale-[0.98]",
								"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
								"disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-40 saturate-0"
							)}
							aria-label={`Taille ${size}${!isAvailable ? " (indisponible)" : ""}`}
						>
							<span className="text-sm font-medium truncate">
								{size}
							</span>
							{isSelected && (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 15,
									}}
									className="absolute top-1.5 right-1.5"
								>
									<Check className="w-3.5 h-3.5 text-primary" />
								</motion.div>
							)}
							{!isAvailable && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="w-full h-px bg-muted-foreground/50 rotate-[-8deg]" />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
