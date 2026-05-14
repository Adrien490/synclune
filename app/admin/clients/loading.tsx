import { UsersDataTableSkeleton } from "@/modules/users/components/admin/users-data-table-skeleton";
import { UsersMobileListSkeleton } from "@/modules/users/components/admin/users-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function UsersAdminLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des clients" className="space-y-6">
			<span className="sr-only">Chargement des clients…</span>

			<PageHeader variant="compact" title="Clients" className="hidden md:block" />

			<StickyActionBarSkeleton itemCount={3} />

			<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<UsersMobileListSkeleton />
			<UsersDataTableSkeleton />
		</div>
	);
}
