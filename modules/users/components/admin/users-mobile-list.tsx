import { use } from "react";
import { Users } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { UserMobileItem } from "./user-mobile-item";
import { UsersBulkActionsBar } from "./users-bulk-actions-bar";

interface UsersMobileListProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function UsersMobileList({ usersPromise, perPage, hasActiveFilters }: UsersMobileListProps) {
	const { users, pagination } = use(usersPromise);

	if (users.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Users}
					title="Aucun client trouve"
					description={
						hasActiveFilters
							? "Aucun client ne correspond aux criteres de recherche."
							: "Aucun client pour l'instant."
					}
					actionElement={
						hasActiveFilters ? <EmptyResetFiltersAction href="/admin/clients" /> : undefined
					}
				/>
			</div>
		);
	}

	const pageItemIds = users.map((u) => u.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "client", plural: "clients" }} />
				<AdminListLiveCount count={users.length} singular="client" plural="clients" />
				<ItemGroup aria-label="Clients" className="gap-2">
					{users.map((user) => (
						<div key={user.id} role="listitem">
							<UserMobileItem user={user} />
						</div>
					))}
				</ItemGroup>

				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={users.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
				/>
			</div>
			<MobileSelectionBottomBar>
				<UsersBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
