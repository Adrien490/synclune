"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { formatEuro } from "@/shared/utils/format-euro";
import { ROUTES } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { ArrowRight } from "lucide-react";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
	featuredProducts?: MegaMenuProduct[];
	/** Collection vedette : fallback éditorial du rail droit quand aucune nouveauté n'est dispo. */
	spotlightCollection?: NavItemChild;
}

/**
 * Rail droit du panneau. Passé de 360px à 15rem avec le panneau ancré : les
 * vignettes carrées côte à côte devenaient minuscules dans cette largeur, d'où
 * le passage à des lignes compactes (vignette + libellé), qui logent les deux
 * nouveautés sans allonger le panneau.
 */
const RAIL_WIDTH = "w-60";

export function MegaMenuCreations({
	productTypes,
	featuredProducts,
	spotlightCollection,
}: MegaMenuCreationsProps) {
	const featuredHeadingId = useId();
	const spotlightHeadingId = useId();
	const regionHeadingId = useId();
	const pathname = usePathname();

	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	const hasProducts = !!(featuredProducts && featuredProducts.length > 0);
	// Fallback éditorial : si pas de nouveautés mais une collection vedette avec images,
	// on remplit le rail droit pour éviter un panneau à moitié vide (F1).
	const spotlightImages = spotlightCollection?.images ?? [];
	const hasSpotlight = !hasProducts && spotlightImages.length > 0;
	const hasRail = hasProducts || hasSpotlight;

	return (
		// Le panneau porte sa propre largeur (cf. `DesktopNav`) : 46rem avec le rail,
		// nettement moins sans lui — sinon les catégories s'étirent dans le vide.
		<div
			role="region"
			aria-labelledby={regionHeadingId}
			className={cn(
				"px-6 py-5",
				hasRail ? "w-[min(46rem,var(--available-width))]" : "w-[min(28rem,var(--available-width))]",
			)}
		>
			<h2 id={regionHeadingId} className="sr-only">
				Créations
			</h2>
			<div className="flex gap-6">
				{/* Left zone: categories */}
				<div className="min-w-0 flex-1">
					<MegaMenuColumn
						title="Catégories"
						subtitle="Bijoux par type"
						items={productTypes}
						columns={2}
					/>
				</div>

				{/* Right zone: nouveautés (prioritaire) */}
				{hasProducts && (
					<div
						className={cn("border-border shrink-0 border-l pl-6", RAIL_WIDTH)}
						role="region"
						aria-labelledby={featuredHeadingId}
					>
						<h3
							id={featuredHeadingId}
							className="text-foreground font-display mb-1 text-sm leading-tight font-medium"
						>
							Nouveautés
						</h3>
						<p className="text-muted-foreground font-display mb-3 text-xs italic">
							Pièces récentes de l&apos;atelier
						</p>
						<div className="grid gap-1">
							{featuredProducts.map((product) => (
								<NavigationMenuLink
									key={product.slug}
									render={<Link href={ROUTES.SHOP.PRODUCT(product.slug)} />}
									className={cn(
										"group/product flex items-center gap-3",
										"rounded-lg p-1.5",
										"ease-out motion-safe:transition-colors motion-safe:duration-[var(--duration-slow)]",
										"hover:bg-accent/50",
										"focus-ring",
									)}
								>
									<div
										className={cn(
											"bg-muted relative size-14 shrink-0 overflow-hidden rounded-md",
											"ease-out motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)]",
											"motion-safe:can-hover:group-hover/product:-translate-y-0.5",
											"can-hover:group-hover/product:shadow-premium-rose",
										)}
									>
										<Image
											src={product.imageUrl}
											alt=""
											fill
											sizes="56px"
											className="object-cover"
											placeholder={product.blurDataUrl ? "blur" : "empty"}
											blurDataURL={product.blurDataUrl ?? undefined}
											aria-hidden="true"
										/>
									</div>
									<div className="min-w-0">
										<p className="text-foreground line-clamp-1 text-sm font-medium">
											{product.title}
										</p>
										<p className="text-muted-foreground flex items-center gap-1.5 text-xs">
											{formatEuro(product.priceInclTax, { compact: true })}
											{product.isNew && (
												// Le badge a quitté la vignette : à 56px il la mangeait.
												<span
													className={cn(
														"rounded-full px-1.5 py-0.5",
														"bg-primary/90 text-primary-foreground",
														"text-[0.625rem] leading-none font-medium tracking-wide",
													)}
												>
													Nouveau
												</span>
											)}
										</p>
									</div>
								</NavigationMenuLink>
							))}
						</div>
					</div>
				)}

				{/* Right zone fallback: spotlight collection (quand pas de nouveautés) */}
				{hasSpotlight && spotlightCollection && (
					<div
						className={cn("border-border shrink-0 border-l pl-6", RAIL_WIDTH)}
						role="region"
						aria-labelledby={spotlightHeadingId}
					>
						<h3
							id={spotlightHeadingId}
							className="text-foreground font-display mb-1 text-sm leading-tight font-medium"
						>
							À découvrir
						</h3>
						<p className="text-muted-foreground font-display mb-3 text-xs italic">
							Une collection à explorer
						</p>
						<NavigationMenuLink
							render={
								<Link
									href={spotlightCollection.href}
									aria-current={pathname === spotlightCollection.href ? "page" : undefined}
								/>
							}
							className={cn(
								"group/spotlight block rounded-lg p-1.5",
								"ease-out motion-safe:transition-colors motion-safe:duration-[var(--duration-slow)]",
								"hover:bg-accent/50",
								"focus-ring",
							)}
						>
							<div
								className={cn(
									"overflow-hidden rounded-lg",
									"ease-out motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)]",
									"motion-safe:can-hover:group-hover/spotlight:-translate-y-0.5",
									"can-hover:group-hover/spotlight:shadow-premium-rose",
								)}
							>
								<CollectionImagesGrid
									images={spotlightImages}
									collectionName={spotlightCollection.label}
									variant="compact"
								/>
							</div>
							<div className="mt-2 min-w-0 px-0.5">
								<p className="text-foreground line-clamp-1 text-sm font-medium">
									{spotlightCollection.label}
								</p>
								<span className="text-primary mt-0.5 inline-flex items-center gap-1 text-xs font-medium">
									Découvrir la collection
									<ArrowRight className="size-3" aria-hidden="true" />
								</span>
							</div>
						</NavigationMenuLink>
					</div>
				)}
			</div>
		</div>
	);
}
