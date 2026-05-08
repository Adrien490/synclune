import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetUsersReturn } from "@/modules/users/types/user.types";
import { CircleCheck, Users } from "lucide-react";
import { use } from "react";
import Link from "next/link";
import { formatDateShort } from "@/shared/utils/dates";
import { UsersBulkActionsBar } from "./users-bulk-actions-bar";
import { UsersRowActions } from "./users-row-actions";

interface UsersDataTableProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
	/** Base path for the "reset filters" link in empty state */
	resetHref?: string;
}

export function UsersDataTable({ usersPromise, perPage, resetHref }: UsersDataTableProps) {
	const { users, pagination } = use(usersPromise);

	if (users.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Users}
				title="Aucun client trouvé"
				description="Aucun client ne correspond aux criteres de recherche."
				action={resetHref ? { label: "Réinitialiser les filtres", href: resetHref } : undefined}
			/>
		);
	}

	// Exclure utilisateurs supprimés ou suspendus du bulk
	const pageItemIds = users.filter((u) => !u.deletedAt && !u.suspendedAt).map((u) => u.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<UsersBulkActionsBar />
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
										<BulkSelectionHeaderCheckbox itemsLabel="utilisateurs actifs" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead className="w-[20%]">Nom</TableHead>
									<TableHead className="w-[26%]">Email</TableHead>
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
									const isSelectable = !user.deletedAt && !user.suspendedAt;

									return (
										<TableRow key={user.id} className={user.deletedAt ? "opacity-50" : undefined}>
											<TableCell>
												{isSelectable ? (
													<BulkSelectionRowCheckbox
														id={user.id}
														itemLabel={`Utilisateur ${displayName}`}
													/>
												) : (
													<span
														className="text-muted-foreground inline-flex size-4 items-center justify-center text-xs"
														aria-label="Utilisateur non sélectionnable"
														title={user.deletedAt ? "Utilisateur supprimé" : "Utilisateur suspendu"}
													>
														—
													</span>
												)}
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
														<CircleCheck
															className="size-4 shrink-0 text-green-600"
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
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
