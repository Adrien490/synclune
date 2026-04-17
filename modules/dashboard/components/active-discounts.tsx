"use client";

import { ArrowRight, ChevronRight, Tag, TriangleAlert } from "lucide-react";
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
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "@/shared/components/ui/item";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import type { GetActiveDiscountsReturn } from "@/modules/dashboard/data/get-active-discounts";
import { CHART_STYLES } from "../constants/chart-styles";

interface ActiveDiscountsProps {
	data: GetActiveDiscountsReturn;
}

function formatDiscountValue(type: string, value: number): string {
	if (type === "PERCENTAGE") return `-${value}%`;
	return `-${(value / 100).toFixed(0)} €`;
}

function isNearExpiry(endsAt: Date | null): boolean {
	if (!endsAt) return false;
	const daysLeft = (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
	return daysLeft <= 7;
}

function isNearSaturation(usageCount: number, maxUsageCount: number | null): boolean {
	if (!maxUsageCount) return false;
	return usageCount / maxUsageCount >= 0.8;
}

export function ActiveDiscounts({ data }: ActiveDiscountsProps) {
	const { discounts } = data;
	const isMobile = useIsMobile();

	if (discounts.length === 0) return null;

	if (isMobile) {
		return (
			<section className="space-y-3" aria-labelledby="active-discounts-mobile-title">
				<header>
					<h3 id="active-discounts-mobile-title" className="text-base font-semibold">
						Codes promo actifs
					</h3>
					<p className="text-muted-foreground text-xs">
						{discounts.length} code{discounts.length > 1 ? "s" : ""} actif
						{discounts.length > 1 ? "s" : ""}
					</p>
				</header>
				<ItemGroup aria-label="Codes promo actifs">
					{discounts.map((discount, index) => {
						const nearExpiry = isNearExpiry(discount.endsAt);
						const nearSaturation = isNearSaturation(discount.usageCount, discount.maxUsageCount);
						const hasWarning = nearExpiry || nearSaturation;

						return (
							<div key={discount.id}>
								{index > 0 && <ItemSeparator />}
								<Item size="sm">
									<ItemMedia variant="icon">
										<Tag className="text-muted-foreground h-4 w-4" aria-hidden="true" />
									</ItemMedia>
									<ItemContent>
										<ItemTitle className="gap-2">
											<code className="truncate text-sm font-semibold">{discount.code}</code>
											<Badge variant="outline" className="text-[10px]">
												{formatDiscountValue(discount.type, discount.value)}
											</Badge>
										</ItemTitle>
									</ItemContent>
									<ItemActions className="shrink-0">
										{hasWarning && (
											<TriangleAlert
												className="text-warning h-3.5 w-3.5"
												aria-label={nearExpiry ? "Expire bientôt" : "Presque saturé"}
											/>
										)}
										<span className="text-muted-foreground text-xs tabular-nums">
											{discount.usageCount}
											{discount.maxUsageCount ? `/${discount.maxUsageCount}` : ""}
										</span>
									</ItemActions>
								</Item>
							</div>
						);
					})}
					<ItemSeparator />
					<Item asChild size="sm">
						<Link href="/admin/marketing/discounts" className="text-primary text-sm font-medium">
							<ItemContent>
								<ItemTitle className="text-primary">Gérer les codes promo</ItemTitle>
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
				<CardTitle className={CHART_STYLES.title}>Codes promo actifs</CardTitle>
				<CardDescription className="text-sm">
					{discounts.length} code{discounts.length > 1 ? "s" : ""} actif
					{discounts.length > 1 ? "s" : ""}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{discounts.map((discount) => {
						const nearExpiry = isNearExpiry(discount.endsAt);
						const nearSaturation = isNearSaturation(discount.usageCount, discount.maxUsageCount);
						const hasWarning = nearExpiry || nearSaturation;

						return (
							<div key={discount.id} className="flex items-center justify-between gap-2">
								<div className="flex min-w-0 items-center gap-2">
									<Tag
										className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0"
										aria-hidden="true"
									/>
									<code className="truncate text-sm font-semibold">{discount.code}</code>
									<Badge variant="outline" className="text-xs">
										{formatDiscountValue(discount.type, discount.value)}
									</Badge>
								</div>

								<div className="flex flex-shrink-0 items-center gap-2">
									{hasWarning && (
										<TriangleAlert
											className="text-warning h-3.5 w-3.5"
											aria-label={nearExpiry ? "Expire bientôt" : "Presque saturé"}
										/>
									)}
									<span className="text-muted-foreground text-xs">
										{discount.usageCount}
										{discount.maxUsageCount ? `/${discount.maxUsageCount}` : ""}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
			<CardFooter className="justify-center border-t pt-4">
				<Button asChild variant="ghost" size="sm" className="gap-1.5">
					<Link href="/admin/marketing/discounts">
						Gérer les codes promo
						<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
