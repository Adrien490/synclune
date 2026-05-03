"use client";

import Image from "next/image";
import { Package } from "lucide-react";

import { ProductStatus } from "@/app/generated/prisma/enums";
import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

import { quickSearchProductsAdminAction } from "../../actions/quick-search-products-admin";
import type { AdminQuickSearchProductItem } from "../../data/quick-search-products-admin";

const STATUS_LABEL: Record<ProductStatus, string> = {
	[ProductStatus.PUBLIC]: "Publié",
	[ProductStatus.DRAFT]: "Brouillon",
	[ProductStatus.ARCHIVED]: "Archivé",
};

const STATUS_VARIANT: Record<ProductStatus, "default" | "secondary" | "outline"> = {
	[ProductStatus.PUBLIC]: "default",
	[ProductStatus.DRAFT]: "secondary",
	[ProductStatus.ARCHIVED]: "outline",
};

export const productsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchProductItem> =
	{
		scope: "products",
		placeholder: "Rechercher par titre…",
		ariaLabel: "Rechercher un produit par titre",
		minQueryLength: 2,
		search: (query) => quickSearchProductsAdminAction(query),
		getResultId: (p) => `admin-product-${p.id}`,
		getResultHref: (p) => `/admin/catalogue/produits/${p.slug}`,
		getResultLabel: (p) => p.title,
		renderResultItem: (p) => <ProductCard product={p} />,
	};

function ProductCard({ product }: { product: AdminQuickSearchProductItem }) {
	return (
		<>
			<div className="bg-muted size-12 shrink-0 overflow-hidden rounded-lg">
				{product.image ? (
					<Image
						src={product.image.url}
						alt={product.image.altText ?? product.title}
						width={48}
						height={48}
						sizes="48px"
						className={cn(
							"size-full object-cover",
							"group-hover/result:scale-110 motion-safe:transition-transform motion-safe:duration-200",
						)}
						placeholder={product.image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={product.image.blurDataUrl ?? undefined}
					/>
				) : (
					<div className="text-muted-foreground flex size-full items-center justify-center">
						<Package className="size-5" aria-hidden="true" />
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{product.title}</p>
				<div className="mt-0.5 flex items-center gap-2">
					<Badge variant={STATUS_VARIANT[product.status]} className="text-[10px]">
						{STATUS_LABEL[product.status]}
					</Badge>
					{product.priceInclTax !== null && (
						<span className="text-muted-foreground text-xs">
							{formatEuro(product.priceInclTax)}
						</span>
					)}
				</div>
			</div>
		</>
	);
}
