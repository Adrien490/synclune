import { OrderStatus } from "@/app/generated/prisma/client";
import { Button } from "@/shared/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import type { UserOrder } from "@/modules/orders/types/user-orders.types";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Package } from "lucide-react";
import Link from "next/link";
import { use } from "react";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELLED: "Annulée",
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
	PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface RecentOrdersProps {
	ordersPromise: ReturnType<typeof getUserOrders>;
}

export function RecentOrders({ ordersPromise }: RecentOrdersProps) {
	const { orders } = use(ordersPromise);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg/7 tracking-tight antialiased font-semibold">Mes commandes</h2>
			</div>

			{orders.length === 0 ? (
				<div className="text-center py-12 border rounded-lg">
					<div className="flex justify-center mb-4">
						<Package className="h-12 w-12 text-muted-foreground" />
					</div>
					<p className="text-base/7 tracking-normal antialiased text-muted-foreground mb-4">
						Vous n&apos;avez pas encore passé de commande
					</p>
					<Button asChild>
						<Link href="/products">Découvrir nos bijoux</Link>
					</Button>
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Commande</TableHead>
								<TableHead>Statut</TableHead>
								<TableHead className="hidden sm:table-cell">Date</TableHead>
								<TableHead className="hidden md:table-cell">Articles</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order: UserOrder) => (
								<TableRow key={order.id}>
									<TableCell className="text-sm/6 tracking-normal antialiased font-medium">
										#{order.orderNumber}
									</TableCell>
									<TableCell>
										<span
											className={cn(
												"inline-flex items-center rounded-full px-2 py-1 text-xs/5 tracking-normal antialiased font-medium",
												ORDER_STATUS_STYLES[order.status]
											)}
										>
											{ORDER_STATUS_LABELS[order.status]}
										</span>
									</TableCell>
									<TableCell className="hidden sm:table-cell text-sm/6 tracking-normal antialiased text-muted-foreground">
										{format(order.createdAt, "d MMM yyyy", { locale: fr })}
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm/6 tracking-normal antialiased text-muted-foreground">
										{order._count.items} article{order._count.items > 1 ? "s" : ""}
									</TableCell>
									<TableCell className="text-right text-sm/6 tracking-normal antialiased font-semibold">
										{formatEuro(order.total)}
									</TableCell>
									<TableCell>
										<span className="text-xs/5 tracking-normal antialiased text-muted-foreground">Voir détails</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
