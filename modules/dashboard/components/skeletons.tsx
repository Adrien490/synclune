import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CHART_STYLES } from "../constants/chart-styles";

interface KpisSkeletonProps {
	/** Nombre de cartes KPI a afficher */
	count?: 2 | 4 | 6;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton individuel pour une KPI Card
 * Reproduit exactement la structure de KpiCard pour eviter le CLS
 */
function KpiCardSkeleton() {
	return (
		<Card className={`${CHART_STYLES.card} min-h-[140px]`}>
			{/* Header avec titre et icone */}
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24" /> {/* Titre */}
				<Skeleton className="h-8 w-8 rounded-full" /> {/* Icone */}
			</CardHeader>
			{/* Contenu avec valeur et evolution */}
			<CardContent>
				<Skeleton className="h-9 w-32 mb-2" /> {/* Valeur (text-3xl) */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-12" /> {/* Evolution % */}
					<Skeleton className="h-5 w-16 rounded-full" /> {/* Badge optionnel */}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton pour les grilles de cartes KPI
 * Reutilisable dans toutes les sections du dashboard
 */
export function KpisSkeleton({
	count = 4,
	ariaLabel = "Chargement des indicateurs",
}: KpisSkeletonProps) {
	const gridCols =
		count === 2 ? "lg:grid-cols-2" : count === 6 ? "lg:grid-cols-3" : "lg:grid-cols-4";

	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={ariaLabel}
			className={`grid ${CHART_STYLES.spacing.kpiGap} md:grid-cols-2 ${gridCols}`}
		>
			{[...Array(count)].map((_, i) => (
				<KpiCardSkeleton key={i} />
			))}
		</div>
	);
}

interface ChartSkeletonProps {
	/** Hauteur du graphique */
	height?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les graphiques
 * Reproduit la structure CardHeader + CardContent des charts reels
 */
export function ChartSkeleton({
	height = 250,
	ariaLabel = "Chargement du graphique",
}: ChartSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<Skeleton className="h-6 w-48 mb-1" /> {/* Titre */}
					<Skeleton className="h-4 w-64" /> {/* Description */}
				</CardHeader>
				<CardContent>
					{/* Simulation des axes du chart */}
					<div className="relative" style={{ height: `${height}px` }}>
						{/* Axe Y (gauche) */}
						<div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-10" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-10" />
						</div>
						{/* Zone du graphique */}
						<Skeleton className="absolute left-14 right-0 top-0 bottom-8 rounded" />
						{/* Axe X (bas) */}
						<div className="absolute bottom-0 left-14 right-0 flex justify-between">
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface ListSkeletonProps {
	/** Nombre d'elements dans la liste */
	itemCount?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les listes (commandes recentes, alertes stock, etc.)
 */
export function ListSkeleton({
	itemCount = 5,
	ariaLabel = "Chargement de la liste",
}: ListSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<Skeleton className="h-6 w-48 mb-1" /> {/* Titre */}
					<Skeleton className="h-4 w-64" /> {/* Description */}
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[...Array(itemCount)].map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-3 rounded-lg border"
							>
								<div className="flex items-center gap-3 flex-1">
									<Skeleton className="h-5 w-5 rounded" /> {/* Icone */}
									<div className="space-y-1 flex-1">
										<Skeleton className="h-4 w-32" /> {/* Titre produit */}
										<Skeleton className="h-3 w-24" /> {/* Sous-titre */}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Skeleton className="h-5 w-16 rounded-full" /> {/* Badge */}
									<Skeleton className="h-4 w-8" /> {/* Valeur */}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Skeleton pour un accordeon de section (Overview)
 * Reproduit la structure AccordionItem avec trigger et content
 */
export function AccordionSectionSkeleton() {
	return (
		<div className="border rounded-lg bg-card shadow-sm overflow-hidden">
			{/* Trigger de l'accordeon */}
			<div className="flex items-center gap-3 px-4 py-3">
				<Skeleton className="w-9 h-9 rounded-lg" /> {/* Icone */}
				<div className="flex-1">
					<Skeleton className="h-5 w-32 mb-1" /> {/* Titre */}
					<Skeleton className="h-3 w-48" /> {/* Description */}
				</div>
				<Skeleton className="h-4 w-4" /> {/* Chevron */}
			</div>
		</div>
	);
}

/**
 * Skeleton pour la section Overview du dashboard
 * Structure: 4 KPIs + grid(TopProducts + 2+2 KPIs) + TrendsChart
 */
export function OverviewSectionSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la vue d'ensemble"
		>
			{/* 4 KPIs Performance */}
			<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de performance" />

			{/* Grid: TopProducts (gauche) + 2+2 KPIs (droite) */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ChartSkeleton height={300} ariaLabel="Chargement des top produits" />
				<div className="space-y-4">
					<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs d'operations" />
					<KpisSkeleton count={2} ariaLabel="Chargement des indicateurs de stock" />
				</div>
			</div>

			{/* Trends Chart */}
			<ChartSkeleton height={300} ariaLabel="Chargement des tendances" />
		</div>
	);
}

/**
 * Skeleton pour la section Sales du dashboard
 * Structure: 4 KPIs + grid(2 charts) + grid(2 charts)
 */
export function SalesSectionSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la section ventes"
		>
			{/* 4 KPIs Ventes */}
			<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de ventes" />

			{/* Grid: Abandon + Promos */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ChartSkeleton ariaLabel="Chargement du taux d'abandon" />
				<ChartSkeleton ariaLabel="Chargement des stats promos" />
			</div>

			{/* Grid: Revenue charts */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ChartSkeleton ariaLabel="Chargement des revenus par collection" />
				<ChartSkeleton ariaLabel="Chargement des revenus par type" />
			</div>
		</div>
	);
}

/**
 * Skeleton pour la section Inventory du dashboard
 * Structure: 4 KPIs + grid(2 charts) + list
 */
export function InventorySectionSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la section inventaire"
		>
			{/* 4 KPIs Inventaire */}
			<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs d'inventaire" />

			{/* Grid: Stock charts */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ChartSkeleton ariaLabel="Chargement du stock par couleur" />
				<ChartSkeleton ariaLabel="Chargement du stock par materiau" />
			</div>

			{/* Liste produits jamais vendus */}
			<ListSkeleton ariaLabel="Chargement des produits jamais vendus" />
		</div>
	);
}

/**
 * Skeleton pour la section Customers du dashboard
 * Structure: 4 KPIs + grid(2 charts)
 */
export function CustomersSectionSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la section clients"
		>
			{/* 4 KPIs Clients */}
			<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs clients" />

			{/* Grid: Repeat vs New + Top Customers */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ChartSkeleton ariaLabel="Chargement de la repartition clients" />
				<ChartSkeleton ariaLabel="Chargement des meilleurs clients" />
			</div>
		</div>
	);
}
