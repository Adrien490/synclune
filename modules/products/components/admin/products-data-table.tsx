// React & Next.js
import Link from "next/link";

// External packages
import { GlobeIcon, NotePencilIcon, PackageIcon } from "@phosphor-icons/react/ssr";

// Shared components
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { Badge } from "@/shared/components/ui/badge";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { getStockAriaLabel, getStockVariant } from "@/shared/utils/stock-variant";

// Module imports
import {
	productStatusLabel,
	productStatusVariant,
} from "@/modules/products/constants/product-status-display";
import { type GetProductsReturn } from "@/modules/products/data/get-products";
import { calculatePriceInfo } from "@/modules/products/services/product-pricing.service";
import {
	formatPriceRangeAriaLabel,
	formatPriceRangeDisplay,
} from "@/modules/products/utils/format-price-range";
import { getProductTotalStock } from "@/modules/products/utils/get-product-total-stock";

// Local components
import { ProductImageCell } from "./product-image-cell";
import { ProductRowActions } from "./product-row-actions";

interface ProductsDataTableProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export async function ProductsDataTable({
	productsPromise,
	perPage,
	hasActiveFilters,
}: ProductsDataTableProps) {
	const { products, pagination, totalCount } = await productsPromise;

	if (products.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={PackageIcon}
				title="Aucun bijou trouvé"
				description="Aucun bijou ne correspond aux critères de recherche."
				hasActiveFilters={hasActiveFilters}
				noItemsDescription="Vous n'avez pas encore de bijou dans le catalogue."
				resetFiltersHref="/admin/catalogue/produits"
				action={{
					label: "Créer un produit",
					href: "/admin/catalogue/produits/nouveau",
				}}
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des bijoux"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: products.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[8%]">Image</TableHead>
					<TableHead className="w-[32%]">Titre</TableHead>
					<TableHead className="w-[14%]">Statut</TableHead>
					<TableHead className="w-[10%] text-center">Variantes</TableHead>
					<TableHead className="w-[14%] text-right">Prix</TableHead>
					<TableHead className="w-[10%] text-center">Stock</TableHead>
					<TableHead className="w-[12%]" aria-label="Actions disponibles pour chaque produit">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.map((product) => {
					const totalStock = getProductTotalStock(product.variants);
					const variantsCount = product._count.variants || 0;
					const priceInfo = calculatePriceInfo(product.variants, product.priceCents);

					return (
						<TableRow key={product.id}>
							<TableCell className="py-3">
								<ProductImageCell images={product.media} productTitle={product.name} />
							</TableCell>
							<TableCell>
								<div className="overflow-hidden">
									<Link
										href={`/admin/catalogue/produits/${product.slug}`}
										className="text-foreground hover:text-foreground block truncate font-semibold hover:underline"
										title={`Voir ${product.name}`}
										aria-label={`Voir ${product.name}`}
									>
										{product.name}
									</Link>
								</div>
							</TableCell>
							<TableCell>
								{(() => {
									const label = productStatusLabel(product.active);
									const Icon = product.active ? GlobeIcon : NotePencilIcon;
									return (
										<Badge
											variant={productStatusVariant(product.active)}
											role="status"
											aria-label={`Statut : ${label}`}
										>
											<Icon aria-hidden="true" />
											{label}
										</Badge>
									);
								})()}
							</TableCell>
							<TableCell className="text-center">
								{variantsCount === 0 ? (
									<span className="text-muted-foreground text-sm" aria-label="Aucune variante">
										—
									</span>
								) : variantsCount === 1 ? (
									<Link
										href={`/admin/catalogue/produits/${product.slug}/variantes`}
										className="text-muted-foreground text-xs hover:underline"
										aria-label="Une seule variante — Voir la variante"
										title="Voir la variante"
									>
										Variante unique
									</Link>
								) : (
									<Link
										href={`/admin/catalogue/produits/${product.slug}/variantes`}
										className="text-sm font-medium hover:underline"
										aria-label={`${variantsCount} variantes - Cliquer pour gerer`}
										title="Gerer les variantes"
									>
										{variantsCount}
									</Link>
								)}
							</TableCell>
							<TableCell className="text-right">
								<span
									className="text-sm font-medium"
									title={formatPriceRangeDisplay(priceInfo)}
									aria-label={formatPriceRangeAriaLabel(priceInfo)}
								>
									{formatPriceRangeDisplay(priceInfo)}
								</span>
							</TableCell>
							<TableCell className="text-center">
								<Link
									href={`/admin/catalogue/produits/${product.slug}/variantes`}
									title="Gérer le stock des variantes"
									aria-label={`${getStockAriaLabel(totalStock)} — Gérer les variantes`}
								>
									<Badge variant={getStockVariant(totalStock)}>{totalStock}</Badge>
								</Link>
							</TableCell>
							<TableCell className="text-right">
								<ProductRowActions
									productId={product.id}
									productSlug={product.slug}
									productTitle={product.name}
									productActive={product.active}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
