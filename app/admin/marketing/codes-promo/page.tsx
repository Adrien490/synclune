import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import {
	getDiscounts,
	DISCOUNTS_SORT_LABELS,
} from "@/modules/discounts/data/get-discounts";
import { getFirstParam } from "@/shared/utils/params";
import { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BulkDeleteDiscountsAlertDialog } from "@/modules/discounts/components/admin/bulk-delete-discounts-alert-dialog";
import { DiscountFormDialog } from "@/modules/discounts/components/admin/discount-form-dialog";
import { DiscountsDataTable } from "@/modules/discounts/components/admin/discounts-data-table";
import { DiscountsDataTableSkeleton } from "@/modules/discounts/components/admin/discounts-data-table-skeleton";
import { DiscountsFilterBadges } from "@/modules/discounts/components/admin/discounts-filter-badges";
import { DiscountsFilterSheet } from "@/modules/discounts/components/admin/discounts-filter-sheet";
import { CreateDiscountButton } from "@/modules/discounts/components/admin/create-discount-button";
import { DeleteDiscountAlertDialog } from "@/modules/discounts/components/admin/delete-discount-alert-dialog";
import { ToggleDiscountStatusAlertDialog } from "@/modules/discounts/components/admin/toggle-discount-status-alert-dialog";
import { DiscountUsagesDialog } from "@/modules/discounts/components/admin/discount-usages-dialog";
import { RefreshDiscountsButton } from "@/modules/discounts/components/admin/refresh-discounts-button";
import { parseFilters } from "./_utils/params";

export type DiscountsSearchParams = {
	cursor?: string | string[];
	direction?: string | string[];
	perPage?: string | string[];
	sortBy?: string | string[];
	search?: string | string[];
	type?: string | string[];
	isActive?: string | string[];
	hasUsages?: string | string[];
};

export const metadata: Metadata = {
	title: "Codes promo - Administration",
	description: "Gérer les codes promo",
};

type DiscountsAdminPageProps = {
	searchParams: Promise<DiscountsSearchParams>;
};

export default async function DiscountsAdminPage({
	searchParams,
}: DiscountsAdminPageProps) {
	await connection();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) || "created-descending") as
		| "created-descending"
		| "created-ascending"
		| "code-ascending"
		| "code-descending"
		| "usage-descending"
		| "usage-ascending";
	const search = getFirstParam(params.search);

	const discountsPromise = getDiscounts({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseFilters(params),
	});

	return (
		<>
			<DiscountFormDialog />
			<DeleteDiscountAlertDialog />
			<BulkDeleteDiscountsAlertDialog />
			<ToggleDiscountStatusAlertDialog />
			<DiscountUsagesDialog />

			<PageHeader
				variant="compact"
				title="Codes promo"
				actions={<CreateDiscountButton />}
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de gestion des codes promo">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher par code..."
							ariaLabel="Rechercher un code promo"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(DISCOUNTS_SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Plus récents"
							className="w-full sm:min-w-[180px]"
						/>
						<DiscountsFilterSheet />
						<RefreshDiscountsButton />
					</div>
				</DataTableToolbar>

				<DiscountsFilterBadges />

				<Suspense fallback={<DiscountsDataTableSkeleton />}>
					<DiscountsDataTable discountsPromise={discountsPromise} />
				</Suspense>
			</div>
		</>
	);
}
