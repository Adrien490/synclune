import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesMobileListSkeleton } from "@/modules/product-types/components/admin/product-types-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function ProductTypesLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des types de produits">
			<span className="sr-only">Chargement des types de produits...</span>

			<PageHeader
				variant="compact"
				title="Types de produits"
				description="Catégoriez vos créations par type de bijou"
				actions={<Skeleton className="h-10 w-48" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} />

				<div className="min-h-[1px]" aria-hidden="true" />

				<ProductTypesMobileListSkeleton />
				<ProductTypesDataTableSkeleton />
			</div>
		</div>
	);
}
