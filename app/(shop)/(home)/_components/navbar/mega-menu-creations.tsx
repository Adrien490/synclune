"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { formatPrice } from "@/modules/products/utils/format-price";
import { ROUTES } from "@/shared/constants/urls";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
	featuredProducts?: MegaMenuProduct[];
}

export function MegaMenuCreations({ productTypes, featuredProducts }: MegaMenuCreationsProps) {
	const featuredHeadingId = useId();
	const regionHeadingId = useId();

	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	const hasProducts = featuredProducts && featuredProducts.length > 0;

	return (
		<div className="py-6" role="region" aria-labelledby={regionHeadingId}>
			<h2 id={regionHeadingId} className="sr-only">
				Créations
			</h2>
			<div className={cn("flex gap-8", hasProducts && "flex-row")}>
				{/* Left zone: categories */}
				<div className={cn(hasProducts ? "flex-1" : "w-full")}>
					<MegaMenuColumn
						title="Catégories"
						subtitle="Bijoux par type"
						items={productTypes}
						columns={2}
					/>
				</div>

				{/* Right zone: featured products */}
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
						<div className="grid grid-cols-2 gap-4">
							{featuredProducts.map((product) => (
								<NavigationMenuLink key={product.slug} asChild>
									<Link
										href={ROUTES.SHOP.PRODUCT(product.slug)}
										onClick={() => triggerHaptic("light")}
										className={cn(
											"group/product flex flex-col gap-2",
											"rounded-lg p-1.5",
											"ease-out motion-safe:transition-all motion-safe:duration-[var(--duration-slow)]",
											"hover:bg-accent/50",
											"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
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
			</div>
		</div>
	);
}
