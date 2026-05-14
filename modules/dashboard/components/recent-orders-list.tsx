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
import { Fade } from "@/shared/components/animations/fade";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type {
	GetRecentOrdersReturn,
	RecentOrderItem,
} from "@/modules/dashboard/data/get-recent-orders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, ChevronRight, ShoppingBag } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/shared/utils/cn";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "../constants/order-status.constants";
import { CHART_STYLES } from "../constants/chart-styles";

function buildOrderHref(order: RecentOrderItem): string {
	return `/admin/ventes/commandes/${order.id}`;
}

function buildOrderAriaLabel(order: RecentOrderItem): string {
	return `Commande #${order.orderNumber}, ${order.customerName}, ${order.total.toFixed(2)} €, statut ${ORDER_STATUS_LABELS[order.status]}`;
}

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
					<div
						className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center"
						role="status"
					>
						<ShoppingBag className="size-8 opacity-40" aria-hidden="true" />
						<p className="text-sm font-medium">Aucune commande récente</p>
						<p className="text-xs">Les nouvelles commandes apparaîtront ici</p>
					</div>
				) : (
					<>
						<ItemGroup aria-label="Dernières commandes">
							{orders.map((order: RecentOrderItem, index) => (
								<Fade key={order.id} y={6} delay={index * 0.04} inView once>
									{index > 0 && <ItemSeparator />}
									<Item asChild size="sm">
										<Link
											href={buildOrderHref(order)}
											onClick={() => triggerHaptic("light")}
											aria-label={buildOrderAriaLabel(order)}
											className="transform-gpu touch-manipulation active:scale-[0.99] motion-safe:transition-transform motion-safe:duration-150"
											style={{ viewTransitionName: `order-card-${order.id}` } as CSSProperties}
										>
											<ItemContent>
												<ItemTitle className="gap-1.5">
													<span
														className="text-sm font-medium"
														style={
															{ viewTransitionName: `order-number-${order.id}` } as CSSProperties
														}
													>
														#{order.orderNumber}
													</span>
													<Badge
														variant={ORDER_STATUS_VARIANTS[order.status]}
														className="text-[10px]"
														style={
															{ viewTransitionName: `order-status-${order.id}` } as CSSProperties
														}
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
												<span
													className="text-foreground text-sm font-semibold tabular-nums"
													style={{ viewTransitionName: `order-total-${order.id}` } as CSSProperties}
												>
													{order.total.toFixed(2)} €
												</span>
												<ChevronRight
													className="text-muted-foreground/60 size-4"
													aria-hidden="true"
												/>
											</ItemActions>
										</Link>
									</Item>
								</Fade>
							))}
						</ItemGroup>
						<Link
							href="/admin/ventes/commandes"
							onClick={() => triggerHaptic("light")}
							className="text-muted-foreground hover:text-foreground inline-flex h-11 w-full touch-manipulation items-center justify-center gap-1.5 text-sm active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150"
						>
							Voir toutes les commandes
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</Link>
					</>
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
					{orders.map((order: RecentOrderItem, index) => (
						<Fade
							key={order.id}
							y={6}
							delay={index * 0.04}
							inView
							once
							className="flex items-center justify-between rounded-lg border p-3"
						>
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
						</Fade>
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
