import { RotateCcw } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

interface OrderRefundsCardProps {
	refunds: GetOrderReturn["refunds"];
}

export function OrderRefundsCard({ refunds }: OrderRefundsCardProps) {
	const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);

	return (
		<section className="space-y-4">
			<h2 className="flex items-center gap-2 text-base font-semibold">
				<RotateCcw className="text-muted-foreground size-4" />
				Remboursements
				<Badge variant="secondary" className="text-xs">
					{refunds.length}
				</Badge>
			</h2>

			<div className="border-border/60 space-y-3 border-t pt-4">
				{refunds.length > 1 && (
					<p className="text-sm font-medium">Total remboursé : {formatEuro(totalRefunded)}</p>
				)}

				{refunds.map((refund) => (
					<div key={refund.id} className="space-y-2 rounded-lg border p-3">
						<div className="flex items-center justify-between gap-2">
							<Badge variant={REFUND_STATUS_VARIANTS[refund.status]}>
								{REFUND_STATUS_LABELS[refund.status]}
							</Badge>
							<span className="text-sm font-semibold tabular-nums">
								{formatEuro(refund.amount)}
							</span>
						</div>

						<div className="text-muted-foreground space-y-0.5 text-sm">
							<p>{REFUND_REASON_LABELS[refund.reason]}</p>
							<p>
								Demandé le {formatDateShort(refund.createdAt)}
								{refund.processedAt && <> · Traité le {formatDateShort(refund.processedAt)}</>}
							</p>
						</div>

						{refund.items.length > 0 && (
							<ul className="text-muted-foreground list-inside list-disc text-sm">
								{refund.items.map((item) => (
									<li key={item.id}>
										{item.orderItem.productTitle}
										{item.orderItem.skuColor && <> ({item.orderItem.skuColor})</>} ×{item.quantity}
									</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
