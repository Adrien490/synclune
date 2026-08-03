import { RefundStatus, type RefundReason } from "@/app/generated/prisma/client";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { perPageOptionsUpTo } from "@/shared/lib/pagination";
import { GET_REFUNDS_MAX_RESULTS_PER_PAGE } from "@/modules/refunds/constants/refund.constants";
import { Badge } from "@/shared/components/ui/badge";
import {
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
import {
	AlertCircle,
	BadgeCheck,
	CheckCircle,
	CircleOff,
	Clock,
	ReceiptText,
	XCircle,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const REFUND_STATUS_ICONS: Record<RefundStatus, LucideIcon> = {
	[RefundStatus.PENDING]: Clock,
	[RefundStatus.APPROVED]: CheckCircle,
	[RefundStatus.COMPLETED]: BadgeCheck,
	[RefundStatus.REJECTED]: XCircle,
	[RefundStatus.FAILED]: AlertCircle,
	[RefundStatus.CANCELLED]: CircleOff,
};

interface RefundsDataTableProps {
	refundsPromise: Promise<GetRefundsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export async function RefundsDataTable({
	refundsPromise,
	perPage,
	hasActiveFilters,
}: RefundsDataTableProps) {
	const { refunds, pagination, totalCount } = await refundsPromise;

	if (refunds.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={ReceiptText}
				title="Aucun remboursement trouvé"
				description="Aucun remboursement ne correspond aux critères de recherche."
				noItemsDescription="Aucun remboursement à traiter pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/ventes/remboursements"
			/>
		);
	}

	// Seuls les refunds PENDING sont éligibles au bulk-approve

	return (
		<AdminDataTable
			caption="Liste des remboursements"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: refunds.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
				// Ce module plafonne sous MAX_ADMIN : ne pas proposer une valeur que le
				// schéma refuserait (sinon 20 lignes affichées avec « 200 » sélectionné).
				perPageOptions: perPageOptionsUpTo(GET_REFUNDS_MAX_RESULTS_PER_PAGE),
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[14%]">Commande</TableHead>
					<TableHead className="w-[12%]">Date</TableHead>
					<TableHead className="w-[24%]">Client</TableHead>
					<TableHead className="w-[16%]">Raison</TableHead>
					<TableHead className="w-[12%]">Statut</TableHead>
					<TableHead className="w-[22%] text-right">Montant</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{refunds.map((refund) => {
					return (
						<TableRow key={refund.id}>
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
								{(() => {
									const status = refund.status as RefundStatus;
									const label = REFUND_STATUS_LABELS[status];
									const Icon = REFUND_STATUS_ICONS[status];
									return (
										<Badge
											variant={REFUND_STATUS_VARIANTS[status]}
											role="status"
											aria-label={`Statut : ${label}`}
										>
											<Icon aria-hidden="true" />
											{label}
										</Badge>
									);
								})()}
							</TableCell>
							<TableCell className="text-right">
								<span className="text-sm font-bold">{formatEuro(refund.amount)}</span>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
