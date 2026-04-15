import { use } from "react";
import { CircleCheck, Users } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { formatDateShort } from "@/shared/utils/dates";
import { UsersRowActions } from "./users-row-actions";
import { UsersSelectionToolbar } from "./users-selection-toolbar";

interface UsersMobileListProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
}

export function UsersMobileList({ usersPromise, perPage }: UsersMobileListProps) {
	const { users, pagination } = use(usersPromise);
	const userIds = users.map((user) => user.id);

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
			<UsersSelectionToolbar userIds={userIds} />

			<ItemGroup aria-label="Clients" className="gap-2">
				{users.map((user) => {
					const displayName = user.name ?? "Utilisateur";
					const orderCount = user._count.orders;

					return (
						<div key={user.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className={user.deletedAt ? "gap-3 opacity-50" : "gap-3"}
								aria-roledescription="carte client"
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<span className="truncate font-semibold">{displayName}</span>
										{user.emailVerified && (
											<CircleCheck
												className="h-4 w-4 shrink-0 text-green-600"
												aria-label="Email verifie"
											/>
										)}
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span className="truncate">{user.email}</span>
									</ItemDescription>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{orderCount} commande{orderCount !== 1 ? "s" : ""}
										</span>
										<span>·</span>
										<span>{formatDateShort(user.createdAt)}</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<UsersRowActions
										user={{
											id: user.id,
											name: displayName,
											email: user.email,
											role: user.role,
											deletedAt: user.deletedAt,
											suspendedAt: user.suspendedAt,
										}}
									/>
								</ItemActions>
							</Item>
						</div>
					);
				})}
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
