import { ProductTypesDataTableSkeleton } from "@/modules/product-types/components/admin/product-types-data-table-skeleton";
import { ProductTypesMobileListSkeleton } from "@/modules/product-types/components/admin/product-types-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function ProductTypesLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des types de bijoux"
			className="space-y-6"
		>
			<span className="sr-only">Chargement des types de bijoux…</span>

			<PageHeader
				variant="compact"
				title="Types de bijoux"
				actions={<Skeleton className="h-10 w-48" />}
				className="hidden md:block"
			/>

			<StickyActionBarSkeleton itemCount={4} />

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<ProductTypesMobileListSkeleton />
			<ProductTypesDataTableSkeleton />
		</div>
	);
}
