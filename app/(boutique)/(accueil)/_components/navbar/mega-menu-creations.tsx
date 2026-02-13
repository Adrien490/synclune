"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { formatPrice } from "@/modules/products/utils/format-price";
import { cn } from "@/shared/utils/cn";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
	featuredProducts?: MegaMenuProduct[];
}

export function MegaMenuCreations({ productTypes, featuredProducts }: MegaMenuCreationsProps) {
	const featuredHeadingId = useId();

	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	const hasProducts = featuredProducts && featuredProducts.length > 0;

	return (
		<div className="py-6">
			<div className={cn("flex gap-8", hasProducts && "flex-row")}>
				{/* Left zone: categories */}
				<div className={cn(hasProducts ? "flex-1" : "w-full")}>
					<MegaMenuColumn title="Catégories" items={productTypes} columns={2} />
				</div>

				{/* Right zone: featured products */}
				{hasProducts && (
					<div className="w-[320px] shrink-0 border-l border-border pl-8" role="region" aria-labelledby={featuredHeadingId}>
						<h3 id={featuredHeadingId} className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Nouveautés
						</h3>
						<div className="grid grid-cols-3 gap-3">
							{featuredProducts.map((product, index) => (
								<NavigationMenuLink key={product.slug} asChild>
									<Link
										href={`/creations/${product.slug}`}
										className={cn(
											"group/product flex flex-col gap-2",
											"rounded-lg p-1.5",
											"transition-all duration-300 ease-out",
											"hover:bg-accent/50",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
											"motion-safe:animate-[menu-item-in_0.25s_ease-out_both]",
										)}
										style={{ animationDelay: `${(index + 1) * 60}ms` }}
									>
										<div className={cn(
											"relative aspect-square overflow-hidden rounded-lg bg-muted",
											"transition-[transform,box-shadow] duration-300 ease-out",
											"motion-safe:can-hover:group-hover/product:-translate-y-0.5",
											"can-hover:group-hover/product:shadow-md",
										)}>
											<Image
												src={product.imageUrl}
												alt={product.title}
												fill
												sizes="90px"
												className="object-cover"
												placeholder={product.blurDataUrl ? "blur" : "empty"}
												blurDataURL={product.blurDataUrl ?? undefined}
											/>
										</div>
										<div className="min-w-0">
											<p className="text-xs font-medium line-clamp-1 text-foreground">
												{product.title}
											</p>
											<p className="text-xs text-muted-foreground">
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
