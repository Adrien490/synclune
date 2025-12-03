import { OrderStatus, FulfillmentStatus } from "@/app/generated/prisma";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { GetUserOrdersReturn } from "@/modules/orders/types/user-orders.types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";

export interface CustomerOrdersTableProps {
	ordersPromise: Promise<GetUserOrdersReturn>;
}

const formatPrice = (priceInCents: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(priceInCents / 100);
};

export async function CustomerOrdersTable({
	ordersPromise,
}: CustomerOrdersTableProps) {
	const { orders, pagination } = await ordersPromise;

	if (orders.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ShoppingBag />
					</EmptyMedia>
					<EmptyTitle>Aucune commande</EmptyTitle>
					<EmptyDescription>
						Vous n'avez pas encore passé de commande.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Link href="/produits" className="text-foreground hover:underline">
						Découvrir nos créations
					</Link>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent className="p-0 sm:p-6">
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Liste de vos commandes"
						className="min-w-full"
					>
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[25%] sm:w-[15%]">
									Commande
								</TableHead>
								<TableHead
									scope="col"
									className="hidden sm:table-cell w-[15%]"
								>
									Date
								</TableHead>
								<TableHead scope="col" className="w-[20%] sm:w-[15%]">
									Statut
								</TableHead>
								<TableHead
									scope="col"
									className="hidden lg:table-cell w-[15%]"
								>
									Livraison
								</TableHead>
								<TableHead
									scope="col"
									className="hidden sm:table-cell w-[10%] text-center"
								>
									Articles
								</TableHead>
								<TableHead scope="col" className="w-[15%] sm:w-[10%] text-right">
									Total
								</TableHead>
								<TableHead scope="col" className="w-[20%] sm:w-[10%] text-right">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order) => (
								<TableRow key={order.id}>
									<TableCell>
										<ViewTransition name={`order-${order.id}`}>
											<Link
												href={`/commandes/${order.orderNumber}`}
												className="font-mono text-sm font-medium text-primary hover:underline"
											>
												{order.orderNumber}
											</Link>
										</ViewTransition>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<span className="text-sm whitespace-nowrap text-muted-foreground">
											{format(order.createdAt, "d MMM yyyy", {
												locale: fr,
											})}
										</span>
									</TableCell>
									<TableCell>
										<Badge
											variant={ORDER_STATUS_VARIANTS[order.status as OrderStatus]}
											className="whitespace-nowrap"
										>
											{ORDER_STATUS_LABELS[order.status as OrderStatus]}
										</Badge>
									</TableCell>
									<TableCell className="hidden lg:table-cell">
										<Badge
											variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus as FulfillmentStatus]}
											className="whitespace-nowrap"
										>
											{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus as FulfillmentStatus]}
										</Badge>
									</TableCell>
									<TableCell className="hidden sm:table-cell text-center">
										<span className="text-sm text-muted-foreground">
											{order._count.items}
										</span>
									</TableCell>
									<TableCell className="text-right">
										<span className="text-sm font-semibold">
											{formatPrice(order.total)}
										</span>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="sm" asChild>
											<Link href={`/commandes/${order.orderNumber}`}>
												<Eye className="h-4 w-4 sm:mr-2" />
												<span className="hidden sm:inline">Voir</span>
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4 px-4 sm:px-0">
					<CursorPagination
						perPage={orders.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={orders.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
