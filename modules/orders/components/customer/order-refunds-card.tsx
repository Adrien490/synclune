import { RotateCcw } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
	REFUND_STATUS_LABELS,
	REFUND_STATUS_COLORS,
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
			<h2 className="text-base font-semibold flex items-center gap-2">
				<RotateCcw className="size-4 text-muted-foreground" />
				Remboursements
				<Badge variant="secondary" className="text-xs">
					{refunds.length}
				</Badge>
			</h2>

			<div className="border-t border-border/60 pt-4 space-y-3">
				{refunds.length > 1 && (
					<p className="text-sm font-medium">
						Total remboursé : {formatEuro(totalRefunded)}
					</p>
				)}

				{refunds.map((refund) => (
					<div
						key={refund.id}
						className="border rounded-lg p-3 space-y-2"
					>
						<div className="flex items-center justify-between gap-2">
							<Badge
								style={{
									backgroundColor: REFUND_STATUS_COLORS[refund.status],
									color: "white",
								}}
							>
								{REFUND_STATUS_LABELS[refund.status]}
							</Badge>
							<span className="text-sm font-semibold tabular-nums">
								{formatEuro(refund.amount)}
							</span>
						</div>

						<div className="text-sm text-muted-foreground space-y-0.5">
							<p>{REFUND_REASON_LABELS[refund.reason]}</p>
							<p>
								Demandé le {formatDateShort(refund.createdAt)}
								{refund.processedAt && (
									<> · Traité le {formatDateShort(refund.processedAt)}</>
								)}
							</p>
						</div>

						{refund.items.length > 0 && (
							<ul className="text-sm text-muted-foreground list-disc list-inside">
								{refund.items.map((item) => (
									<li key={item.id}>
										{item.orderItem.productTitle}
										{item.orderItem.skuColor && (
											<> ({item.orderItem.skuColor})</>
										)}
										{" "}×{item.quantity}
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
