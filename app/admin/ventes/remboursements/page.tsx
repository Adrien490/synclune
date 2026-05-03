import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getRefunds, SORT_LABELS } from "@/modules/refunds/data/get-refunds";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { RefundsDataTable } from "@/modules/refunds/components/admin/refunds-data-table";
import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { RefundsMobileList } from "@/modules/refunds/components/admin/refunds-mobile-list";
import { RefundsMobileListSkeleton } from "@/modules/refunds/components/admin/refunds-mobile-list-skeleton";
import { RefreshRefundsButton } from "@/modules/refunds/components/admin/refresh-refunds-button";
import { RefundsFilterSheet } from "@/modules/refunds/components/admin/refunds-filter-sheet";
import { parseRefundParams, parseRefundFilters } from "./_utils/params";

const RefundsBottomBar = dynamic(() =>
	import("@/modules/refunds/components/admin/refunds-bottom-bar").then(
		(mod) => mod.RefundsBottomBar,
	),
);
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import type { Metadata } from "next";

// Lazy loading - drawer charge uniquement a l'ouverture (dialogs imbriques inclus)
const RefundItemDrawer = dynamic(() =>
	import("@/modules/refunds/components/admin/refund-item-drawer").then(
		(mod) => mod.RefundItemDrawer,
	),
);

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
	const params = await searchParams;

	const { cursor, direction, perPage, sortBy, search } = parseRefundParams(params);

	// La promise de remboursements n'est PAS awaitée pour permettre le streaming
	const refundsPromise = getRefunds({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseRefundFilters(params),
	});

	return (
		<>
			<PageHeader variant="compact" title="Remboursements" className="hidden md:block" />

			<div className="space-y-6">
				<RefundsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des remboursements"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par numéro de commande, email client..."
								ariaLabel="Rechercher un remboursement"
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
						<RefundsFilterSheet />
						<RefreshRefundsButton />
					</Toolbar>
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={<RefundsMobileListSkeleton />}>
					<RefundsMobileList refundsPromise={refundsPromise} perPage={perPage} />
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<RefundsDataTableSkeleton />}>
					<RefundsDataTable refundsPromise={refundsPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* ItemDrawer mobile + dialogs imbriques (approve/process/reject/cancel) */}
			<RefundItemDrawer />
		</>
	);
}
