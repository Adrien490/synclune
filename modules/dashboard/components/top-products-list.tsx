"use client";

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
import { Fade } from "@/shared/components/animations/fade";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { ArrowRight, ChevronRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { IMAGE_BLUR_FALLBACK } from "@/shared/constants/images";
import type { GetTopProductsReturn, TopProductItem } from "../data/get-top-products";
import { CHART_STYLES } from "../constants/chart-styles";

interface TopProductsListProps {
	listData: GetTopProductsReturn;
	periodLabel?: string;
}

function ProductThumb({ product, vtId }: { product: TopProductItem; vtId?: string }) {
	const vtStyle: CSSProperties | undefined = vtId
		? { viewTransitionName: `product-image-${vtId}` }
		: undefined;
	if (!product.imageUrl) {
		return (
			<div
				className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md"
				aria-hidden="true"
				style={vtStyle}
			>
				<Package className="size-4" />
			</div>
		);
	}
	return (
		<div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-md" style={vtStyle}>
			<Image
				src={product.imageUrl}
				alt=""
				fill
				sizes="40px"
				className="object-cover"
				placeholder="blur"
				blurDataURL={IMAGE_BLUR_FALLBACK}
				aria-hidden="true"
			/>
		</div>
	);
}

function getRowHref(product: TopProductItem): string | null {
	if (!product.productSlug) return null;
	return `/admin/catalogue/produits/${product.productSlug}`;
}

function getAriaLabel(product: TopProductItem, rank: number): string {
	const unitsLabel = product.unitsSold > 1 ? "unités" : "unité";
	return `Rang ${rank}, ${product.title}, ${product.unitsSold} ${unitsLabel} vendues, ${formatEuro(product.revenue)} de chiffre d'affaires`;
}

export function TopProductsList({ listData, periodLabel }: TopProductsListProps) {
	const { products } = listData;
	const isMobile = useIsMobile();
	const description = periodLabel
		? `Top 5 par chiffre d'affaires — ${periodLabel}`
		: "Top 5 par chiffre d'affaires";

	if (isMobile) {
		return (
			<section className="space-y-3" aria-labelledby="top-products-mobile-title">
				<header>
					<h3
						id="top-products-mobile-title"
						className="font-display text-lg font-normal tracking-tight"
					>
						Top produits
					</h3>
					<p className="text-muted-foreground text-xs">{description}</p>
				</header>

				{products.length === 0 ? (
					<div
						className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center"
						role="status"
					>
						<Package className="size-8 opacity-40" aria-hidden="true" />
						<p className="text-sm font-medium">Aucune vente enregistrée sur la période</p>
						<p className="text-xs">Le top apparaîtra dès la première vente</p>
					</div>
				) : (
					<>
						<ItemGroup aria-label="Top 5 produits">
							{products.map((product, index) => {
								const rank = index + 1;
								const href = getRowHref(product);
								const productVtId = product.productId ?? `rank-${rank}`;
								const inner = (
									<>
										<div className="flex items-center gap-3">
											<span
												className="text-muted-foreground w-5 shrink-0 text-center text-xs font-semibold tabular-nums"
												aria-hidden="true"
											>
												#{rank}
											</span>
											<ProductThumb product={product} vtId={productVtId} />
										</div>
										<ItemContent>
											<ItemTitle className="text-sm font-medium">
												<span className="line-clamp-1">{product.title}</span>
											</ItemTitle>
											<ItemDescription className="text-xs">
												{product.unitsSold} vendue{product.unitsSold > 1 ? "s" : ""}
											</ItemDescription>
										</ItemContent>
										<ItemActions className="shrink-0">
											<span className="text-foreground text-sm font-semibold tabular-nums">
												{formatEuro(product.revenue)}
											</span>
											{href && (
												<ChevronRight
													className="text-muted-foreground/60 size-4"
													aria-hidden="true"
												/>
											)}
										</ItemActions>
									</>
								);
								return (
									<Fade
										key={`${product.productId ?? "unknown"}-${rank}`}
										y={6}
										delay={index * 0.02}
										inView
										once
									>
										{index > 0 && <ItemSeparator />}
										{href ? (
											<Item asChild size="sm">
												<Link
													href={href}
													onClick={() => triggerHaptic("light")}
													aria-label={getAriaLabel(product, rank)}
													className="transform-gpu touch-manipulation active:scale-[0.99] motion-safe:transition-transform motion-safe:duration-150"
												>
													{inner}
												</Link>
											</Item>
										) : (
											<Item size="sm" aria-label={getAriaLabel(product, rank)}>
												{inner}
											</Item>
										)}
									</Fade>
								);
							})}
						</ItemGroup>
						<Link
							href="/admin/catalogue/produits"
							onClick={() => triggerHaptic("light")}
							className="text-muted-foreground hover:text-foreground inline-flex h-11 w-full touch-manipulation items-center justify-center gap-1.5 text-sm active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150"
						>
							Voir tous les produits
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
				<CardTitle className={CHART_STYLES.title}>Top produits</CardTitle>
				<CardDescription className="text-sm">{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{products.length === 0 ? (
					<p className="text-muted-foreground py-4 text-center text-sm">
						Aucune vente enregistrée sur la période
					</p>
				) : (
					<div className="space-y-3">
						{products.map((product, index) => {
							const rank = index + 1;
							const href = getRowHref(product);
							const productVtId = product.productId ?? `rank-${rank}`;
							const inner = (
								<>
									<span
										className="text-muted-foreground w-6 shrink-0 text-center text-sm font-semibold tabular-nums"
										aria-hidden="true"
									>
										#{rank}
									</span>
									<ProductThumb product={product} vtId={productVtId} />
									<div className="min-w-0 flex-1 gap-y-0.5">
										<p className="line-clamp-1 text-sm font-medium">{product.title}</p>
										<p className="text-muted-foreground text-xs">
											{product.unitsSold} vendue{product.unitsSold > 1 ? "s" : ""}
										</p>
									</div>
									<div className="text-right">
										<p className="font-bold tabular-nums">{formatEuro(product.revenue)}</p>
									</div>
								</>
							);
							const className =
								"flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors";
							const key = `${product.productId ?? "unknown"}-${rank}`;
							if (href) {
								return (
									<Fade key={key} y={6} delay={index * 0.04} inView once>
										<Link
											href={href}
											onClick={() => triggerHaptic("light")}
											aria-label={getAriaLabel(product, rank)}
											className={cn(className, "hover:bg-accent")}
										>
											{inner}
										</Link>
									</Fade>
								);
							}
							return (
								<Fade key={key} y={6} delay={index * 0.04} inView once>
									<div aria-label={getAriaLabel(product, rank)} className={className}>
										{inner}
									</div>
								</Fade>
							);
						})}
					</div>
				)}
			</CardContent>
			{products.length > 0 && (
				<CardFooter className="justify-center border-t pt-4">
					<Button asChild variant="ghost" size="sm" className="gap-1.5">
						<Link href="/admin/catalogue/produits">
							Voir tous les produits
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</Link>
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
