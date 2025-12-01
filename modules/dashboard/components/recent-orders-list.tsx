"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import type { GetDashboardRecentOrdersReturn, RecentOrderItem } from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { use } from "react";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
} from "../constants/order-status";

interface RecentOrdersListProps {
	ordersPromise: Promise<GetDashboardRecentOrdersReturn>;
}

export function RecentOrdersList({ ordersPromise }: RecentOrdersListProps) {
	const { orders } = use(ordersPromise);

	return (
		<Card className="border-l-4 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold tracking-wide">Dernières commandes</CardTitle>
				<CardDescription className="text-sm">Les 5 commandes les plus récentes</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{orders.map((order: RecentOrderItem) => (
						<Link
							key={order.id}
							href={` /dashboard/orders/${order.id}`}
							className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
						>
							<div className="space-y-1 flex-1">
								<div className="flex items-center gap-2">
									<p className="font-medium text-sm">#{order.orderNumber}</p>
									<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge
										variant={
											order.paymentStatus === "PAID" ? "default" : "outline"
										}
										className="text-xs"
									>
										{PAYMENT_STATUS_LABELS[order.paymentStatus]}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground">
									{order.customerName} • {order.customerEmail}
								</p>
								<p className="text-xs text-muted-foreground">
									{format(new Date(order.createdAt), "dd/MM/yyyy à HH:mm", {
										locale: fr,
									})}
								</p>
							</div>
							<div className="text-right">
								<p className="font-bold">{order.total.toFixed(2)} €</p>
							</div>
						</Link>
					))}
					{orders.length === 0 && (
						<p className="text-sm text-muted-foreground text-center py-4">
							Aucune commande récente
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
