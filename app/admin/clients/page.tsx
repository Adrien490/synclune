import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getUsers } from "@/modules/users/data/get-users";
import {
	USERS_SORT_OPTIONS,
	USERS_SORT_LABELS,
	GET_USERS_DEFAULT_PER_PAGE,
} from "@/modules/users/constants/user.constants";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import { UsersDataTable } from "@/modules/users/components/admin/users-data-table";
import { UsersDataTableSkeleton } from "@/modules/users/components/admin/users-data-table-skeleton";
import { UsersMobileList } from "@/modules/users/components/admin/users-mobile-list";
import { UsersMobileListSkeleton } from "@/modules/users/components/admin/users-mobile-list-skeleton";
import { UsersFilterBadges } from "@/modules/users/components/admin/users-filter-badges";
import { UsersFilterSheet } from "@/modules/users/components/admin/users-filter-sheet";
import { UsersBottomBar } from "@/modules/users/components/admin/users-bottom-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { type Metadata } from "next";
import { AccountStatus, type Role } from "@/app/generated/prisma/client";

export const metadata: Metadata = {
	title: "Clients - Administration",
	description: "Gerer les clients du site",
};

type UsersSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_role?: string;
	filter_emailVerified?: string;
	filter_hasOrders?: string;
	filter_accountStatus?: string;
	filter_includeDeleted?: string;
};

type UsersAdminPageProps = {
	searchParams: Promise<UsersSearchParams>;
};

/**
 * Parse the combined sort option (e.g. "createdAt-descending") into
 * separate sortBy field and sortOrder values for getUsers.
 */
type UserSortField = "createdAt" | "updatedAt" | "name" | "email" | "role";

function parseSortOption(sortParam: string | undefined): {
	sortBy: UserSortField;
	sortOrder: "asc" | "desc";
} {
	const allOptions = Object.values(USERS_SORT_OPTIONS) as string[];
	const value =
		sortParam && allOptions.includes(sortParam) ? sortParam : USERS_SORT_OPTIONS.CREATED_DESC;

	const lastDash = value.lastIndexOf("-");
	const field = value.substring(0, lastDash) as UserSortField;
	const direction =
		value.substring(lastDash + 1) === "ascending" ? ("asc" as const) : ("desc" as const);

	return { sortBy: field, sortOrder: direction };
}

function parseFilters(params: UsersSearchParams) {
	const filters: {
		role?: Role[];
		emailVerified?: boolean;
		hasOrders?: boolean;
		accountStatus?: AccountStatus;
		includeDeleted?: boolean;
	} = {};

	if (params.filter_role) {
		filters.role = params.filter_role.split(",") as Role[];
	}
	if (params.filter_emailVerified === "true") filters.emailVerified = true;
	else if (params.filter_emailVerified === "false") filters.emailVerified = false;
	if (params.filter_hasOrders === "true") filters.hasOrders = true;
	else if (params.filter_hasOrders === "false") filters.hasOrders = false;
	if (
		params.filter_accountStatus &&
		(Object.values(AccountStatus) as string[]).includes(params.filter_accountStatus)
	) {
		filters.accountStatus = params.filter_accountStatus as AccountStatus;
	}
	if (params.filter_includeDeleted === "true") filters.includeDeleted = true;

	return filters;
}

export default async function UsersAdminPage({ searchParams }: UsersAdminPageProps) {
	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || GET_USERS_DEFAULT_PER_PAGE;
	const search = getFirstParam(params.search);
	const { sortBy, sortOrder } = parseSortOption(getFirstParam(params.sortBy));

	// La promise d'utilisateurs n'est PAS awaitee pour permettre le streaming
	const usersPromise = getUsers({
		cursor,
		direction,
		perPage,
		sortBy,
		sortOrder,
		search,
		filters: parseFilters(params),
	});

	return (
		<>
			<PageHeader variant="compact" title="Clients" className="hidden md:block" />

			<div className="space-y-6">
				<UsersBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des clients"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, email…"
								ariaLabel="Rechercher un client par nom ou email"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(USERS_SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Plus recents"
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<ButtonGroup aria-label="Filtres et actions">
							<UsersFilterSheet />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<UsersFilterBadges />
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={<UsersMobileListSkeleton />}>
					<UsersMobileList
						usersPromise={usersPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<UsersDataTableSkeleton />}>
					<UsersDataTable
						usersPromise={usersPromise}
						perPage={perPage}
						resetHref="/admin/clients"
					/>
				</Suspense>
			</div>
		</>
	);
}
