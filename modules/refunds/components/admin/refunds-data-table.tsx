import { RefundStatus, RefundReason } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	REFUND_STATUS_COLORS,
	REFUND_STATUS_LABELS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import type { GetRefundsReturn } from "@/modules/refunds/types/refund.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { RefundRowActions } from "./refund-row-actions";
import { RefundsSelectionToolbar } from "./refunds-selection-toolbar";
import { RefundsTableSelectionCell } from "./refunds-table-selection-cell";

export interface RefundsDataTableProps {
	refundsPromise: Promise<GetRefundsReturn>;
}

export async function RefundsDataTable({
	refundsPromise,
}: RefundsDataTableProps) {
	const { refunds, pagination } = await refundsPromise;
	const refundIds = refunds.map((refund) => refund.id);

	if (refunds.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ReceiptText />
					</EmptyMedia>
					<EmptyTitle>Aucun remboursement trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun remboursement ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<RefundsSelectionToolbar />
				<TableScrollContainer>
					<Table role="table" aria-label="Liste des remboursements" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<RefundsTableSelectionCell type="header" refundIds={refundIds} />
								</TableHead>
								<TableHead
									key="orderNumber"
									scope="col"
									role="columnheader"
									className="w-[15%]"
								>
									Commande
								</TableHead>
								<TableHead
									key="date"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell w-[12%]"
								>
									Date
								</TableHead>
								<TableHead
									key="client"
									scope="col"
									role="columnheader"
									className="w-[20%]"
								>
									Client
								</TableHead>
								<TableHead
									key="reason"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-[15%]"
								>
									Raison
								</TableHead>
								<TableHead
									key="status"
									scope="col"
									role="columnheader"
									className="w-[12%]"
								>
									Statut
								</TableHead>
								<TableHead
									key="amount"
									scope="col"
									role="columnheader"
									className="w-[10%] text-right"
								>
									Montant
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[10%] text-right"
									aria-label="Actions disponibles pour chaque remboursement"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{refunds.map((refund) => (
								<TableRow key={refund.id}>
									<TableCell role="gridcell">
										<RefundsTableSelectionCell type="row" refundId={refund.id} />
									</TableCell>
									<TableCell role="gridcell">
										<ViewTransition name={`admin-order-${refund.order.id}`} default="vt-table-link">
											<Link
												href={`/admin/ventes/commandes/${refund.order.id}`}
												className="font-mono text-sm font-medium text-foreground underline"
											>
												{refund.order.orderNumber}
											</Link>
										</ViewTransition>
									</TableCell>
									<TableCell role="gridcell" className="hidden sm:table-cell">
										<span className="text-sm whitespace-nowrap">
											{formatDateShort(refund.createdAt)}
										</span>
									</TableCell>
									<TableCell role="gridcell">
										<div className="overflow-hidden">
											<span className="text-sm font-medium truncate block">
												{refund.order.customerName || refund.order.customerEmail}
											</span>
											{refund.order.customerName && (
												<span className="text-xs text-muted-foreground truncate block">
													{refund.order.customerEmail}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell role="gridcell" className="hidden md:table-cell">
										<span className="text-sm">
											{REFUND_REASON_LABELS[refund.reason as RefundReason]}
										</span>
									</TableCell>
									<TableCell role="gridcell">
										<Badge
											variant="outline"
											style={{
												backgroundColor: `${
													REFUND_STATUS_COLORS[refund.status as RefundStatus]
												}20`,
												color:
													REFUND_STATUS_COLORS[refund.status as RefundStatus],
												borderColor: `${
													REFUND_STATUS_COLORS[refund.status as RefundStatus]
												}40`,
											}}
										>
											{REFUND_STATUS_LABELS[refund.status as RefundStatus]}
										</Badge>
									</TableCell>
									<TableCell role="gridcell" className="text-right">
										<span className="text-sm font-bold">
											{formatEuro(refund.amount)}
										</span>
									</TableCell>
									<TableCell role="gridcell" className="text-right">
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
								))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={refunds.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={refunds.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
