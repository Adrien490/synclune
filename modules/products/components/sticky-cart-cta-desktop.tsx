"use client";

import Image from "next/image";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";
import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface StickyCartCTADesktopProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/** ID de l'element a observer pour le trigger */
	targetId?: string;
}

/**
 * StickyCartCTADesktop - Barre sticky desktop pour l'ajout rapide au panier
 *
 * Se déclenche quand le CTA principal sort du viewport. Ancrée sous la navbar
 * (top-[var(--navbar-height)]). Desktop uniquement (hidden lg:block) — il n'y a
 * volontairement PAS d'équivalent sticky mobile câblé sur la PDP (le CTA principal
 * reste accessible au scroll ; décision produit assumée).
 *
 * Pattern éditorial : thumbnail + variant summary (couleur · taille) + prix + CTA.
 */
export function StickyCartCTADesktop({
	product,
	defaultSku,
	targetId = "add-to-cart-form",
}: StickyCartCTADesktopProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const currentSku = selectedSku ?? defaultSku;
	const [isVisible, setIsVisible] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const barRef = useRef<HTMLElement>(null);
	const prefersReducedMotion = useReducedMotion();

	const { action, isPending } = useAddToCart({ showErrorToast: false });

	const isAvailable = currentSku.inventory > 0 && currentSku.isActive;
	const canAddToCart = isAvailable;

	// Une video sans poster n'est pas rendue par l'optimiseur -> pas de miniature
	const primaryMedia = currentSku.images[0];
	const thumbSrc = primaryMedia ? resolveMediaThumbSrc(primaryMedia) : null;

	useEffect(() => {
		const target = document.getElementById(targetId);
		if (!target) return;

		observerRef.current = new IntersectionObserver(
			([entry]) => {
				if (!entry) return;
				// Visible quand le CTA principal sort du viewport ET qu'on a scrollé au-dessous
				const scrolledPast = window.scrollY > target.offsetTop;
				setIsVisible(!entry.isIntersecting && scrolledPast);
			},
			{
				threshold: 0,
				// Compenser navbar (5rem desktop = 80px) + 16px marge visuelle
				rootMargin: "-96px 0px 0px 0px",
			},
		);

		observerRef.current.observe(target);
		return () => observerRef.current?.disconnect();
	}, [targetId]);

	/**
	 * Publie la hauteur RÉELLE de la barre dans `--pdp-cta-bar-height`.
	 *
	 * La barre et la galerie épinglée s'ancraient toutes deux à `--navbar-height`,
	 * la barre étant `z-(--z-bar-desktop)` (70) contre `lg:z-10` pour la galerie :
	 * à son apparition elle recouvrait le scotch et le haut de la photo, et comme
	 * la section galerie porte `lg:overflow-hidden`, la partie masquée n'était même
	 * pas récupérable au scroll. La galerie réserve donc cette hauteur au lieu de
	 * passer dessous. Même patron que `--pay-bar-height` (`pay-button.tsx`) :
	 * on mesure, on ne présume pas — `py-3` + un bouton `size="lg"` suivent la
	 * taille de police racine (WCAG 1.4.4), la hauteur n'est pas une constante px.
	 *
	 * ⚠️ Sous `lg` l'aside est `display:none`, donc mesuré à 0 : le garde
	 * `height === 0` laisse la variable inchangée et la galerie garde son offset nu.
	 *
	 * ⚠️ **La remise à zéro passe par `onExitComplete`, pas par le cleanup de cet
	 * effet.** Le cleanup s'exécute au passage `isVisible: true → false`, mais
	 * `AnimatePresence` garde l'aside monté le temps de la sortie : `barRef.current`
	 * existe encore, le corps de l'effet se rejoue et RÉÉCRIT la hauteur. Le nœud
	 * disparaît ensuite sans que l'effet soit relancé (`isVisible` n'a pas
	 * rechangé), et le garde `height === 0` neutralise le seul rattrapage — la
	 * variable restait donc collée à ~64 px pour le reste de la visite, la galerie
	 * réservant un vide sous la navbar avec un `max-h` raboté d'autant, alors que
	 * la barre n'était plus là.
	 */
	useEffect(() => {
		const el = barRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;

		const root = document.documentElement;
		const apply = () => {
			const height = Math.round(el.getBoundingClientRect().height);
			if (height === 0) return;
			root.style.setProperty("--pdp-cta-bar-height", `${height}px`);
		};

		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);

		return () => {
			observer.disconnect();
		};
	}, [isVisible]);

	// Démontage définitif (navigation) : on ne laisse pas la variable derrière nous.
	useEffect(() => {
		const root = document.documentElement;
		return () => {
			root.style.removeProperty("--pdp-cta-bar-height");
		};
	}, []);

	/** La barre a fini de sortir : la galerie récupère son offset nu. */
	const releaseBarHeight = () => {
		document.documentElement.style.setProperty("--pdp-cta-bar-height", "0px");
	};

	const slideVariants = {
		hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -100 },
		visible: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
		exit: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -100 },
	};

	// Résumé variant compact : "Rose + Argent · Taille M"
	const variantSummaryParts: string[] = [];
	const currentColorsLabel = currentSku.colors.map((c) => c.color.name).join(" + ");
	if (currentColorsLabel) variantSummaryParts.push(currentColorsLabel);
	const currentMaterialsLabel = getSkuMaterialsLabel(currentSku.materials);
	if (currentMaterialsLabel) variantSummaryParts.push(currentMaterialsLabel);
	if (currentSku.size) variantSummaryParts.push(`Taille ${currentSku.size}`);
	const variantSummary = variantSummaryParts.join(" · ");

	return (
		<AnimatePresence mode="wait" onExitComplete={releaseBarHeight}>
			{isVisible && (
				<m.aside
					ref={barRef}
					variants={slideVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					transition={MOTION_CONFIG.spring.bar}
					role="complementary"
					aria-label="Ajout rapide au panier"
					className={cn(
						// Desktop only
						"hidden lg:block",
						// Position fixe sous la navbar
						"fixed inset-x-0 top-[var(--navbar-height)] z-(--z-bar-desktop)",
						// Style
						"bg-background/95 backdrop-blur-md",
						"border-border border-b",
						"shadow-[0_4px_20px_oklch(0_0_0/0.08)]",
					)}
				>
					<form
						action={action}
						className="mx-auto flex max-w-6xl items-center gap-4 px-8 py-3"
						aria-busy={isPending}
						data-pending={isPending ? "" : undefined}
					>
						<input type="hidden" name="skuId" value={currentSku.id} />
						<input type="hidden" name="quantity" value="1" />

						{/* Miniature (décorative) */}
						{thumbSrc && (
							<div
								className="border-border bg-muted relative size-10 shrink-0 overflow-hidden rounded-lg border"
								aria-hidden="true"
							>
								<Image
									src={thumbSrc}
									alt=""
									fill
									className="object-cover"
									sizes="40px"
									quality={IMAGE_QUALITY.THUMBNAIL}
									placeholder={primaryMedia?.blurDataUrl ? "blur" : "empty"}
									blurDataURL={primaryMedia?.blurDataUrl ?? undefined}
								/>
							</div>
						)}

						{/* Titre + variant résumé */}
						<div className="min-w-0 flex-1">
							<p className="text-foreground truncate text-sm font-semibold">{product.title}</p>
							{variantSummary && (
								<p className="text-muted-foreground truncate text-xs">{variantSummary}</p>
							)}
						</div>

						{/* Prix */}
						<div className="flex shrink-0 items-baseline gap-2">
							<span className="text-foreground text-lg font-semibold">
								{formatEuro(currentSku.priceInclTax)}
							</span>
							{currentSku.compareAtPrice && currentSku.compareAtPrice > currentSku.priceInclTax && (
								<span className="text-muted-foreground text-sm line-through">
									{formatEuro(currentSku.compareAtPrice)}
								</span>
							)}
						</div>

						{/* CTA */}
						<Button
							type="submit"
							size="lg"
							disabled={!canAddToCart || isPending}
							aria-busy={isPending}
							className={cn(
								"min-w-56 shrink-0",
								"shadow-md",
								"active:scale-[0.98]",
								"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2",
							)}
						>
							{isPending ? "Ajout…" : !isAvailable ? "Indisponible" : "Ajouter au panier"}
						</Button>
					</form>
				</m.aside>
			)}
		</AnimatePresence>
	);
}
