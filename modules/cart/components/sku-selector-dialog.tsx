"use client";

import Image from "next/image";
import { useEffect, use } from "react";
import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
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
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import type { Product } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { getPrimaryImageForList } from "@/modules/products/services/product-sorting.service";
import { filterCompatibleSkus as filterCompatibleSkusService } from "@/modules/skus/services/filter-compatible-skus";
import { slugify } from "@/shared/utils/generate-slug";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";

export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

export type SkuSelectorDialogData = {
	product: Product;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	[key: string]: unknown;
};

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
	const cartItems = cart?.items?.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
	})) ?? [];
	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(
		SKU_SELECTOR_DIALOG_ID
	);
	const { action, isPending } = useAddToCart({
		openSheetOnSuccess: true,
		onSuccess: close, // Ferme le dialog après ajout réussi
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
					.map((sku) => (sku.material?.name ? slugify(sku.material.name) : null))
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
				(defaultSku?.material?.name ? slugify(defaultSku.material.name) : "") ||
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

	// Filtrer les SKUs compatibles en utilisant le service partagé
	const filterCompatibleSkus = (selectors: {
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	}) => filterCompatibleSkusService(product, selectors);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="group/sku-selector sm:max-w-[520px] sm:max-h-[85vh]">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>Choisir une variante</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{product.title} est disponible en plusieurs options
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

							// Fix 14: Pré-calcul des disponibilités une seule fois
							const colorAvailability = new Map(
								colors.map((c) => [
									c.slug,
									filterCompatibleSkus({
										colorSlug: c.slug,
										materialSlug: selectedMaterial || undefined,
										size: selectedSize || undefined,
									}).length > 0,
								])
							);
							const materialAvailability = new Map(
								materials.map((m) => [
									m.slug,
									filterCompatibleSkus({
										colorSlug: selectedColor || undefined,
										materialSlug: m.slug,
										size: selectedSize || undefined,
									}).length > 0,
								])
							);
							const sizeAvailability = new Map(
								sizes.map((s) => [
									s,
									filterCompatibleSkus({
										colorSlug: selectedColor || undefined,
										materialSlug: selectedMaterial || undefined,
										size: s,
									}).length > 0,
								])
							);

							const isColorAvailable = (slug: string) => colorAvailability.get(slug) ?? false;
							const isMaterialAvailable = (slug: string) => materialAvailability.get(slug) ?? false;
							const isSizeAvailable = (size: string) => sizeAvailability.get(size) ?? false;

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

							// Calcul de la quantité déjà dans le panier pour ce SKU
							const quantityInCart = selectedSku
								? cartItems.find((item) => item.skuId === selectedSku.id)?.quantity ?? 0
								: 0;
							const availableToAdd = selectedSku
								? Math.max(0, selectedSku.inventory - quantityInCart)
								: 0;

							const canAddToCart =
								selectedSku && validationErrors.length === 0 && availableToAdd > 0;
							const displayPrice = selectedSku
								? selectedSku.priceInclTax
								: activeSkus[0]?.priceInclTax || 0;

							const maxQuantity = selectedSku
								? Math.min(availableToAdd, 10)
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

									{/* Contenu scrollable avec effets CSS pendant submit */}
									<div className={cn(
										"relative flex-1 min-h-0 overflow-y-auto space-y-6 py-4 pb-6 pr-2 overscroll-contain",
										"group-has-[[data-pending]]/sku-selector:opacity-50",
										"group-has-[[data-pending]]/sku-selector:pointer-events-none",
										"transition-opacity duration-200"
									)}>
									{/* Image + Prix */}
									<div className="flex gap-4">
										{/* Fix 3: Image uniforme 32x32 + Fix 17: Animation zoom */}
										<motion.div
											key={currentImage.url}
											initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ duration: 0.2 }}
											className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0"
										>
											<Image
												src={currentImage.url}
												alt={currentImage.alt}
												fill
												className="object-cover"
												placeholder={
													currentImage.blurDataUrl ? "blur" : "empty"
												}
												blurDataURL={currentImage.blurDataUrl ?? undefined}
												sizes="128px"
												quality={85}
											/>
										</motion.div>
										<div className="flex flex-col justify-center">
											{/* Fix 10: Animation prix avec reduced motion support */}
											<AnimatePresence mode="wait">
												<motion.span
													key={displayPrice}
													initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
													transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
													className="font-mono text-2xl font-bold text-foreground"
													role="status"
													aria-live="polite"
												>
													{formatEuro(displayPrice)}
													<span className="sr-only"> - Prix du produit</span>
												</motion.span>
											</AnimatePresence>
											{/* Fix 19: Badge stock avec animation pulse */}
											{selectedSku && selectedSku.inventory <= STOCK_THRESHOLDS.LOW && availableToAdd > 0 && (
												<motion.span
													animate={shouldReduceMotion ? {} : { opacity: [1, 0.7, 1] }}
													transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
													className="text-xs text-amber-600 mt-1 font-medium"
												>
													Plus que {selectedSku.inventory} en stock
												</motion.span>
											)}
											{quantityInCart > 0 && (
												<span className="text-xs text-muted-foreground mt-1">
													{quantityInCart} déjà dans le panier
												</span>
											)}
											{selectedSku && availableToAdd === 0 && (
												<span className="text-xs text-destructive mt-1">
													Stock maximum atteint
												</span>
											)}
										</div>
									</div>

									{/* Sélecteur de couleur */}
									{colors.length > 1 && (
										<form.Field name="color">
											{(field) => (
												<fieldset className="space-y-2" disabled={isPending}>
													{/* Fix 6: Legend sémantique */}
													<legend className="text-sm font-medium">
														Couleur
														<span className="text-destructive ml-0.5" aria-hidden="true">*</span>
														<span className="sr-only">(obligatoire)</span>
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
													</legend>
													{/* Fix 24: Carousel horizontal si > 5 couleurs */}
													<div className={cn(
														colors.length > 5
															? "flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
															: "flex flex-wrap gap-2"
													)}>
														{colors.map((color) => {
															const isSelected =
																color.slug === field.state.value;
															const isAvailable = isColorAvailable(color.slug);

															return (
																<button
																	key={color.slug}
																	type="button"
																	aria-pressed={isSelected}
																	onClick={() => field.handleChange(color.slug)}
																	disabled={!isAvailable || isPending}
																	className={cn(
																		"relative flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																		"hover:shadow-sm active:scale-[0.98]",
																		"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																		"disabled:cursor-not-allowed",
																		isSelected
																			? "border-primary bg-primary/5"
																			: "border-border hover:border-primary/50",
																		/* Fix 9: État disabled plus visible */
																		!isAvailable && "opacity-40 saturate-0",
																		/* Shrink-0 pour carousel */
																		colors.length > 5 && "shrink-0 snap-start"
																	)}
																	aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
																>
																	{/* Fix 13: Preview couleur + Fix 22: Bordure couleurs claires */}
																	<div
																		className={cn(
																			"w-6 h-6 sm:w-5 sm:h-5 rounded-full shadow-sm shrink-0",
																			isLightColor(color.hex, 0.85) ? "border-2 border-border" : "border border-border/50"
																		)}
																		style={{ backgroundColor: color.hex }}
																	/>
																	<span className="text-sm">{color.name}</span>
																	{/* Fix 20: Checkmark animé */}
																	{isSelected && (
																		<motion.div
																			initial={{ scale: 0 }}
																			animate={{ scale: 1 }}
																			transition={{ type: "spring", stiffness: 400, damping: 15 }}
																		>
																			<Check className="w-4 h-4 text-primary shrink-0" />
																		</motion.div>
																	)}
																	{/* Fix 9: Ligne barrée pour indisponible */}
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
											)}
										</form.Field>
									)}

									{/* Sélecteur de matériau */}
									{materials.length > 1 && (
										<form.Field name="material">
											{(field) => (
												<fieldset className="space-y-2" disabled={isPending}>
													{/* Fix 6: Legend sémantique */}
													<legend className="text-sm font-medium">
														Matériau
														<span className="text-destructive ml-0.5" aria-hidden="true">*</span>
														<span className="sr-only">(obligatoire)</span>
													</legend>
													{/* Fix 5: Grid adaptatif pour noms longs */}
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
														{materials.map((material) => {
															const isSelected =
																material.slug === field.state.value;
															const isAvailable = isMaterialAvailable(
																material.slug
															);

															return (
																<button
																	key={material.slug}
																	type="button"
																	aria-pressed={isSelected}
																	onClick={() => field.handleChange(material.slug)}
																	disabled={!isAvailable || isPending}
																	className={cn(
																		"relative flex items-center justify-between px-4 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																		"hover:shadow-sm active:scale-[0.98]",
																		"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																		"disabled:cursor-not-allowed",
																		isSelected
																			? "border-primary bg-primary/5"
																			: "border-border hover:border-primary/50",
																		/* Fix 9: État disabled plus visible */
																		!isAvailable && "opacity-40 saturate-0"
																	)}
																>
																	<span className="text-sm">
																		{material.name}
																	</span>
																	{/* Fix 20: Checkmark animé */}
																	{isSelected && (
																		<motion.div
																			initial={{ scale: 0 }}
																			animate={{ scale: 1 }}
																			transition={{ type: "spring", stiffness: 400, damping: 15 }}
																		>
																			<Check className="w-4 h-4 text-primary shrink-0" />
																		</motion.div>
																	)}
																	{/* Fix 9: Ligne barrée pour indisponible */}
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
											)}
										</form.Field>
									)}

									{/* Sélecteur de taille */}
									{requiresSize && sizes.length > 0 && (
										<form.Field name="size">
											{(field) => (
												<fieldset className="space-y-2" disabled={isPending}>
													{/* Fix 6: Legend sémantique */}
													<legend className="text-sm font-medium">
														Taille
														<span className="text-destructive ml-0.5" aria-hidden="true">*</span>
														<span className="sr-only">(obligatoire)</span>
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
													</legend>
													<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
														{sizes.map((size) => {
															const isSelected = size === field.state.value;
															const isAvailable = isSizeAvailable(size);

															return (
																<button
																	key={size}
																	type="button"
																	aria-pressed={isSelected}
																	onClick={() => field.handleChange(size)}
																	disabled={!isAvailable || isPending}
																	className={cn(
																		"relative flex items-center justify-center px-2 py-3 min-h-[44px] rounded-lg border-2 transition-all",
																		"hover:shadow-sm active:scale-[0.98]",
																		"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
																		"disabled:cursor-not-allowed",
																		isSelected
																			? "border-primary bg-primary/5"
																			: "border-border hover:border-primary/50",
																		/* Fix 9: État disabled plus visible */
																		!isAvailable && "opacity-40 saturate-0"
																	)}
																>
																	<span className="text-sm font-medium truncate">
																		{size}
																	</span>
																	{/* Fix 20: Checkmark animé */}
																	{isSelected && (
																		<motion.div
																			initial={{ scale: 0 }}
																			animate={{ scale: 1 }}
																			transition={{ type: "spring", stiffness: 400, damping: 15 }}
																			className="absolute top-1.5 right-1.5"
																		>
																			<Check className="w-3.5 h-3.5 text-primary" />
																		</motion.div>
																	)}
																	{/* Fix 9: Ligne barrée pour indisponible */}
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
											)}
										</form.Field>
									)}

									{/* Sélecteur de quantité */}
									<form.Field name="quantity">
										{(field) => (
											<fieldset className="space-y-2" disabled={isPending}>
												{/* Fix 6: Legend sémantique */}
												<legend className="text-sm font-medium">Quantité</legend>
												{/* Fix 8: Espacement plus grand sur mobile */}
												<div className="flex items-center gap-4 sm:gap-3">
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
													{/* Fix 18: Input quantité cliquable */}
													<input
														type="text"
														inputMode="numeric"
														pattern="[0-9]*"
														value={field.state.value}
														onChange={(e) => {
															const val = parseInt(e.target.value) || 1;
															field.handleChange(Math.max(1, Math.min(maxQuantity, val)));
														}}
														disabled={isPending}
														className="w-12 text-center text-lg font-semibold tabular-nums bg-transparent focus:outline-none"
														aria-label="Quantité"
													/>
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

									{/* Message d'erreur de validation - Fix 21: Shake animation */}
									<AnimatePresence mode="wait">
										{validationErrors.length > 0 && !isPending && (
											<motion.p
												key={validationErrors.join()}
												initial={{ opacity: 0, height: 0, x: 0 }}
												animate={{
													opacity: 1,
													height: "auto",
													x: shouldReduceMotion ? 0 : [0, -8, 8, -8, 0]
												}}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.35 }}
												className="text-sm text-amber-600 overflow-hidden"
												role="alert"
											>
												{validationErrors.length === 1
													? validationErrors[0]
													: `${validationErrors.length} sélections requises`}
											</motion.p>
										)}
									</AnimatePresence>
									</div>
									{/* Fin du contenu scrollable */}

									{/* Footer fixe - hors du scroll */}
									{/* Fix 1: Safe area iOS pour iPhone X+ */}
									<ResponsiveDialogFooter className="shrink-0 pt-4 border-t mt-auto pb-[max(0px,env(safe-area-inset-bottom))]">
										<Button
											type="submit"
											disabled={!canAddToCart || isPending}
											className="w-full"
											size="lg"
										>
											{isPending ? "Ajout en cours..." : `Ajouter au panier · ${formatEuro(displayPrice * quantity)}`}
										</Button>
										{/* Fix 16: Message validation proactive */}
										{!canAddToCart && validationErrors.length > 0 && !isPending && (
											<p className="text-xs text-muted-foreground text-center mt-2">
												{validationErrors[0]}
											</p>
										)}
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

