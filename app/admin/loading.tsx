import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for dashboard home page
 * Covers: KPIs, revenue chart, top products, orders status, recent orders, stock alerts
 */
export default function DashboardLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du tableau de bord"
		>
			<span className="sr-only">Chargement du tableau de bord...</span>

			{/* Page Header Skeleton */}
			<div className="mb-8 space-y-2">
				<Skeleton className="h-9 w-64 bg-muted/50" />
				<Skeleton className="h-5 w-96 bg-muted/30" />
			</div>

			<div className="space-y-6">
				{/* KPIs Grid */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i} className="relative overflow-hidden border-l-4 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-transparent">
							{/* Particule décorative */}
							<div className="absolute top-2 right-2 w-1 h-1 bg-secondary rounded-full opacity-40" aria-hidden="true" />
							<CardContent className="p-6">
								<div className="flex items-center justify-between space-x-4">
									<div className="space-y-2 flex-1">
										<Skeleton className="h-4 w-24 bg-muted/40" />
										<Skeleton className="h-8 w-32 bg-primary/20" />
										<Skeleton className="h-3 w-20 bg-muted/30" />
									</div>
									<Skeleton className="h-12 w-12 rounded-full bg-primary/15 border border-primary/20" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Charts Grid */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Revenue Chart - Full Width */}
					<Card className="lg:col-span-2 border-t-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-6 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<div className="space-y-3 pt-4">
									{/* Chart bars */}
									<div className="flex items-end justify-between gap-2 h-[280px]">
										{Array.from({ length: 12 }).map((_, i) => {
											// Use deterministic heights based on index for Cache Components compatibility
											const heights = [
												45, 68, 52, 87, 73, 91, 64, 78, 55, 82, 61, 76,
											];
											return (
												<div
													key={i}
													className="flex-1 flex flex-col justify-end items-center gap-2"
												>
													<Skeleton
														className="w-full bg-linear-to-t from-primary/30 to-primary/10 rounded-t"
														style={{
															height: `${heights[i]}%`,
														}}
													/>
													<Skeleton className="h-3 w-full bg-muted/30" />
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Top Products Chart */}
					<Card className="border-t-4 border-secondary/40 bg-gradient-to-br from-secondary/5 to-transparent">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-6 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<div className="space-y-3 pt-4">
									{/* Horizontal bars */}
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="space-y-2">
											<div className="flex items-center justify-between">
												<Skeleton className="h-4 w-32 bg-muted/40" />
												<Skeleton className="h-4 w-16 bg-muted/30" />
											</div>
											<Skeleton
												className="h-6 bg-linear-to-r from-primary/30 to-transparent rounded"
												style={{
													width: `${(5 - i) * 18 + 10}%`,
												}}
											/>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Orders Status Chart */}
					<Card className="border-t-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-6 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-56 bg-muted/30" />
								</div>
								<div className="flex items-center justify-center pt-4">
									{/* Donut chart */}
									<div className="relative">
										<Skeleton className="h-48 w-48 rounded-full bg-muted/30" />
										<div className="absolute inset-0 flex items-center justify-center">
											<Skeleton className="h-32 w-32 rounded-full bg-background" />
										</div>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3 pt-4">
									{Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="flex items-center gap-2">
											<Skeleton className="h-3 w-3 rounded-full bg-muted/40" />
											<Skeleton className="h-3 w-20 bg-muted/30" />
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Lists Grid */}
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Recent Orders */}
					<Card className="border-l-4 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-6 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<div className="space-y-3 pt-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<div
											key={i}
											className="flex items-center gap-4 p-3 rounded-lg bg-muted/10"
										>
											<Skeleton className="h-12 w-12 rounded-lg bg-muted/40 shrink-0" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-32 bg-muted/50" />
												<Skeleton className="h-3 w-24 bg-muted/30" />
											</div>
											<Skeleton className="h-6 w-20 rounded-full bg-muted/40" />
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Stock Alerts */}
					<Card className="border-l-4 border-secondary/40 bg-gradient-to-br from-secondary/5 to-transparent">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-6 w-48 bg-muted/50" />
									<Skeleton className="h-4 w-64 bg-muted/30" />
								</div>
								<div className="space-y-3 pt-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<div
											key={i}
											className="flex items-center gap-4 p-3 rounded-lg bg-destructive/5"
										>
											<Skeleton className="h-10 w-10 rounded-full bg-destructive/20 shrink-0" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-4 w-40 bg-muted/50" />
												<Skeleton className="h-3 w-28 bg-muted/30" />
											</div>
											<Skeleton className="h-8 w-12 rounded bg-muted/40" />
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
