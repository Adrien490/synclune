import { FilterTriggerButton } from "@/shared/components/filter-trigger-button";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getRefunds, SORT_LABELS } from "@/modules/refunds/data/get-refunds";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { RefundsDataTable } from "@/modules/refunds/components/admin/refunds-data-table";
import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { RefundsFilterBadges } from "@/modules/refunds/components/admin/refunds-filter-badges";
import { RefundsMobileList } from "@/modules/refunds/components/admin/refunds-mobile-list";
import { RefundsMobileListSkeleton } from "@/modules/refunds/components/admin/refunds-mobile-list-skeleton";
import { RefreshRefundsButton } from "@/modules/refunds/components/admin/refresh-refunds-button";
import { RefundsSortBadge } from "@/modules/refunds/components/admin/refunds-sort-badge";
import { parseRefundParams, parseRefundFilters } from "./_utils/params";

const RefundsBottomBar = dynamic(() =>
	import("@/modules/refunds/components/admin/refunds-bottom-bar").then(
		(mod) => mod.RefundsBottomBar,
	),
);
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import type { Metadata } from "next";

import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export type RefundFiltersSearchParams = {
	filter_status?: string;
	filter_reason?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
};

export type RefundsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & RefundFiltersSearchParams;

export const metadata: Metadata = {
	title: "Remboursements - Administration",
	description: "Gérer les remboursements du site",
};

type RefundsAdminPageProps = {
	searchParams: Promise<RefundsSearchParams>;
};

export default async function RefundsAdminPage({ searchParams }: RefundsAdminPageProps) {
	await assertAdminPage();

	const params = await searchParams;

	const { cursor, direction, perPage, sortBy, search } = parseRefundParams(params);
	const filters = parseRefundFilters(params);

	// La promise de remboursements n'est PAS awaitée pour permettre le streaming
	const refundsPromise = getRefunds({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	return (
		<>
			{/* Consultation pure (Lot 2 S3.3) : les remboursements se créent dans le
			    dashboard Stripe, la synchro webhook alimente cette liste. */}
			<PageHeader variant="compact" title="Remboursements" className="hidden md:block" />

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={refundsPromise.then((d) => d.totalCount)}
						query={search}
						singular="remboursement"
						plural="remboursements"
					/>
				</Suspense>

				<RefundsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des remboursements"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par numéro de commande, email client…"
								aria-label="Rechercher un remboursement"
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
						<FilterTriggerButton />
						<RefreshRefundsButton />
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<RefundsFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<RefundsSortBadge />

				{/* Liste mobile */}
				<Suspense
					fallback={
						<RefundsMobileListSkeleton
							hasActiveFilters={
								!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
							}
						/>
					}
				>
					<RefundsMobileList
						refundsPromise={refundsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<RefundsDataTableSkeleton />}>
					<RefundsDataTable
						refundsPromise={refundsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>
			</div>
		</>
	);
}
