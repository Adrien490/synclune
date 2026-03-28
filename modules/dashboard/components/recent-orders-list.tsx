import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import type {
	GetRecentOrdersReturn,
	RecentOrderItem,
} from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/shared/utils/cn";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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
						<Link
							key={order.id}
							href={`/admin/ventes/commandes/${order.id}`}
							className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
							aria-label={`Commande #${order.orderNumber}, ${order.total.toFixed(2)} €, ${order.customerName}, ${ORDER_STATUS_LABELS[order.status]}`}
						>
							<div className="min-w-0 flex-1 space-y-1">
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">#{order.orderNumber}</p>
									<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge
										variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]}
										className="text-xs"
									>
										{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
									</Badge>
								</div>
								<p
									className="text-muted-foreground truncate text-sm"
									title={`${order.customerName} • ${order.customerEmail}`}
								>
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
			{orders.length > 0 && (
				<CardFooter className="justify-center border-t pt-4">
					<Button asChild variant="ghost" size="sm" className="gap-1.5">
						<Link href="/admin/ventes/commandes">
							Voir toutes les commandes
							<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
						</Link>
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
