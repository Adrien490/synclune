import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Suspense boundary de `/admin/ventes/facturation/batches/[id]` (Server Component
 * async qui `await getEReportingBatchById(id)`). Miroir de la page : en-tête +
 * ligne statut/retry + 4 KPIs + carte transmission + table transactions.
 * L'id du batch n'étant pas connu au niveau loading, on utilise le skeleton d'en-tête.
 */
export default function BatchDetailLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du batch e-reporting"
			className="space-y-6"
		>
			<span className="sr-only">Chargement du batch e-reporting…</span>

			{/* Breadcrumb desktop (placeholder) */}
			<Skeleton className="hidden h-4 w-64 md:block" shape="text" />

			<PageHeaderSkeleton variant="compact" />

			{/* Ligne statut + retry count */}
			<div className="flex flex-wrap items-center gap-2">
				<Skeleton className="h-6 w-24 rounded-full" />
				<Skeleton className="h-4 w-28" shape="text" />
			</div>

			{/* 4 KPIs */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-24" shape="text" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-20" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Carte transmission */}
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-40" shape="text" />
				</CardHeader>
				<CardContent className="space-y-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="grid grid-cols-2 gap-3">
							<Skeleton className="h-4 w-32" shape="text" />
							<Skeleton className="h-4 w-40" shape="text" />
						</div>
					))}
				</CardContent>
			</Card>

			{/* Table transactions */}
			<section className="space-y-4">
				<Skeleton className="h-6 w-56" shape="text" />
				<div className="border-border rounded-md border">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="border-border/60 flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
						>
							<Skeleton className="h-5 w-16 rounded-full" />
							<Skeleton className="h-4 w-20" shape="text" />
							<Skeleton className="h-4 w-24" shape="text" />
							<Skeleton className="h-4 w-28" shape="text" />
							<Skeleton className="ml-auto h-4 w-16" shape="text" />
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
