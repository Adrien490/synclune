"use client";

import { Receipt } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";
import { formatEuro } from "@/shared/utils/format-euro";

import { quickSearchRefundsAdminAction } from "../../actions/quick-search-refunds-admin";
import { REFUND_STATUS_LABELS, REFUND_STATUS_VARIANTS } from "../../constants/refund.constants";
import type { AdminQuickSearchRefundItem } from "../../data/quick-search-refunds-admin";

export const refundsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchRefundItem> = {
	scope: "refunds",
	placeholder: "Numéro de commande, email…",
	ariaLabel: "Rechercher un remboursement",
	minQueryLength: 2,
	search: (query) => quickSearchRefundsAdminAction(query),
	getResultId: (r) => `admin-refund-${r.id}`,
	// Pas de page détail dédiée — filtrer la liste par numéro de commande pour ouvrir le drawer.
	getResultHref: (r) =>
		`/admin/ventes/remboursements?search=${encodeURIComponent(r.order.orderNumber)}`,
	getResultLabel: (r) => `Remboursement commande ${r.order.orderNumber}`,
	renderResultItem: (r) => <RefundCard refund={r} />,
};

function RefundCard({ refund }: { refund: AdminQuickSearchRefundItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Receipt className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{refund.order.orderNumber}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">
						{refund.order.customerName ?? refund.order.customerEmail ?? "Client"}
					</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{formatEuro(refund.amount)}</span>
				</div>
			</div>
			<Badge variant={REFUND_STATUS_VARIANTS[refund.status]} className="text-[10px]">
				{REFUND_STATUS_LABELS[refund.status]}
			</Badge>
		</>
	);
}
