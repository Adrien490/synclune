import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import type { UserOrder } from "@/modules/orders/types/user-orders.types";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { formatEuro } from "@/shared/utils/format-euro";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Package } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface RecentOrdersProps {
	ordersPromise: ReturnType<typeof getUserOrders>;
	/** Nombre de commandes à afficher (par défaut 5) */
	limit?: number;
	/** Afficher le lien "Voir toutes mes commandes" */
	showViewAll?: boolean;
}

export function RecentOrders({ ordersPromise, limit = 5, showViewAll = false }: RecentOrdersProps) {
	const { orders, pagination } = use(ordersPromise);
	const displayedOrders = orders.slice(0, limit);
	// Il y a plus de commandes si on a reçu plus que le limit ou s'il y a une page suivante
	const hasMoreOrders = orders.length > limit || pagination.hasNextPage;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg/7 font-semibold tracking-tight antialiased">Commandes récentes</h2>
			</div>

			{orders.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Package className="size-6" />
						</EmptyMedia>
						<EmptyTitle>Aucune commande</EmptyTitle>
						<EmptyDescription>Vous n'avez pas encore passé de commande</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href="/produits">Découvrir nos bijoux</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<>
					<TableScrollContainer className="rounded-lg border">
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
								{displayedOrders.map((order: UserOrder) => (
									<TableRow key={order.id}>
										<TableCell className="text-sm/6 font-medium tracking-normal antialiased">
											#{order.orderNumber}
										</TableCell>
										<TableCell>
											<Badge
												variant={ORDER_STATUS_VARIANTS[order.status]}
												className="whitespace-nowrap"
											>
												{ORDER_STATUS_LABELS[order.status]}
											</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground hidden text-sm/6 tracking-normal antialiased sm:table-cell">
											{format(order.createdAt, "d MMM yyyy", { locale: fr })}
										</TableCell>
										<TableCell className="text-muted-foreground hidden text-sm/6 tracking-normal antialiased md:table-cell">
											{order._count.items} article{order._count.items > 1 ? "s" : ""}
										</TableCell>
										<TableCell className="text-right text-sm/6 font-semibold tracking-normal antialiased">
											{formatEuro(order.total)}
										</TableCell>
										<TableCell>
											<Button variant="link" size="sm" className="h-auto p-0" asChild>
												<Link
													href={`/commandes/${order.orderNumber}`}
													aria-label={`Voir la commande #${order.orderNumber}`}
												>
													Voir
												</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableScrollContainer>

					{showViewAll && hasMoreOrders && (
						<div className="flex justify-center">
							<Button variant="outline" asChild>
								<Link href="/commandes">Voir toutes mes commandes</Link>
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
