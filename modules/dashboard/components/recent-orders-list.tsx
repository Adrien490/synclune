"use client";

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
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@/shared/components/ui/item";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type {
	GetRecentOrdersReturn,
	RecentOrderItem,
} from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/shared/utils/cn";
import { ArrowRight, ChevronRight } from "lucide-react";
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
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<section className="space-y-3" aria-labelledby="recent-orders-mobile-title">
				<header>
					<h3 id="recent-orders-mobile-title" className="text-base font-semibold">
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
								<Item asChild size="sm">
									<Link
										href={`/admin/ventes/commandes/${order.id}`}
										onClick={() => triggerHaptic("light")}
										aria-label={`Commande #${order.orderNumber}, ${order.total.toFixed(2)} €, ${order.customerName}, ${ORDER_STATUS_LABELS[order.status]}`}
									>
										<ItemContent>
											<ItemTitle className="gap-1.5">
												<span className="text-sm font-medium">#{order.orderNumber}</span>
												<Badge
													variant={ORDER_STATUS_VARIANTS[order.status]}
													className="text-[10px]"
												>
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
											<ChevronRight
												className="text-muted-foreground/60 h-4 w-4"
												aria-hidden="true"
											/>
										</ItemActions>
									</Link>
								</Item>
							</div>
						))}
						{orders.length > 0 && (
							<>
								<ItemSeparator />
								<Item asChild size="sm">
									<Link
										href="/admin/ventes/commandes"
										onClick={() => triggerHaptic("light")}
										className="text-primary text-sm font-medium"
									>
										<ItemContent>
											<ItemTitle className="text-primary">Voir toutes les commandes</ItemTitle>
										</ItemContent>
										<ChevronRight className="text-primary h-4 w-4" aria-hidden="true" />
									</Link>
								</Item>
							</>
						)}
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
						<Link
							key={order.id}
							href={`/admin/ventes/commandes/${order.id}`}
							onClick={() => triggerHaptic("light")}
							className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
							aria-label={`Commande #${order.orderNumber}, ${order.total.toFixed(2)} €, ${order.customerName}, ${ORDER_STATUS_LABELS[order.status]}`}
						>
							<div className="min-w-0 flex-1 space-y-1">
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
