"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NavItemChild, MegaMenuProduct } from "@/shared/constants/navigation";
import { NavigationMenuLink } from "@/shared/components/ui/navigation-menu";
import { formatPrice } from "@/modules/products/utils/format-price";
import { ROUTES } from "@/shared/constants/urls";
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
					<div
						className="border-border w-[320px] shrink-0 border-l pl-8"
						role="region"
						aria-labelledby={featuredHeadingId}
					>
						<h3
							id={featuredHeadingId}
							className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase"
						>
							Nouveautés
						</h3>
						<div className="grid grid-cols-3 gap-3">
							{featuredProducts.map((product, index) => (
								<NavigationMenuLink key={product.slug} asChild>
									<Link
										href={ROUTES.SHOP.PRODUCT(product.slug)}
										className={cn(
											"group/product flex flex-col gap-2",
											"rounded-lg p-1.5",
											"transition-all duration-300 ease-out",
											"hover:bg-accent/50",
											"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
											"motion-safe:animate-[menu-item-in_0.25s_ease-out_both]",
										)}
										style={{ animationDelay: `${(index + 1) * 60}ms` }}
									>
										<div
											className={cn(
												"bg-muted relative aspect-square overflow-hidden rounded-lg",
												"transition-[transform,box-shadow] duration-300 ease-out",
												"motion-safe:can-hover:group-hover/product:-translate-y-0.5",
												"can-hover:group-hover/product:shadow-md",
											)}
										>
											<Image
												src={product.imageUrl}
												alt=""
												fill
												sizes="90px"
												className="object-cover"
												placeholder={product.blurDataUrl ? "blur" : "empty"}
												blurDataURL={product.blurDataUrl ?? undefined}
												aria-hidden="true"
											/>
										</div>
										<div className="min-w-0">
											<p className="text-foreground line-clamp-1 text-xs font-medium">
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
