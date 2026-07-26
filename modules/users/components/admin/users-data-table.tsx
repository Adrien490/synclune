import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import {
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
import { UsersRowActions } from "./users-row-actions";

interface UsersDataTableProps {
	usersPromise: Promise<GetUsersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function UsersDataTable({ usersPromise, perPage, hasActiveFilters }: UsersDataTableProps) {
	const { users, pagination, totalCount } = use(usersPromise);

	if (users.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Users}
				title="Aucun client trouvé"
				description="Aucun client ne correspond aux critères de recherche."
				noItemsDescription="Aucun client inscrit pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/clients"
			/>
		);
	}

	// Exclure utilisateurs supprimés ou suspendus du bulk

	return (
		<AdminDataTable
			caption="Liste des clients"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: users.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
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

					return (
						<TableRow key={user.id} className={user.deletedAt ? "opacity-50" : undefined}>
							<TableCell>
								<div className="overflow-hidden">
									<span
										className="block truncate font-bold"
										title={displayName}
										style={{ viewTransitionName: `user-name-${user.id}` }}
									>
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
		</AdminDataTable>
	);
}
