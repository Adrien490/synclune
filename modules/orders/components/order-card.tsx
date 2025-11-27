import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { GetUserOrdersReturn } from "@/modules/orders/types/user-orders.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";

type Order = GetUserOrdersReturn["orders"][number];

interface OrderCardProps {
	order: Order;
}

const STATUS_LABELS: Record<string, string> = {
	PENDING: "En attente",
	PROCESSING: "En cours",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELLED: "Annulée",
};

const STATUS_COLORS: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	PENDING: "outline",
	PROCESSING: "secondary",
	SHIPPED: "default",
	DELIVERED: "default",
	CANCELLED: "destructive",
};

export function OrderCard({ order }: OrderCardProps) {
	const statusLabel = STATUS_LABELS[order.status] || order.status;
	const statusColor = STATUS_COLORS[order.status] || "default";

	return (
		<div className="bg-card-soft border border-border-soft rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30">
			{/* Header de la commande */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-border-soft">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 bg-gradient-icon-rose rounded-lg flex items-center justify-center shrink-0">
						<Package className="w-6 h-6 text-primary" />
					</div>
					<div>
						<h3 className="heading-4 text-lg text-charcoal">
							Commande #{order.orderNumber}
						</h3>
						<p className="body-small text-charcoal-light">
							{format(new Date(order.createdAt), "d MMMM yyyy", {
								locale: fr,
							})}
						</p>
					</div>
				</div>
				<Badge variant={statusColor} className="self-start sm:self-auto">
					{statusLabel}
				</Badge>
			</div>

			{/* Détails de la commande */}
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<p className="body-small text-charcoal-light mb-1">Articles</p>
					<p className="body-normal font-medium text-charcoal">
						{order._count.items} article{order._count.items > 1 ? "s" : ""}
					</p>
				</div>
				<div>
					<p className="body-small text-charcoal-light mb-1">Total</p>
					<p className="body-normal font-semibold text-charcoal">
						{formatEuro(order.total)}
					</p>
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col sm:flex-row gap-3">
				<Button
					asChild
					variant="outline"
					className="flex-1 border-primary/30 hover:bg-primary/5 hover:border-primary transition-colors"
				>
					<Link href={`/orders/${order.id}`}>
						Voir les détails
						<ChevronRight className="ml-2 w-4 h-4" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
