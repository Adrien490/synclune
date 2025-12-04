import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetUsersReturn } from "@/modules/users/data/get-users";
import { CheckCircle, Users } from "lucide-react";
import { use, ViewTransition } from "react";
import Link from "next/link";
import { UsersRowActions } from "./users-row-actions";
import { UsersSelectionToolbar } from "./users-selection-toolbar";
import { UsersTableSelectionCell } from "./users-table-selection-cell";

interface UsersDataTableProps {
	usersPromise: Promise<GetUsersReturn>;
}

function formatDate(date: Date | string): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(date));
}

export function UsersDataTable({ usersPromise }: UsersDataTableProps) {
	const { users, pagination } = use(usersPromise);
	const userIds = users.map((user) => user.id);

	if (users.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Users />
					</EmptyMedia>
					<EmptyTitle>Aucun client trouve</EmptyTitle>
					<EmptyDescription>
						Aucun client ne correspond aux criteres de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<UsersSelectionToolbar userIds={userIds} />
				<TableScrollContainer>
					<Table role="table" aria-label="Liste des clients" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<UsersTableSelectionCell type="header" userIds={userIds} />
								</TableHead>
								<TableHead scope="col" role="columnheader" className="w-[25%]">
									Nom
								</TableHead>
								<TableHead scope="col" role="columnheader" className="w-[30%]">
									Email
								</TableHead>
								<TableHead
									scope="col"
									role="columnheader"
									className="hidden xl:table-cell w-[10%]"
								>
									Commandes
								</TableHead>
								<TableHead
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell w-[18%]"
								>
									Inscription
								</TableHead>
								<TableHead
									scope="col"
									role="columnheader"
									className="w-[12%] text-right"
									aria-label="Actions disponibles pour chaque utilisateur"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => {
								const orderCount = user._count?.orders ?? 0;
								const displayName = user.name || "Utilisateur";

								return (
									<TableRow
										key={user.id}
										className={user.deletedAt ? "opacity-50" : undefined}
									>
										<TableCell role="gridcell">
											<UsersTableSelectionCell type="row" userId={user.id} />
										</TableCell>
										<TableCell role="gridcell">
											<ViewTransition name={`admin-user-name-${user.id}`} default="vt-title">
												<div className="overflow-hidden">
													<span
														className="font-bold truncate block"
														title={displayName}
													>
														{displayName}
													</span>
												</div>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell">
											<ViewTransition name={`admin-user-email-${user.id}`} default="vt-table-link">
												<div className="flex items-center gap-2">
													<span className="text-sm truncate">{user.email}</span>
													{user.emailVerified && (
														<CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
													)}
												</div>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell" className="hidden xl:table-cell">
											{orderCount > 0 ? (
												<Link
													href={`/admin/ventes/commandes?userId=${user.id}`}
													className="text-foreground hover:underline font-medium"
												>
													{orderCount}
												</Link>
											) : (
												<span className="text-muted-foreground">0</span>
											)}
										</TableCell>
										<TableCell role="gridcell" className="hidden sm:table-cell">
											<span className="text-sm text-muted-foreground">
												{formatDate(user.createdAt)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
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
						perPage={users.length}
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
