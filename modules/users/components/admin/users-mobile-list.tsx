import { use } from "react";
import { Users } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { UserMobileItem } from "./user-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface UsersMobileListProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function UsersMobileList({ usersPromise, perPage, hasActiveFilters }: UsersMobileListProps) {
	const { users, pagination, totalCount } = use(usersPromise);

	if (users.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={Users}
					title="Aucun client trouvé"
					description={
						hasActiveFilters
							? "Aucun client ne correspond aux critères de recherche."
							: "Aucun client à fidéliser pour l'instant."
					}
					actionElement={
						hasActiveFilters ? <EmptyResetFiltersAction href="/admin/clients" /> : undefined
					}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={users.length}
				singular="client"
				plural="clients"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Clients" className="gap-2">
				{users.map((user) => (
					<li key={user.id}>
						<UserMobileItem user={user} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={users.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
