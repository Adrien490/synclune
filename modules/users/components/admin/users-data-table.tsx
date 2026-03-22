import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { CheckCircle, Users } from "lucide-react";
import { use } from "react";
import Link from "next/link";
import { formatDateShort } from "@/shared/utils/dates";
import { UsersRowActions } from "./users-row-actions";
import { UsersSelectionToolbar } from "./users-selection-toolbar";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

interface UsersDataTableProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
	/** Base path for the "reset filters" link in empty state */
	resetHref?: string;
}

export function UsersDataTable({ usersPromise, perPage, resetHref }: UsersDataTableProps) {
	const { users, pagination } = use(usersPromise);
	const userIds = users.map((user) => user.id);

	if (users.length === 0) {
		return (
			<TableEmptyState
				icon={Users}
				title="Aucun client trouvé"
				description="Aucun client ne correspond aux criteres de recherche."
				action={resetHref ? { label: "Réinitialiser les filtres", href: resetHref } : undefined}
			/>
		);
	}

	return (
		<Card className="hidden md:block">
			<CardContent>
				<UsersSelectionToolbar userIds={userIds} />
				<TableScrollContainer>
					<Table
						aria-label="Liste des clients"
						caption="Liste des utilisateurs"
						striped
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[4%]">
									<TableSelectionCell type="header" itemIds={userIds} />
								</TableHead>
								<TableHead className="w-[22%]">Nom</TableHead>
								<TableHead className="w-[28%]">Email</TableHead>
								<TableHead className="w-[10%]">Commandes</TableHead>
								<TableHead className="w-[16%]">Inscription</TableHead>
								<TableHead
									className="w-[8%] text-right"
									aria-label="Actions disponibles pour chaque utilisateur"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => {
								const orderCount = user._count.orders;
								const displayName = user.name ?? "Utilisateur";

								return (
									<TableRow key={user.id} className={user.deletedAt ? "opacity-50" : undefined}>
										<TableCell>
											<TableSelectionCell type="row" itemId={user.id} />
										</TableCell>
										<TableCell>
											<div className="overflow-hidden">
												<span className="block truncate font-bold" title={displayName}>
													{displayName}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="truncate text-sm">{user.email}</span>
												{user.emailVerified && (
													<CheckCircle
														className="h-4 w-4 shrink-0 text-green-600"
														aria-label="Email vérifié"
													/>
												)}
											</div>
										</TableCell>
										<TableCell>
											{orderCount > 0 ? (
												<Link
													href={`/admin/ventes/commandes?userId=${user.id}`}
													className="text-foreground font-medium hover:underline"
													aria-label={`${orderCount} commande${orderCount > 1 ? "s" : ""} - Voir les commandes`}
												>
													{orderCount}
												</Link>
											) : (
												<span className="text-muted-foreground">0</span>
											)}
										</TableCell>
										<TableCell>
											<span className="text-muted-foreground text-sm">
												{formatDateShort(user.createdAt)}
											</span>
										</TableCell>
										<TableCell className="text-right">
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
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={users.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
