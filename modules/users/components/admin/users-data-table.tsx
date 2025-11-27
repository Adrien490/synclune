import { CursorPagination } from "@/shared/components/cursor-pagination";
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
import Link from "next/link";
import { UsersRowActions } from "./users-row-actions";

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

export async function UsersDataTable({
	usersPromise,
}: UsersDataTableProps) {
	const { users, pagination } = await usersPromise;

	if (users.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Users />
					</EmptyMedia>
					<EmptyTitle>Aucun client trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun client ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des clients" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" role="columnheader" className="w-[25%]">
									Nom
								</TableHead>
								<TableHead scope="col" role="columnheader" className="w-[30%]">
									Email
								</TableHead>
								<TableHead
									scope="col"
									role="columnheader"
									className="hidden xl:table-cell w-[15%]"
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
								<TableHead scope="col" role="columnheader" className="w-[12%] text-right">
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
											<div className="overflow-hidden">
												<span
													className="font-bold truncate block"
													title={displayName}
												>
													{displayName}
												</span>
											</div>
										</TableCell>
										<TableCell role="gridcell">
											<div className="flex items-center gap-2">
												<span className="text-sm truncate">{user.email}</span>
												{user.emailVerified && (
													<CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
												)}
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden xl:table-cell">
											{orderCount > 0 ? (
												<Link
													href={`/dashboard/orders?filter_userId=${user.id}`}
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
													deletedAt: user.deletedAt,
												}}
											/>
										</TableCell>
									</TableRow>
								);
								})}
						</TableBody>
					</Table>
				</div>

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
