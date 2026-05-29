import { OrdersDataTableSkeleton } from "@/modules/orders/components/admin/orders-data-table-skeleton";
import { OrdersMobileListSkeleton } from "@/modules/orders/components/admin/orders-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function OrdersAdminLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des commandes" className="space-y-6">
			<span className="sr-only">Chargement des commandes…</span>

			<PageHeader variant="compact" title="Commandes" className="hidden md:block" />

			<StickyActionBarSkeleton itemCount={2} withSearch />

			<ToolbarSkeleton selectCount={1} buttonCount={3} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<OrdersMobileListSkeleton />
			<OrdersDataTableSkeleton />
		</div>
	);
}
