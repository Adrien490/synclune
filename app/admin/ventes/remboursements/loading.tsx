import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { RefundsMobileListSkeleton } from "@/modules/refunds/components/admin/refunds-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function RefundsAdminLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des remboursements">
			<span className="sr-only">Chargement des remboursements…</span>

			<PageHeader variant="compact" title="Remboursements" className="hidden md:block" />

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />

				<RefundsMobileListSkeleton />
				<RefundsDataTableSkeleton />
			</div>
		</div>
	);
}
