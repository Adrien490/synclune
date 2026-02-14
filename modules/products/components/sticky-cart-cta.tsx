"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/shared/components/ui/button";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useVariantValidation } from "@/modules/skus/hooks/use-sku-validation";
import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useBottomBarHeight } from "@/shared/hooks";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

interface StickyCartCTAProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/** ID de l'element a observer pour le trigger */
	targetId?: string;
}

/**
 * StickyCartCTA - Barre sticky mobile pour l'ajout au panier
 *
 * Apparait quand le bouton principal sort du viewport.
 * Affiche le prix et un bouton d'ajout au panier.
 * Synchronise le SKU avec les parametres URL.
 *
 * Mobile only (sm:hidden).
 */
export function StickyCartCTA({
	product,
	defaultSku,
	targetId = "add-to-cart-form",
}: StickyCartCTAProps) {
	// Synchroniser le SKU avec l'URL (meme pattern que ProductDetails)
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const currentSku = selectedSku ?? defaultSku;
	const [isVisible, setIsVisible] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const prefersReducedMotion = useReducedMotion();

	useBottomBarHeight(60, isVisible);

	const { action, isPending } = useAddToCart();
	const searchParams = useSearchParams();

	const { validationErrors } = useVariantValidation({
		product,
		selection: {
			color: searchParams.get("color"),
			material: searchParams.get("material"),
			size: searchParams.get("size"),
		},
	});

	// Verifier si le produit a un seul SKU
	const hasOnlyOneSku = product.skus && product.skus.length === 1;

	// Verifier si le SKU est disponible
	const isAvailable = currentSku
		? currentSku.inventory > 0 && currentSku.isActive
		: false;

	const canAddToCart = currentSku && isAvailable;

	// Observer le bouton principal pour declencher l'affichage
	useEffect(() => {
		const target = document.getElementById(targetId);
		if (!target) return;

		observerRef.current = new IntersectionObserver(
			([entry]) => {
				// Afficher quand le bouton n'est plus visible
				setIsVisible(!entry.isIntersecting);
			},
			{
				threshold: 0,
				rootMargin: "-64px 0px 0px 0px", // Compenser la navbar
			}
		);

		observerRef.current.observe(target);

		return () => {
			observerRef.current?.disconnect();
		};
	}, [targetId]);

	// Animation variants
	const slideVariants = {
		hidden: prefersReducedMotion
			? { opacity: 0 }
			: { opacity: 0, y: 100 },
		visible: prefersReducedMotion
			? { opacity: 1 }
			: { opacity: 1, y: 0 },
		exit: prefersReducedMotion
			? { opacity: 0 }
			: { opacity: 0, y: 100 },
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					variants={slideVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					transition={MOTION_CONFIG.spring.bar}
					className={cn(
						// Mobile only
						"sm:hidden",
						// Position fixe en bas
						"fixed bottom-0 left-0 right-0 z-50",
						// Safe area pour iPhone X+
						"pb-[env(safe-area-inset-bottom)]",
						// Style
						"bg-background/95 backdrop-blur-md",
						"border-t border-border",
						"shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
					)}
				>
					<form
						action={action}
						className="flex items-center gap-2.5 px-3 py-2.5"
						aria-label="Ajout rapide au panier"
						aria-busy={isPending}
						data-pending={isPending ? "" : undefined}
					>
						{/* Champs caches */}
						{currentSku && (
							<>
								<input type="hidden" name="skuId" value={currentSku.id} />
								<input type="hidden" name="quantity" value="1" />
							</>
						)}

						{/* Miniature du produit (decorative) */}
						{currentSku?.images?.[0]?.url && (
							<div
								className="shrink-0 relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted"
								aria-hidden="true"
							>
								<Image
									src={currentSku.images[0].thumbnailUrl || currentSku.images[0].url}
									alt=""
									fill
									className="object-cover"
									sizes="40px"
								/>
							</div>
						)}

						{/* Prix et nom */}
						<div className="flex-1 min-w-0">
							{currentSku ? (
								<>
									<div className="flex items-baseline gap-1.5">
										<span className="text-base font-bold text-foreground">
											{formatEuro(currentSku.priceInclTax)}
										</span>
										{currentSku.compareAtPrice &&
											currentSku.compareAtPrice > currentSku.priceInclTax && (
												<span className="text-xs text-muted-foreground line-through">
													{formatEuro(currentSku.compareAtPrice)}
												</span>
											)}
									</div>
									{/* Nom du SKU tronqué */}
									<p className="text-xs text-muted-foreground truncate">
										{currentSku.color?.name || product.title}
									</p>
								</>
							) : (
								<span className="text-sm text-muted-foreground">
									Sélectionne tes options
								</span>
							)}
						</div>

						{/* Bouton */}
						<Button
							type="submit"
							size="lg"
							disabled={!canAddToCart || isPending}
							aria-busy={isPending}
							className={cn(
								"shrink-0 min-w-40",
								"shadow-md",
								"active:scale-[0.98]",
								"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							)}
						>
							{isPending ? (
								"Ajout..."
							) : !isAvailable ? (
								"Indisponible"
							) : !currentSku ? (
								hasOnlyOneSku ? (
									"Non disponible"
								) : (
									validationErrors[0] || "Choisir"
								)
							) : (
								"Ajouter au panier"
							)}
						</Button>
					</form>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
