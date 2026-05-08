import { ProductsDataTableSkeleton } from "@/modules/products/components/admin/products-data-table-skeleton";
import { ProductsMobileListSkeleton } from "@/modules/products/components/admin/products-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { Button } from "@/shared/components/ui/button";

export default function ProductsListLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des bijoux" className="space-y-6">
			<span className="sr-only">Chargement des bijoux…</span>

			<PageHeader
				title="Produits"
				variant="compact"
				actions={<Button disabled>Nouveau produit</Button>}
				className="hidden md:block"
			/>

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<ProductsMobileListSkeleton />
			<ProductsDataTableSkeleton />
		</div>
	);
}
