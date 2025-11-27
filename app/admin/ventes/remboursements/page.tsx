import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SortSelect } from "@/shared/components/sort-select";
import { getRefunds, SORT_LABELS } from "@/modules/refund/data/get-refunds";
import { connection } from "next/server";
import { Suspense } from "react";
import { RefundsDataTable } from "@/modules/refund/components/admin/refunds-data-table";
import { RefundsDataTableSkeleton } from "@/modules/refund/components/admin/refunds-data-table-skeleton";
import { ApproveRefundAlertDialog } from "@/modules/refund/components/admin/approve-refund-alert-dialog";
import { ProcessRefundAlertDialog } from "@/modules/refund/components/admin/process-refund-alert-dialog";
import { RejectRefundAlertDialog } from "@/modules/refund/components/admin/reject-refund-alert-dialog";
import { CancelRefundAlertDialog } from "@/modules/refund/components/admin/cancel-refund-alert-dialog";
import type { RefundsSearchParams } from "./_types/search-params";
import { parseRefundParams, parseRefundFilters } from "./_utils/params";
import type { Metadata } from "next";

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
				description="Gérez les demandes de remboursement"
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de gestion des remboursements">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher par numéro de commande, email client..."
							ariaLabel="Rechercher un remboursement"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<SortSelect
							label="Trier par"
							options={Object.entries(SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Plus récents"
							className="w-full sm:min-w-[180px]"
						/>
					</div>
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
