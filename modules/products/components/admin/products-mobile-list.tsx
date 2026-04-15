import { use } from "react";
import { Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { ProductStatus } from "@/app/generated/prisma/client";
import type { GetProductsReturn } from "@/modules/products/types/product.types";
import { ProductRowActions } from "./product-row-actions";
import { ProductsSelectionToolbar } from "./products-selection-toolbar";

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "Archivé", variant: "outline" },
};

type ProductWithSkus = { skus: Array<{ priceInclTax: number; inventory: number }> };

const getTotalStock = (product: ProductWithSkus) => {
	return product.skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);
};

const getPriceRange = (product: ProductWithSkus) => {
	if (product.skus.length === 0) return null;
	const prices = product.skus.map((sku) => sku.priceInclTax);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	return { minPrice, maxPrice };
};

const formatPriceDisplay = (priceData: { minPrice: number; maxPrice: number } | null) => {
	if (!priceData) return "—";
	const { minPrice, maxPrice } = priceData;
	if (minPrice === maxPrice) return formatPrice(minPrice);
	return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
};

interface ProductsMobileListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ProductsMobileList({
	productsPromise,
	perPage,
	hasActiveFilters,
}: ProductsMobileListProps) {
	const { products, pagination } = use(productsPromise);

	if (products.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Package}
					title="Aucun produit trouvé"
					description={
						hasActiveFilters
							? "Aucun produit ne correspond aux critères de recherche."
							: "Commencez par créer votre premier produit."
					}
					actionElement={
						<Link
							href="/admin/catalogue/produits/nouveau"
							className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
						>
							Nouveau produit
						</Link>
					}
				/>
			</div>
		);
	}

	const productsForSelection = products.map((p) => ({
		id: p.id,
		status: p.status,
	}));

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ProductsSelectionToolbar products={productsForSelection} />

			<ItemGroup aria-label="Produits" className="gap-2">
				{products.map((product) => {
					const status = STATUS_CONFIG[product.status];
					const priceRange = getPriceRange(product);
					const totalStock = getTotalStock(product);
					const primaryImage = product.skus
						.flatMap((sku) => sku.images)
						.find((img) => img.isPrimary);

					return (
						<div key={product.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte produit"
							>
								{/* Image miniature */}
								{primaryImage ? (
									<Link
										href={`/admin/catalogue/produits/${product.slug}/modifier`}
										className="shrink-0"
										tabIndex={-1}
										aria-hidden="true"
									>
										<Image
											src={primaryImage.thumbnailUrl ?? primaryImage.url}
											alt=""
											width={48}
											height={48}
											className="size-12 rounded-md border object-cover"
											{...(primaryImage.blurDataUrl
												? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
												: {})}
										/>
									</Link>
								) : (
									<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
										<Package className="text-muted-foreground size-5" aria-hidden="true" />
									</div>
								)}

								<ItemContent className="min-w-0">
									<ItemTitle>
										<Link
											href={`/admin/catalogue/produits/${product.slug}/modifier`}
											className="truncate font-semibold hover:underline"
										>
											{product.title}
										</Link>
										<Badge variant={status.variant}>{status.label}</Badge>
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span className="font-medium">{formatPriceDisplay(priceRange)}</span>
										<span aria-hidden="true">·</span>
										<span>{totalStock} en stock</span>
										<span aria-hidden="true">·</span>
										<span>
											{product.skus.length} variante{product.skus.length > 1 ? "s" : ""}
										</span>
										{product.type && (
											<>
												<span aria-hidden="true">·</span>
												<span>{product.type.label}</span>
											</>
										)}
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<ProductRowActions
										productId={product.id}
										productSlug={product.slug}
										productTitle={product.title}
										productStatus={product.status}
									/>
								</ItemActions>
							</Item>
						</div>
					);
				})}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={products.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
