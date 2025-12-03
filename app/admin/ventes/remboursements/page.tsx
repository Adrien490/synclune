import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getRefunds, SORT_LABELS } from "@/modules/refunds/data/get-refunds";
import { connection } from "next/server";
import { Suspense } from "react";
import { RefundsDataTable } from "@/modules/refunds/components/admin/refunds-data-table";
import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { ApproveRefundAlertDialog } from "@/modules/refunds/components/admin/approve-refund-alert-dialog";
import { ProcessRefundAlertDialog } from "@/modules/refunds/components/admin/process-refund-alert-dialog";
import { RejectRefundAlertDialog } from "@/modules/refunds/components/admin/reject-refund-alert-dialog";
import { CancelRefundAlertDialog } from "@/modules/refunds/components/admin/cancel-refund-alert-dialog";
import { RefreshRefundsButton } from "@/modules/refunds/components/admin/refresh-refunds-button";
import { parseRefundParams, parseRefundFilters } from "./_utils/params";
import type { Metadata } from "next";

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

export default async function RefundsAdminPage({
	searchParams,
}: RefundsAdminPageProps) {
	await connection();

	const params = await searchParams;

	const { cursor, direction, perPage, sortBy, search } =
		parseRefundParams(params);

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
			<PageHeader
				variant="compact"
				title="Remboursements"
			/>

			<div className="space-y-6">
				<DataTableToolbar
					ariaLabel="Barre d'outils de gestion des remboursements"
					search={
						<SearchForm
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
						className="w-full sm:min-w-[180px]"
					/>
					<RefreshRefundsButton />
				</DataTableToolbar>

				<Suspense fallback={<RefundsDataTableSkeleton />}>
					<RefundsDataTable refundsPromise={refundsPromise} />
				</Suspense>
			</div>

			{/* Alert Dialogs globaux */}
			<ApproveRefundAlertDialog />
			<ProcessRefundAlertDialog />
			<RejectRefundAlertDialog />
			<CancelRefundAlertDialog />
		</>
	);
}
