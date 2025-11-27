import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { TabNavigation } from "@/shared/components/tab-navigation";
import { Button } from "@/shared/components/ui/button";
import { getUsers } from "@/modules/users/data/get-users";
import { getFirstParam } from "@/shared/utils/params";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { UsersDataTable } from "@/modules/users/components/admin/users-data-table";
import { UsersDataTableSkeleton } from "@/modules/users/components/admin/users-data-table-skeleton";
import { UsersFilterBadges } from "@/modules/users/components/admin/users-filter-badges";
import { UsersFilterSheet } from "@/modules/users/components/admin/users-filter-sheet";
import { usersMenuItems } from "./_constants/menu-items";
import {
	DEFAULT_SORT_BY,
	parseSortBy,
	SORT_LABELS,
	SORT_OPTIONS,
} from "./_constants/sort-options";
import { parseFilters } from "./_utils/params";
import { Metadata } from "next";
import type { Role } from "@/app/generated/prisma/client";

export type CustomerFiltersSearchParams = {
	filter_role?: string;
	filter_emailVerified?: string;
	filter_hasOrders?: string;
	filter_includeDeleted?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
	filter_sortBy?: string;
	[key: string]: string | string[] | undefined;
};

export type CustomersSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & CustomerFiltersSearchParams;

export type ParsedCustomerFilters = {
	role?: Role;
	emailVerified?: boolean;
	hasOrders?: boolean;
	includeDeleted?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	[key: string]: unknown;
};

export const metadata: Metadata = {
	title: "Utilisateurs | Dashboard",
	description: "Gérez les utilisateurs",
};

interface UsersPageProps {
	searchParams: Promise<CustomersSearchParams>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const sortByParam = getFirstParam(params.sortBy) || DEFAULT_SORT_BY;
	const search = getFirstParam(params.search);

	// Convertir le format de tri du dashboard vers l'API get-users
	const { sortBy, sortOrder } = parseSortBy(sortByParam);

	const usersPromise = getUsers({
		cursor,
		direction,
		sortBy,
		sortOrder,
		search,
		perPage: 50, // Taille de page par défaut
		filters: parseFilters(params),
	});

	// Convertir SORT_OPTIONS et SORT_LABELS en format attendu par SortSelect
	const sortOptions = Object.values(SORT_OPTIONS).map((value) => ({
		value,
		label: SORT_LABELS[value],
	}));

	return (
		<>
			<PageHeader
				variant="compact"
				title="Utilisateurs"
				description="Gérez les utilisateurs et leur historique de commandes"
				actions={
					<Button asChild>
						<Link href="/admin/utilisateurs/new">Nouvel utilisateur</Link>
					</Button>
				}
			/>
			<TabNavigation
				items={usersMenuItems}
				activeValue="users"
				ariaLabel="Navigation des utilisateurs"
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de gestion des utilisateurs">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher un utilisateur..."
							ariaLabel="Rechercher un utilisateur par nom, email ou téléphone"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={sortOptions}
							placeholder="Plus récents"
							className="w-full sm:min-w-[180px]"
						/>
						<UsersFilterSheet />
					</div>
				</DataTableToolbar>

				<UsersFilterBadges />

				<Suspense fallback={<UsersDataTableSkeleton />}>
					<UsersDataTable usersPromise={usersPromise} />
				</Suspense>
			</div>
		</>
	);
}
