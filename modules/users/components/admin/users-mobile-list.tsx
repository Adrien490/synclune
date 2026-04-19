import { use } from "react";
import { Users } from "lucide-react";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { UserMobileItem } from "./user-mobile-item";

interface UsersMobileListProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
}

export function UsersMobileList({ usersPromise, perPage }: UsersMobileListProps) {
	const { users, pagination } = use(usersPromise);

	if (users.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Users}
					title="Aucun client trouve"
					description="Aucun client ne correspond aux criteres de recherche."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
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
	);
}
