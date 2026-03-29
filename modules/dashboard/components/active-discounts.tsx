import { ArrowRight, Tag, TriangleAlert } from "lucide-react";
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

	if (discounts.length === 0) return null;

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
