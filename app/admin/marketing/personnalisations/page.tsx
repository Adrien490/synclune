import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getCustomizationRequests } from "@/modules/customizations/data/get-customization-requests";
import { CustomizationsDataTable } from "@/modules/customizations/components/admin/customizations-data-table";
import { CustomizationsBottomBar } from "@/modules/customizations/components/admin/customizations-bottom-bar";
import {
	SORT_OPTIONS,
	SORT_LABELS,
	STATUS_FILTER_OPTIONS,
} from "@/modules/customizations/constants/sort.constants";
import { getFirstParam } from "@/shared/utils/params";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { CustomizationsDataTableSkeleton } from "@/modules/customizations/components/admin/customizations-data-table-skeleton";
import { CustomizationsMobileList } from "@/modules/customizations/components/admin/customizations-mobile-list";
import { CustomizationsMobileListSkeleton } from "@/modules/customizations/components/admin/customizations-mobile-list-skeleton";

export const metadata: Metadata = {
	title: "Personnalisations | Administration",
	description: "Gérer les demandes de personnalisation",
};

interface CustomizationsPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomizationsPage({ searchParams }: CustomizationsPageProps) {
	await connection();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy =
		sortByParam &&
		Object.values(SORT_OPTIONS).includes(
			sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS],
		)
			? (sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS])
			: SORT_OPTIONS.CREATED_DESC;
	const search = getFirstParam(params.search);
	const statusParam = getFirstParam(params.filter_status);
	const status =
		statusParam &&
		statusParam !== "ALL" &&
		Object.values(CustomizationRequestStatus).includes(statusParam as CustomizationRequestStatus)
			? (statusParam as CustomizationRequestStatus)
			: undefined;

	const perPage = parseInt(getFirstParam(params.perPage) ?? "20", 10);

	const requestsPromise = getCustomizationRequests({
		cursor,
		direction,
		perPage,
		sortBy,
		filters: { status, search },
	});

	const sortOptions = Object.entries(SORT_LABELS).map(([value, label]) => ({
		value,
		label,
	}));

	return (
		<>
			<PageHeader variant="compact" title="Personnalisations" className="hidden md:block" />

			<div className="space-y-6">
				{/* Toolbar desktop */}
				<Suspense fallback={<ToolbarSkeleton selectCount={2} className="hidden md:flex" />}>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des personnalisations"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, email..."
								ariaLabel="Rechercher une demande"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="status"
							label="Statut"
							options={STATUS_FILTER_OPTIONS.map((opt) => ({
								value: opt.value,
								label: opt.label,
							}))}
							placeholder="Tous les statuts"
							className="w-full sm:min-w-40"
						/>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={sortOptions}
							placeholder="Plus récentes"
							className="w-full sm:min-w-40"
							noPrefix
						/>
					</Toolbar>
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={<CustomizationsMobileListSkeleton />}>
					<CustomizationsMobileList requestsPromise={requestsPromise} perPage={perPage} />
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<CustomizationsDataTableSkeleton />}>
					<CustomizationsDataTable requestsPromise={requestsPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* Bottom bar mobile (tri, recherche, filtres) */}
			<CustomizationsBottomBar />
		</>
	);
}
