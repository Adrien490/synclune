import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import type {
	GetRecentOrdersReturn,
	RecentOrderItem,
} from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
} from "../constants/order-status.constants";
import { CHART_STYLES } from "../constants/chart-styles";

interface RecentOrdersListProps {
	listData: GetRecentOrdersReturn;
}

export function RecentOrdersList({ listData }: RecentOrdersListProps) {
	const { orders } = listData;

	return (
		<Card className={`${CHART_STYLES.card} can-hover:hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Dernières commandes</CardTitle>
				<CardDescription className="text-sm">Les 5 commandes les plus récentes</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{orders.map((order: RecentOrderItem) => (
						<Link
							key={order.id}
							href={`/admin/ventes/commandes/${order.id}`}
							className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
						>
							<div className="flex-1 space-y-1">
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">#{order.orderNumber}</p>
									<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge
										variant={order.paymentStatus === "PAID" ? "default" : "outline"}
										className="text-xs"
									>
										{PAYMENT_STATUS_LABELS[order.paymentStatus]}
									</Badge>
								</div>
								<p className="text-muted-foreground text-sm">
									{order.customerName} • {order.customerEmail}
								</p>
								<p className="text-muted-foreground text-xs">
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
						<p className="text-muted-foreground py-4 text-center text-sm">
							Aucune commande récente
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
