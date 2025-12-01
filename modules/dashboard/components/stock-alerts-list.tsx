"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import type { GetDashboardStockAlertsReturn, StockAlertItem } from "@/modules/dashboard/data/get-stock-alerts";
import { AlertTriangle, PackageX } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { CHART_STYLES } from "../constants/chart-styles";

interface StockAlertsListProps {
	alertsPromise: Promise<GetDashboardStockAlertsReturn>;
}

export function StockAlertsList({ alertsPromise }: StockAlertsListProps) {
	const { alerts } = use(alertsPromise);

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Alertes stock</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Bijoux en rupture ou en faible stock
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{alerts.map((alert: StockAlertItem) => (
						<Link
							key={alert.skuId}
							href={` /dashboard/product-skus/${alert.skuId}`}
							className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
						>
							<div className="flex items-center gap-3 flex-1">
								{alert.alertType === "out_of_stock" ? (
									<PackageX className="h-5 w-5 text-destructive" />
								) : (
									<AlertTriangle className="h-5 w-5 text-orange-500" />
								)}
								<div className="space-y-1 flex-1">
									<p className="font-medium text-sm">{alert.productTitle}</p>
									<p className="text-xs text-muted-foreground">
										Variante: {alert.sku}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Badge
									variant={
										alert.alertType === "out_of_stock"
											? "destructive"
											: "outline"
									}
								>
									{alert.alertType === "out_of_stock"
										? "Rupture"
										: "Faible stock"}
								</Badge>
								<span className="text-sm font-bold min-w-[3ch] text-right">
									{alert.inventory}
								</span>
							</div>
						</Link>
					))}
					{alerts.length === 0 && (
						<p className="text-sm text-muted-foreground text-center py-4">
							Aucune alerte stock
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
