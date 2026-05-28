import { CursorPagination } from "@/shared/components/cursor-pagination";
import { PUBLIC_PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
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
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { GetUserOrdersReturn } from "@/modules/orders/types/user-orders.types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEuro } from "@/shared/utils/format-euro";
import { Eye, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CustomerOrdersTableProps {
	ordersPromise: Promise<GetUserOrdersReturn>;
	perPage: number;
}

export async function CustomerOrdersTable({ ordersPromise, perPage }: CustomerOrdersTableProps) {
	const { orders, pagination } = await ordersPromise;

	if (orders.length === 0) {
		return (
			<Empty className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ShoppingBag />
					</EmptyMedia>
					<EmptyTitle>Aucune commande</EmptyTitle>
					<EmptyDescription>
						Vous n'avez pas encore passé de commande. Découvrez nos créations artisanales uniques.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary" size="lg">
						<Link href="/produits">Découvrir nos créations</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<div className="space-y-4">
			{/* Mobile: card list (<sm) */}
			<ul aria-label="Liste de vos commandes" className="flex flex-col gap-3 sm:hidden">
				{orders.map((order) => (
					<li key={order.id}>
						<Link
							href={`/commandes/${order.orderNumber}`}
							aria-label={`Voir la commande ${order.orderNumber} du ${format(order.createdAt, "d MMMM yyyy", { locale: fr })}`}
							className="border-border bg-card hover:border-primary/40 focus-visible:ring-ring active:bg-accent/50 block rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							<article className="space-y-3">
								<header className="flex items-start justify-between gap-3">
									<div className="flex flex-col gap-0.5">
										<span className="text-sm font-semibold tabular-nums">{order.orderNumber}</span>
										<time
											dateTime={order.createdAt.toISOString()}
											className="text-muted-foreground text-xs"
										>
											{format(order.createdAt, "d MMMM yyyy", { locale: fr })}
										</time>
									</div>
									<span className="text-base font-semibold tabular-nums">
										{formatEuro(order.total)}
									</span>
								</header>
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={ORDER_STATUS_VARIANTS[order.status]}
										className="whitespace-nowrap"
									>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge
										variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]}
										className="whitespace-nowrap"
									>
										{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
									</Badge>
									<span className="text-muted-foreground ml-auto text-xs">
										{order._count.items} article{order._count.items > 1 ? "s" : ""}
									</span>
								</div>
							</article>
						</Link>
					</li>
				))}
			</ul>

			{/* Desktop: table (>=sm) */}
			<div className="hidden overflow-hidden rounded-lg border sm:block">
				<TableScrollContainer label="Liste de vos commandes">
					<Table role="table" aria-label="Liste de vos commandes" className="min-w-full">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[15%]">
									Commande
								</TableHead>
								<TableHead scope="col" className="w-[15%]">
									Date
								</TableHead>
								<TableHead scope="col" className="w-[15%]">
									Statut
								</TableHead>
								<TableHead scope="col" className="hidden w-[15%] lg:table-cell">
									Livraison
								</TableHead>
								<TableHead scope="col" className="w-[10%] text-center">
									Articles
								</TableHead>
								<TableHead scope="col" className="w-[10%] text-right">
									Total
								</TableHead>
								<TableHead scope="col" className="w-[10%] text-right">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order) => (
								<TableRow key={order.id}>
									<TableCell>
										<span className="text-sm font-medium tabular-nums">{order.orderNumber}</span>
									</TableCell>
									<TableCell>
										<span className="text-muted-foreground text-sm whitespace-nowrap">
											{format(order.createdAt, "d MMM yyyy", {
												locale: fr,
											})}
										</span>
									</TableCell>
									<TableCell>
										<Badge
											variant={ORDER_STATUS_VARIANTS[order.status]}
											className="whitespace-nowrap"
										>
											{ORDER_STATUS_LABELS[order.status]}
										</Badge>
									</TableCell>
									<TableCell className="hidden lg:table-cell">
										<Badge
											variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]}
											className="whitespace-nowrap"
										>
											{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										<span className="text-muted-foreground text-sm">{order._count.items}</span>
									</TableCell>
									<TableCell className="text-right">
										<span className="text-sm font-semibold">{formatEuro(order.total)}</span>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="ghost" size="sm" asChild>
											<Link
												href={`/commandes/${order.orderNumber}`}
												aria-label={`Voir la commande #${order.orderNumber}`}
											>
												<Eye className="size-4 sm:mr-2" aria-hidden="true" />
												<span className="hidden sm:inline">Voir</span>
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableScrollContainer>
			</div>

			<div className="px-1">
				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={orders.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
					perPageOptions={PUBLIC_PER_PAGE_OPTIONS}
				/>
			</div>
		</div>
	);
}
