import { PageHeader } from "@/shared/components/page-header";
import { StockNotificationsDataTableSkeleton } from "@/modules/stock-notifications/components/admin/stock-notifications-data-table";

export default function NotificationsStockLoading() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Alertes stock"
			/>

			{/* Stats skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="rounded-lg border bg-card p-6">
						<div className="flex items-center justify-between">
							<div>
								<div className="h-4 w-20 bg-muted rounded animate-pulse" />
								<div className="h-8 w-12 bg-muted rounded animate-pulse mt-2" />
							</div>
							<div className="h-8 w-8 bg-muted rounded animate-pulse" />
						</div>
					</div>
				))}
			</div>

			{/* Toolbar skeleton */}
			<div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center sm:justify-between rounded-lg bg-card border border-border/60 mb-6 p-4 shadow-sm">
				<div className="h-10 w-full sm:max-w-md bg-muted rounded animate-pulse" />
				<div className="flex gap-3">
					<div className="h-10 w-40 bg-muted rounded animate-pulse" />
					<div className="h-10 w-40 bg-muted rounded animate-pulse" />
				</div>
			</div>

			{/* Table skeleton */}
			<StockNotificationsDataTableSkeleton />
		</>
	);
}
