"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@/shared/components/ui/item";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type {
	GetRecentOrdersReturn,
	RecentOrderItem,
} from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/shared/utils/cn";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "../constants/order-status.constants";
import { CHART_STYLES } from "../constants/chart-styles";

interface RecentOrdersListProps {
	listData: GetRecentOrdersReturn;
}

export function RecentOrdersList({ listData }: RecentOrdersListProps) {
	const { orders } = listData;
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<section className="space-y-3" aria-labelledby="recent-orders-mobile-title">
				<header>
					<h3
						id="recent-orders-mobile-title"
						className="font-display text-lg font-normal tracking-tight"
					>
						Dernières commandes
					</h3>
					<p className="text-muted-foreground text-xs">Les 5 commandes les plus récentes</p>
				</header>

				{orders.length === 0 ? (
					<p className="text-muted-foreground py-4 text-center text-sm">Aucune commande récente</p>
				) : (
					<ItemGroup aria-label="Dernières commandes">
						{orders.map((order: RecentOrderItem, index) => (
							<div key={order.id}>
								{index > 0 && <ItemSeparator />}
								<Item size="sm">
									<ItemContent>
										<ItemTitle className="gap-1.5">
											<span className="text-sm font-medium">#{order.orderNumber}</span>
											<Badge variant={ORDER_STATUS_VARIANTS[order.status]} className="text-[10px]">
												{ORDER_STATUS_LABELS[order.status]}
											</Badge>
										</ItemTitle>
										<ItemDescription className="text-xs">
											<span className="truncate">{order.customerName}</span>
											<span className="block text-[11px]">
												{format(new Date(order.createdAt), "dd/MM à HH:mm", { locale: fr })}
											</span>
										</ItemDescription>
									</ItemContent>
									<ItemActions className="shrink-0">
										<span className="text-foreground text-sm font-semibold tabular-nums">
											{order.total.toFixed(2)} €
										</span>
									</ItemActions>
								</Item>
							</div>
						))}
					</ItemGroup>
				)}
			</section>
		);
	}

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Dernières commandes</CardTitle>
				<CardDescription className="text-sm">Les 5 commandes les plus récentes</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{orders.map((order: RecentOrderItem) => (
						<div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
							<div className="min-w-0 flex-1 gap-y-1">
								<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
									<p className="text-sm font-medium">#{order.orderNumber}</p>
									<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge
										variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]}
										className="xs:inline-flex hidden text-xs"
									>
										{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
									</Badge>
								</div>
								<p
									className="text-muted-foreground truncate text-sm"
									title={`${order.customerName} • ${order.customerEmail}`}
								>
									{order.customerName}
									<span className="hidden sm:inline"> • {order.customerEmail}</span>
								</p>
								<p className="text-muted-foreground text-xs">
									{format(new Date(order.createdAt), "dd/MM/yyyy à HH:mm", {
										locale: fr,
									})}
								</p>
							</div>
							<div className="text-right">
								<p className="font-bold tabular-nums">{order.total.toFixed(2)} €</p>
							</div>
						</div>
					))}
					{orders.length === 0 && (
						<p className="text-muted-foreground py-4 text-center text-sm">
							Aucune commande récente
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
