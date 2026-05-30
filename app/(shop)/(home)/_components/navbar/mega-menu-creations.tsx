"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { CollectionImagesGrid } from "@/modules/collections/components/collection-images-grid";
import { formatPrice } from "@/modules/products/utils/format-price";
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
		<div className="py-6" role="region" aria-labelledby={regionHeadingId}>
			<h2 id={regionHeadingId} className="sr-only">
				Créations
			</h2>
			<div className="flex gap-8">
				{/* Left zone: categories — largeur contrainte sans rail pour éviter l'étirement. */}
				<div className={cn(hasRail ? "flex-1" : "w-full max-w-3xl")}>
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
						className="border-border w-[360px] shrink-0 border-l pl-8"
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
						<div
							className={cn(
								"grid gap-4",
								featuredProducts.length === 1 ? "grid-cols-1" : "grid-cols-2",
							)}
						>
							{featuredProducts.map((product) => (
								<NavigationMenuLink key={product.slug} asChild>
									<Link
										href={ROUTES.SHOP.PRODUCT(product.slug)}
										className={cn(
											"group/product flex flex-col gap-2",
											"rounded-lg p-1.5",
											// Single product: cap width so the square image doesn't balloon
											// across the full 360px right zone.
											featuredProducts.length === 1 && "max-w-[170px]",
											"ease-out motion-safe:transition-all motion-safe:duration-[var(--duration-slow)]",
											"hover:bg-accent/50",
											"focus-ring",
										)}
									>
										<div
											className={cn(
												"bg-muted relative aspect-square overflow-hidden rounded-lg",
												"ease-out motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)]",
												"motion-safe:can-hover:group-hover/product:-translate-y-0.5",
												"can-hover:group-hover/product:shadow-premium-rose",
											)}
										>
											<Image
												src={product.imageUrl}
												alt=""
												fill
												sizes="(max-width: 1024px) 140px, 160px"
												className="object-cover"
												placeholder={product.blurDataUrl ? "blur" : "empty"}
												blurDataURL={product.blurDataUrl ?? undefined}
												aria-hidden="true"
											/>
											{product.isNew && (
												<span
													className={cn(
														"absolute top-1 left-1 z-10",
														"rounded-full px-1.5 py-0.5",
														"bg-primary/90 text-primary-foreground",
														"text-[0.625rem] leading-none font-medium tracking-wide",
														"shadow-sm backdrop-blur-sm",
													)}
												>
													Nouveau
												</span>
											)}
										</div>
										<div className="min-w-0">
											<p className="text-foreground line-clamp-1 text-sm font-medium">
												{product.title}
											</p>
											<p className="text-muted-foreground text-xs">
												{formatPrice(product.priceInclTax / 100)}
											</p>
										</div>
									</Link>
								</NavigationMenuLink>
							))}
						</div>
					</div>
				)}

				{/* Right zone fallback: spotlight collection (quand pas de nouveautés) */}
				{hasSpotlight && spotlightCollection && (
					<div
						className="border-border w-[360px] shrink-0 border-l pl-8"
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
						<NavigationMenuLink asChild>
							<Link
								href={spotlightCollection.href}
								aria-current={pathname === spotlightCollection.href ? "page" : undefined}
								className={cn(
									"group/spotlight block rounded-lg p-1.5",
									"ease-out motion-safe:transition-all motion-safe:duration-[var(--duration-slow)]",
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
							</Link>
						</NavigationMenuLink>
					</div>
				)}
			</div>
		</div>
	);
}
