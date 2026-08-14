import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Suspense boundary de `/admin/ventes/facturation` (Server Component async qui
 * `await getInvoicingOverview()`). Titre connu → rendu via `PageHeader` réel,
 * seul le contenu charge.
 *
 * ⚠️ Miroir de `InvoicingOverviewSection`
 * (`modules/invoices/components/admin/invoicing-overview.tsx`) — à mettre à jour
 * avec lui. Structure réelle, dans l'ordre :
 *   1. `AnomaliesSection` (conditionnelle, pas de placeholder)
 *   2. « Factures » — grille `sm:grid-cols-2 lg:grid-cols-4`, 4 `CounterCard`
 *   3. « 30 derniers jours » — grille `sm:grid-cols-3`, **1** `CounterCard`
 *   4. « Export comptable » — `ExportComptableForm`
 *   5. « Dernières factures émises » — `InvoicesListTable` + note de bas de section
 *
 * Ce fichier décrivait auparavant l'UI e-reporting DGFiP, **retirée du code le
 * 2026-07-26** (right-sizing) : il réservait deux cartes fantômes (couverture
 * e-reporting + feature flags) et une grille `xl:grid-cols-6` de six compteurs là
 * où il n'y en a plus qu'un, et n'avait aucun placeholder pour le formulaire
 * d'export ni la table des factures. Audit « Système de feedback ».
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
				description="État des factures émises et des avoirs (Art. 286 / 289-I / L102 B)"
				className="hidden md:block"
			/>

			<div className="space-y-8">
				{/* Factures — 4 compteurs */}
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

				{/* 30 derniers jours — 1 seul compteur (CA encaissé TTC) */}
				<section className="space-y-4">
					<Skeleton className="h-6 w-40" shape="text" />
					<div className="grid gap-4 sm:grid-cols-3">
						<Card>
							<CardContent className="space-y-3 pt-6">
								<Skeleton className="h-8 w-28" />
								<Skeleton className="h-4 w-32" shape="text" />
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Export comptable — formulaire (2 dates + bouton) */}
				<section className="space-y-4">
					<Skeleton className="h-6 w-44" shape="text" />
					<Card>
						<CardContent className="space-y-4 pt-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<Skeleton className="h-10 w-full" shape="rounded" />
								<Skeleton className="h-10 w-full" shape="rounded" />
							</div>
							<Skeleton className="h-11 w-full sm:w-48" shape="rounded" />
						</CardContent>
					</Card>
				</section>

				{/* Dernières factures émises — table + note */}
				<section className="space-y-4">
					<Skeleton className="h-6 w-60" shape="text" />
					<Card>
						<CardContent className="space-y-3 pt-6">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" shape="text" />
							))}
						</CardContent>
					</Card>
					<Skeleton className="h-3 w-72 max-w-full" shape="text" />
				</section>
			</div>
		</div>
	);
}
