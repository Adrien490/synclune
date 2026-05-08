import { RefundStatus, type RefundReason } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	REFUND_STATUS_VARIANTS,
	REFUND_STATUS_LABELS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import type { GetRefundsReturn } from "@/modules/refunds/types/refund.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import { Button } from "@/shared/components/ui/button";
import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { RefundRowActions } from "./refund-row-actions";
import { RefundsBulkActionsBar } from "./refunds-bulk-actions-bar";

interface RefundsDataTableProps {
	refundsPromise: Promise<GetRefundsReturn>;
	perPage: number;
}

export async function RefundsDataTable({ refundsPromise, perPage }: RefundsDataTableProps) {
	const { refunds, pagination } = await refundsPromise;

	if (refunds.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={ReceiptText}
				title="Aucun remboursement trouvé"
				description="Aucun remboursement ne correspond aux critères de recherche."
				actionElement={
					<Button variant="outline" asChild>
						<Link href="/admin/ventes/remboursements">Réinitialiser les filtres</Link>
					</Button>
				}
			/>
		);
	}

	// Seuls les refunds PENDING sont éligibles au bulk-approve
	const pageItemIds = refunds.filter((r) => r.status === RefundStatus.PENDING).map((r) => r.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<RefundsBulkActionsBar />
					<TableScrollContainer>
						<Table
							aria-label="Liste des remboursements"
							caption="Liste des remboursements"
							striped
							className="min-w-full table-fixed"
						>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[4%]">
										<BulkSelectionHeaderCheckbox itemsLabel="remboursements en attente" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead className="w-[12%]">Commande</TableHead>
									<TableHead className="w-[10%]">Date</TableHead>
									<TableHead className="w-[20%]">Client</TableHead>
									<TableHead className="w-[14%]">Raison</TableHead>
									<TableHead className="w-[12%]">Statut</TableHead>
									<TableHead className="w-[10%] text-right">Montant</TableHead>
									<TableHead
										className="w-[8%] text-right"
										aria-label="Actions disponibles pour chaque remboursement"
									>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{refunds.map((refund) => {
									const isPending = refund.status === RefundStatus.PENDING;

									return (
										<TableRow key={refund.id}>
											<TableCell>
												{isPending ? (
													<BulkSelectionRowCheckbox
														id={refund.id}
														itemLabel={`Remboursement commande ${refund.order.orderNumber}`}
													/>
												) : (
													<span
														className="text-muted-foreground inline-flex size-4 items-center justify-center text-xs"
														aria-label="Remboursement non en attente"
														title="Statut non éligible au bulk-approve"
													>
														—
													</span>
												)}
											</TableCell>
											<TableCell>
												<Link
													href={`/admin/ventes/commandes/${refund.order.id}`}
													className="text-foreground text-sm font-medium tabular-nums underline"
												>
													{refund.order.orderNumber}
												</Link>
											</TableCell>
											<TableCell>
												<span className="text-sm whitespace-nowrap">
													{formatDateShort(refund.createdAt)}
												</span>
											</TableCell>
											<TableCell>
												<div className="overflow-hidden">
													<span className="block truncate text-sm font-medium">
														{refund.order.customerName || refund.order.customerEmail}
													</span>
													{refund.order.customerName && (
														<span className="text-muted-foreground block truncate text-sm">
															{refund.order.customerEmail}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell>
												<span className="text-sm">
													{REFUND_REASON_LABELS[refund.reason as RefundReason]}
												</span>
											</TableCell>
											<TableCell>
												<Badge variant={REFUND_STATUS_VARIANTS[refund.status as RefundStatus]}>
													{REFUND_STATUS_LABELS[refund.status as RefundStatus]}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												<span className="text-sm font-bold">{formatEuro(refund.amount)}</span>
											</TableCell>
											<TableCell className="text-right">
												<RefundRowActions
													refund={{
														id: refund.id,
														status: refund.status as RefundStatus,
														amount: refund.amount,
														orderId: refund.order.id,
														orderNumber: refund.order.orderNumber,
													}}
												/>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableScrollContainer>

					<div className="mt-4">
						<CursorPagination
							perPage={perPage}
							hasNextPage={pagination.hasNextPage}
							hasPreviousPage={pagination.hasPreviousPage}
							currentPageSize={refunds.length}
							nextCursor={pagination.nextCursor}
							prevCursor={pagination.prevCursor}
						/>
					</div>
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
