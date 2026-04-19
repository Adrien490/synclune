import { use } from "react";
import { type RefundStatus, type RefundReason } from "@/app/generated/prisma/client";
import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { StopEventPropagation } from "@/shared/components/stop-event-propagation";
import { StopPropagationLink } from "@/shared/components/stop-propagation-link";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import type { GetRefundsReturn } from "@/modules/refunds/types/refund.types";
import {
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import { RefundRowActions } from "./refund-row-actions";

interface RefundsMobileListProps {
	refundsPromise: Promise<GetRefundsReturn>;
	perPage: number;
}

export function RefundsMobileList({ refundsPromise, perPage }: RefundsMobileListProps) {
	const { refunds, pagination } = use(refundsPromise);

	if (refunds.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={ReceiptText}
					title="Aucun remboursement trouve"
					description="Aucun remboursement ne correspond aux criteres de recherche."
					actionElement={
						<Button variant="outline" asChild>
							<Link href="/admin/ventes/remboursements">Reinitialiser les filtres</Link>
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ItemGroup aria-label="Remboursements" className="gap-2">
				{refunds.map((refund) => (
					<div key={refund.id} role="listitem">
						<Item
							variant="outline"
							size="sm"
							className="gap-3"
							aria-roledescription="carte remboursement"
							aria-label={`Remboursement ${refund.order.orderNumber}`}
						>
							<ItemContent className="min-w-0">
								<ItemTitle>
									<StopPropagationLink
										href={`/admin/ventes/commandes/${refund.order.id}`}
										className="truncate font-semibold hover:underline"
									>
										{refund.order.orderNumber}
									</StopPropagationLink>
									<Badge variant={REFUND_STATUS_VARIANTS[refund.status as RefundStatus]}>
										{REFUND_STATUS_LABELS[refund.status as RefundStatus]}
									</Badge>
								</ItemTitle>
								<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span>{refund.order.customerName || refund.order.customerEmail}</span>
									<span aria-hidden="true">·</span>
									<span>{REFUND_REASON_LABELS[refund.reason as RefundReason]}</span>
									<span aria-hidden="true">·</span>
									<span className="font-medium">{formatEuro(refund.amount)}</span>
									<span aria-hidden="true">·</span>
									<span>{formatDateShort(refund.createdAt)}</span>
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<StopEventPropagation>
									<RefundRowActions
										refund={{
											id: refund.id,
											status: refund.status as RefundStatus,
											amount: refund.amount,
											orderId: refund.order.id,
											orderNumber: refund.order.orderNumber,
										}}
									/>
								</StopEventPropagation>
							</ItemActions>
						</Item>
					</div>
				))}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={refunds.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
