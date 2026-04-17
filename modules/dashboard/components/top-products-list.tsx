"use client";

import { ArrowRight, ChevronRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "@/shared/components/ui/item";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { GetTopProductsReturn } from "@/modules/dashboard/data/get-top-products";
import { CHART_STYLES } from "../constants/chart-styles";

interface TopProductsListProps {
	data: GetTopProductsReturn;
}

export function TopProductsList({ data }: TopProductsListProps) {
	const { products } = data;
	const isMobile = useIsMobile();

	if (products.length === 0) {
		if (isMobile) {
			return (
				<section aria-labelledby="top-products-empty-mobile">
					<h3 id="top-products-empty-mobile" className="text-base font-semibold">
						Top produits
					</h3>
					<div className="text-muted-foreground flex flex-col items-center py-6 text-center">
						<ShoppingBag className="mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
						<p className="text-sm font-medium">Aucune vente ce mois</p>
					</div>
				</section>
			);
		}
		return (
			<Card className={cn(CHART_STYLES.card, "flex min-h-60 items-center justify-center")}>
				<div className="text-muted-foreground text-center">
					<ShoppingBag className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
					<p className="text-sm font-medium">Aucune vente ce mois</p>
				</div>
			</Card>
		);
	}

	if (isMobile) {
		return (
			<section className="space-y-3" aria-labelledby="top-products-mobile-title">
				<header>
					<h3 id="top-products-mobile-title" className="text-base font-semibold">
						Top produits
					</h3>
					<p className="text-muted-foreground text-xs">Meilleures ventes du mois en cours</p>
				</header>
				<ItemGroup aria-label="Top produits">
					{products.map((product, index) => (
						<div key={product.productId ?? index}>
							{index > 0 && <ItemSeparator />}
							<Item size="sm">
								<span className="text-muted-foreground w-5 shrink-0 text-center text-xs font-semibold">
									{index + 1}
								</span>
								<ItemMedia variant="image">
									{product.imageUrl ? (
										<Image
											src={product.imageUrl}
											alt=""
											width={40}
											height={40}
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="bg-muted flex h-full w-full items-center justify-center">
											<ShoppingBag
												className="text-muted-foreground/40 h-4 w-4"
												aria-hidden="true"
											/>
										</div>
									)}
								</ItemMedia>
								<ItemContent>
									<ItemTitle className="text-sm">{product.title}</ItemTitle>
									<ItemDescription className="text-xs">
										{product.unitsSold} vendu{product.unitsSold > 1 ? "s" : ""}
									</ItemDescription>
								</ItemContent>
								<ItemActions className="shrink-0">
									<Badge variant="secondary" className="text-xs font-semibold tabular-nums">
										{formatEuro(product.revenue, { compact: true })}
									</Badge>
								</ItemActions>
							</Item>
						</div>
					))}
					<ItemSeparator />
					<Item asChild size="sm">
						<Link href="/admin/catalogue/produits" className="text-primary text-sm font-medium">
							<ItemContent>
								<ItemTitle className="text-primary">Voir tous les produits</ItemTitle>
							</ItemContent>
							<ChevronRight className="text-primary h-4 w-4" aria-hidden="true" />
						</Link>
					</Item>
				</ItemGroup>
			</section>
		);
	}

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Top produits</CardTitle>
				<CardDescription className="text-sm">Meilleures ventes du mois en cours</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{products.map((product, index) => (
						<div key={product.productId ?? index} className="flex items-center gap-3">
							<span className="text-muted-foreground w-5 text-center text-sm font-semibold">
								{index + 1}
							</span>

							<div className="bg-muted h-10 w-10 flex-shrink-0 overflow-hidden rounded-md sm:h-12 sm:w-12">
								{product.imageUrl ? (
									<Image
										src={product.imageUrl}
										alt=""
										width={48}
										height={48}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center">
										<ShoppingBag className="text-muted-foreground/40 h-4 w-4" aria-hidden="true" />
									</div>
								)}
							</div>

							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{product.title}</p>
								<p className="text-muted-foreground text-xs">
									{product.unitsSold} vendu{product.unitsSold > 1 ? "s" : ""}
								</p>
							</div>

							<Badge variant="secondary" className="text-xs font-semibold">
								{formatEuro(product.revenue, { compact: true })}
							</Badge>
						</div>
					))}
				</div>
			</CardContent>
			<CardFooter className="justify-center border-t pt-4">
				<Button asChild variant="ghost" size="sm" className="gap-1.5">
					<Link href="/admin/catalogue/produits">
						Voir tous les produits
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
