import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import {
	getDiscounts,
	SORT_LABELS,
	GET_DISCOUNTS_DEFAULT_PER_PAGE,
} from "@/modules/discounts/data/get-discounts";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import { DiscountsDataTable } from "@/modules/discounts/components/admin/discounts-data-table";
import { DiscountsDataTableSkeleton } from "@/modules/discounts/components/admin/discounts-data-table-skeleton";
import { DiscountsFilterBadges } from "@/modules/discounts/components/admin/discounts-filter-badges";
import { DiscountsFilterSheet } from "@/modules/discounts/components/admin/discounts-filter-sheet";
import { DiscountsMobileList } from "@/modules/discounts/components/admin/discounts-mobile-list";
import { DiscountsMobileListSkeleton } from "@/modules/discounts/components/admin/discounts-mobile-list-skeleton";
import { DiscountsSortBadge } from "@/modules/discounts/components/admin/discounts-sort-badge";
import { CreateDiscountButton } from "@/modules/discounts/components/admin/create-discount-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import dynamic from "next/dynamic";
import type { DiscountType } from "@/app/generated/prisma/client";
import { type Metadata } from "next";

import { DiscountsAdminDialogs } from "./_components/discounts-admin-dialogs";

const DiscountsBottomBar = dynamic(() =>
	import("@/modules/discounts/components/admin/discounts-bottom-bar").then(
		(mod) => mod.DiscountsBottomBar,
	),
);

export const metadata: Metadata = {
	title: "Codes promo - Administration",
	description: "Gérer les codes promo",
};

type DiscountsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DiscountsAdminPage({ searchParams }: DiscountsAdminPageProps) {
	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || GET_DISCOUNTS_DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) ?? "created-descending") as
		| "created-descending"
		| "created-ascending"
		| "code-ascending"
		| "code-descending"
		| "usage-descending"
		| "usage-ascending";
	const search = getFirstParam(params.search);

	// Parse filters from search params
	const filterType = getFirstParam(params.filter_type) as DiscountType | undefined;
	const filterIsActive = getFirstParam(params.filter_isActive);
	const filterHasUsages = getFirstParam(params.filter_hasUsages);

	const filters: {
		type?: DiscountType;
		isActive?: boolean;
		hasUsages?: boolean;
	} = {};
	if (filterType) filters.type = filterType;
	if (filterIsActive === "true") filters.isActive = true;
	else if (filterIsActive === "false") filters.isActive = false;
	if (filterHasUsages === "true") filters.hasUsages = true;
	else if (filterHasUsages === "false") filters.hasUsages = false;

	// La promise de discounts n'est PAS awaitee pour permettre le streaming
	const discountsPromise = getDiscounts({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Codes promo"
				actions={<CreateDiscountButton />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<DiscountsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des codes promo"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par code…"
								ariaLabel="Rechercher un code promo"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Plus récents"
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<DiscountsFilterSheet />
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<DiscountsFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<DiscountsSortBadge />

				{/* Liste mobile */}
				<Suspense fallback={<DiscountsMobileListSkeleton />}>
					<DiscountsMobileList
						discountsPromise={discountsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
						filterParams={{ search, sortBy, filters }}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<DiscountsDataTableSkeleton />}>
					<DiscountsDataTable discountsPromise={discountsPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* Dialogs des actions long-press / row-actions (delete, toggle) */}
			<DiscountsAdminDialogs />
		</>
	);
}
