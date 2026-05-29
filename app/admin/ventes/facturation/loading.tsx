import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Suspense boundary de `/admin/ventes/facturation` (Server Component async qui
 * `await getInvoicingOverview()`). Miroir de `InvoicingOverviewSection` :
 * carte couverture e-reporting + flags + 2 grilles de compteurs (factures ×4,
 * e-reporting ×6). Titre connu → rendu via `PageHeader` (seul le contenu charge).
 */
export default function FacturationAdminLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la facturation"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de la facturation…</span>

			{/* Breadcrumb desktop (placeholder) */}
			<Skeleton className="hidden h-4 w-48 md:block" shape="text" />

			<PageHeader
				variant="compact"
				title="Facturation électronique"
				description="État des factures émises + e-reporting DGFiP (Art. 286 / 289-I / L102 B)"
				className="hidden md:block"
			/>

			<div className="space-y-8">
				{/* Carte couverture e-reporting */}
				<Card>
					<CardHeader className="gap-2">
						<Skeleton className="h-5 w-56" shape="text" />
						<Skeleton className="h-4 w-72" shape="text" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-2.5 w-full rounded-full" />
					</CardContent>
				</Card>

				{/* Carte feature flags */}
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-40" shape="text" />
					</CardHeader>
					<CardContent className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-4 w-full max-w-md" shape="text" />
						))}
					</CardContent>
				</Card>

				{/* Compteurs factures (×4) */}
				<section className="space-y-4">
					<Skeleton className="h-6 w-28" shape="text" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i}>
								<CardContent className="space-y-3 pt-6">
									<Skeleton className="size-5" />
									<Skeleton className="h-8 w-16" />
									<Skeleton className="h-4 w-24" shape="text" />
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				{/* Compteurs e-reporting (×6) */}
				<section className="space-y-4">
					<Skeleton className="h-6 w-40" shape="text" />
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i}>
								<CardContent className="space-y-2 pt-4">
									<Skeleton className="size-4" />
									<Skeleton className="h-6 w-12" />
									<Skeleton className="h-3 w-16" shape="text" />
								</CardContent>
							</Card>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
