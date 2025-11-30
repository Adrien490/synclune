import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page d'accueil du dashboard
 * Structure: KPIs (5 cards) + Charts (3 charts) + Lists (2 lists)
 */
export default function DashboardHomeLoading() {
	return (
		<div className="space-y-6">
			{/* Page Header */}
			<PageHeader
				title="Tableau de bord"
				description="Vue d'ensemble de votre boutique en temps réel"
				variant="compact"
			/>

			{/* KPIs Section - 6 metric cards (cohérent avec DashboardKpis) */}
			<div
				role="status"
				aria-busy="true"
				aria-label="Chargement des indicateurs clés"
				className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
			>
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i} className="border-l-4 border-primary/40">
						<CardContent className="p-6">
							<div className="flex items-center justify-between space-x-4">
								<div className="space-y-2 flex-1">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-8 w-20" />
									<Skeleton className="h-3 w-24" />
								</div>
								<Skeleton className="h-10 w-10 rounded-full" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts Section - 2 columns grid */}
			<div
				role="status"
				aria-busy="true"
				aria-label="Chargement des graphiques"
				className="grid gap-6 lg:grid-cols-2"
			>
				{/* Revenue Chart - Full width on mobile, left column on desktop */}
				<Card className="lg:col-span-2 border-l-4 border-primary/30">
					<CardContent className="p-6">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-9 w-32" />
							</div>
							<Skeleton className="h-[300px] w-full rounded-md" />
						</div>
					</CardContent>
				</Card>

				{/* Top Products Chart */}
				<Card className="border-l-4 border-secondary/40">
					<CardContent className="p-6">
						<div className="space-y-4">
							<Skeleton className="h-6 w-36" />
							<Skeleton className="h-[250px] w-full rounded-md" />
						</div>
					</CardContent>
				</Card>

				{/* Orders Status Chart */}
				<Card className="border-l-4 border-primary/30">
					<CardContent className="p-6">
						<div className="space-y-4">
							<Skeleton className="h-6 w-44" />
							<Skeleton className="h-[250px] w-full rounded-md" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Lists Section - 2 columns grid */}
			<div
				role="status"
				aria-busy="true"
				aria-label="Chargement des listes"
				className="grid gap-6 lg:grid-cols-2"
			>
				{/* Recent Orders List */}
				<Card className="border-l-4 border-primary/40">
					<CardContent className="p-6">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-9 w-28" />
							</div>
							{/* List items */}
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center justify-between py-2">
										<div className="space-y-2 flex-1">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-48" />
										</div>
										<Skeleton className="h-8 w-20" />
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Stock Alerts List */}
				<Card className="border-l-4 border-primary/40">
					<CardContent className="p-6">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-9 w-28" />
							</div>
							{/* Alert items */}
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center gap-4 py-2">
										<Skeleton className="h-12 w-12 rounded-md" />
										<div className="space-y-2 flex-1">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-3 w-32" />
										</div>
										<Skeleton className="h-6 w-16" />
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
