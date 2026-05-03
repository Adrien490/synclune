"use client";

import { ShoppingBag } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";
import { formatEuro } from "@/shared/utils/format-euro";

import { quickSearchOrdersAdminAction } from "../../actions/quick-search-orders-admin";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "../../constants/status-display";
import type { AdminQuickSearchOrderItem } from "../../data/quick-search-orders-admin";

export const ordersAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchOrderItem> = {
	scope: "orders",
	placeholder: "Numéro, email, client…",
	ariaLabel: "Rechercher une commande par numéro, email ou client",
	minQueryLength: 2,
	search: (query) => quickSearchOrdersAdminAction(query),
	getResultId: (o) => `admin-order-${o.id}`,
	getResultHref: (o) => `/admin/ventes/commandes/${o.id}`,
	getResultLabel: (o) => `Commande ${o.orderNumber}${o.customerName ? ` — ${o.customerName}` : ""}`,
	renderResultItem: (o) => <OrderCard order={o} />,
};

function OrderCard({ order }: { order: AdminQuickSearchOrderItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<ShoppingBag className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{order.orderNumber}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">{order.customerName ?? order.customerEmail ?? "Client"}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{formatEuro(order.totalInclTax)}</span>
				</div>
			</div>
			<Badge variant={ORDER_STATUS_VARIANTS[order.status]} className="text-[10px]">
				{ORDER_STATUS_LABELS[order.status]}
			</Badge>
		</>
	);
}
