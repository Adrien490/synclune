import { RefundStatus } from "@/app/generated/prisma/browser";
import {
	REFUND_STATUS_LABELS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { formatDateShort } from "@/shared/utils/dates";
import { RotateCcw, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderRefundsCardProps } from "./types";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
	switch (status) {
		case RefundStatus.PENDING:
			return "warning";
		case RefundStatus.APPROVED:
			return "default";
		case RefundStatus.COMPLETED:
			return "success";
		case RefundStatus.REJECTED:
		case RefundStatus.FAILED:
			return "destructive";
		case RefundStatus.CANCELLED:
			return "secondary";
		default:
			return "outline";
	}
}

export function OrderRefundsCard({ refunds, orderId, canRefund }: OrderRefundsCardProps) {
	// Ne pas afficher si aucun remboursement et pas éligible
	if (refunds.length === 0 && !canRefund) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<RotateCcw className="h-5 w-5" aria-hidden="true" />
					Remboursements
					{refunds.length > 0 && (
						<Badge variant="secondary" className="ml-1">
							{refunds.length}
						</Badge>
					)}
				</CardTitle>
				{canRefund && (
					<Button variant="outline" size="sm" asChild>
						<Link href={`/admin/ventes/remboursements/nouveau?orderId=${orderId}`}>
							<Plus className="h-4 w-4" aria-hidden="true" />
							Créer
						</Link>
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{refunds.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Aucun remboursement pour cette commande.
					</p>
				) : (
					<div className="space-y-3">
						{refunds.map((refund) => (
							<div
								key={refund.id}
								className="flex items-center justify-between gap-4 rounded-lg border p-3"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<Badge variant={getStatusVariant(refund.status)}>
											{REFUND_STATUS_LABELS[refund.status as RefundStatus] || refund.status}
										</Badge>
										<span className="text-sm font-medium">
											{formatEuro(refund.amount)}
										</span>
									</div>
									<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
										<span>{REFUND_REASON_LABELS[refund.reason as keyof typeof REFUND_REASON_LABELS] || refund.reason}</span>
										<span>•</span>
										<span>{formatDateShort(new Date(refund.createdAt))}</span>
									</div>
								</div>
								<Button variant="ghost" size="sm" asChild>
									<Link href={`/admin/ventes/remboursements/${refund.id}`}>
										<ExternalLink className="h-4 w-4" aria-hidden="true" />
										<span className="sr-only">Voir le détail du remboursement</span>
									</Link>
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
