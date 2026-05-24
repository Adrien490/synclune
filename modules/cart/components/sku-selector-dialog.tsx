"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
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
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { slugify } from "@/shared/utils/generate-slug";

import type { SkuSelectorDialogData } from "../types/dialog-data.types";
import { SKU_SELECTOR_DIALOG_ID, extractVariantOptions } from "./sku-selector-utils";
import { SkuSelectorFormContent } from "./sku-selector-form-content";

export type { SkuSelectorDialogData };
export { SKU_SELECTOR_DIALOG_ID };

// ============================================================================
// Main Component
// ============================================================================

interface SkuSelectorDialogProps {
	/** Cart data for checking available quantities */
	cart: GetCartReturn;
}

/**
 * Dialog de sélection de variante pour ajout rapide au panier
 *
 * S'affiche quand l'utilisateur clique sur "Ajouter au panier"
 * sur une ProductCard avec plusieurs variantes.
 *
 * Utilise TanStack Form (useAppForm) pour la gestion du formulaire
 */
export function SkuSelectorDialog({ cart }: SkuSelectorDialogProps) {
	const cartItems =
		cart?.items.map((item) => ({
			skuId: item.sku.id,
			quantity: item.quantity,
		})) ?? [];

	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(SKU_SELECTOR_DIALOG_ID);
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

	// Reset form when dialog opens with a new product
	// Pre-selects default SKU variants for better UX
	useEffect(() => {
		if (isOpen && product) {
			const activeSkus = product.skus.filter((sku) => sku.isActive);
			const defaultSku =
				activeSkus.find((sku) => sku.isDefault && sku.inventory > 0) ??
				activeSkus.find((sku) => sku.inventory > 0) ??
				activeSkus.find((sku) => sku.isDefault) ??
				activeSkus[0];
			const { colors, materials, sizes } = extractVariantOptions(activeSkus);

			// Validate preselectedColor exists in active colors
			const validPreselectedColor =
				preselectedColor && colors.some((c) => c.slug === preselectedColor)
					? preselectedColor
					: null;

			// Priority: validPreselectedColor > default SKU primary color > auto-select if unique
			const defaultPrimaryColorSlug = defaultSku?.colors[0]?.color.slug;
			const initialColor =
				validPreselectedColor ??
				defaultPrimaryColorSlug ??
				(colors.length === 1 ? colors[0]!.slug : "");

			// Matériau initial : matériau principal du defaultSku (1er de la liste M2M)
			const defaultPrimaryMaterialName = defaultSku?.materials[0]?.material.name;
			const initialMaterial =
				(defaultPrimaryMaterialName ? slugify(defaultPrimaryMaterialName) : "") ||
				(materials.length === 1 ? materials[0]!.slug : "") ||
				"";

			const initialSize = defaultSku?.size ?? (sizes.length === 1 ? sizes[0] : "") ?? "";

			form.reset({
				color: initialColor,
				material: initialMaterial,
				size: initialSize,
				quantity: 1,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset is stable
	}, [isOpen, product, preselectedColor]);

	const handleClose = () => {
		form.reset();
		close();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	// Skeleton state with aria-busy and accessible title
	if (!product) {
		return (
			<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
				<ResponsiveDialogContent className="sm:max-w-130" aria-busy="true">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle className="sr-only">
							Chargement des options du produit
						</ResponsiveDialogTitle>
						<Skeleton className="h-6 w-40" aria-hidden="true" />
						<ResponsiveDialogDescription className="sr-only">
							Chargement en cours
						</ResponsiveDialogDescription>
						<Skeleton className="mt-1 h-4 w-32" aria-hidden="true" />
					</ResponsiveDialogHeader>
					<div className="space-y-6 py-4">
						{/* Image + Prix skeleton */}
						<div className="flex gap-4">
							<Skeleton className="size-24 shrink-0 rounded-lg sm:size-40" />
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
								<Skeleton className="size-11 rounded-md" />
								<Skeleton className="h-6 w-8" />
								<Skeleton className="size-11 rounded-md" />
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

	const activeSkus = product.skus.filter((sku) => sku.isActive);
	const { colors, materials, sizes } = extractVariantOptions(activeSkus);

	// Check for product unavailability
	const noActiveSkus = activeSkus.length === 0;
	const allOutOfStock = activeSkus.length > 0 && activeSkus.every((sku) => sku.inventory <= 0);

	const hasAdjustableSizes = sizes.some((s) => s.toLowerCase().includes("ajustable"));
	const requiresSize =
		!hasAdjustableSizes &&
		sizes.length > 0 &&
		PRODUCT_TYPES_REQUIRING_SIZE.includes(
			product.type?.slug as (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number],
		);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="group/sku-selector sm:max-h-[85vh] sm:max-w-130">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle className="line-clamp-1">{product.title}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Choisissez vos options pour ajouter au panier
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<RequiredFieldsNote />

				{/* Unavailable product message */}
				{(noActiveSkus || allOutOfStock) && (
					<div className="space-y-3 py-8 text-center">
						<p role="alert" className="text-muted-foreground">
							{noActiveSkus
								? "Ce produit n'est actuellement pas disponible"
								: "Ce produit est actuellement en rupture de stock"}
						</p>
						<Link
							href={`/creations/${product.slug}`}
							onClick={handleClose}
							aria-label={`Voir la fiche produit : ${product.title}`}
							className="text-muted-foreground can-hover:hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
						>
							Voir la fiche produit
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</Link>
					</div>
				)}

				{/* Normal form - only when SKUs are available */}
				{!noActiveSkus && !allOutOfStock && (
					<form
						action={action}
						className="flex min-h-0 flex-1 flex-col"
						data-pending={isPending ? "" : undefined}
					>
						{/* Variant fields subscribe -- isolated from quantity changes */}
						<form.Subscribe selector={(state) => state.values}>
							{(values) => (
								<SkuSelectorFormContent
									key={product.id}
									values={values}
									onColorChange={(c) => form.setFieldValue("color", c)}
									onMaterialChange={(m) => form.setFieldValue("material", m)}
									onSizeChange={(s) => form.setFieldValue("size", s)}
									onQuantityChange={(q) => form.setFieldValue("quantity", q)}
									product={product}
									activeSkus={activeSkus}
									colors={colors}
									materials={materials}
									sizes={sizes}
									requiresSize={requiresSize}
									cartItems={cartItems}
									isPending={isPending}
									shouldReduceMotion={shouldReduceMotion}
									handleClose={handleClose}
								/>
							)}
						</form.Subscribe>
					</form>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
