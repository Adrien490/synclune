import { Suspense } from "react";
import { fetchInventoryKpis } from "../../data/get-inventory-kpis";
import { fetchNeverSoldProducts } from "../../data/get-never-sold";
import { getStockByColor, getStockByMaterial } from "../../data/get-stock-by-attribute";
import { InventoryKpis } from "./inventory-kpis";
import { NeverSoldProductsList } from "./never-sold-products-list";
import { StockByColorChart } from "./stock-by-color-chart";
import { StockByMaterialChart } from "./stock-by-material-chart";
import { KpisSkeleton, ChartSkeleton, ListSkeleton } from "../skeletons";
import { DashboardErrorBoundary } from "../dashboard-error-boundary";
import { ChartError } from "../chart-error";

/**
 * Section Inventaire & Stock du dashboard
 */
export async function InventorySection() {
	// Creer les promises pour les donnees
	const inventoryKpisPromise = fetchInventoryKpis();
	const neverSoldPromise = fetchNeverSoldProducts(10);
	const stockByColorPromise = getStockByColor();
	const stockByMaterialPromise = getStockByMaterial();

	return (
		<div className="space-y-6">
			{/* KPIs Inventaire */}
			<DashboardErrorBoundary
				fallback={<ChartError title="Erreur" description="Impossible de charger les indicateurs d'inventaire" minHeight={140} />}
			>
				<Suspense fallback={<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs d'inventaire" />}>
					<InventoryKpis kpisPromise={inventoryKpisPromise} />
				</Suspense>
			</DashboardErrorBoundary>

			{/* Graphiques stock */}
			<div className="grid gap-6 md:grid-cols-2">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger le stock par couleur" />}
				>
					<Suspense fallback={<ChartSkeleton />}>
						<StockByColorChart chartDataPromise={stockByColorPromise} />
					</Suspense>
				</DashboardErrorBoundary>

				{/* Cacher sur mobile */}
				<div className="hidden md:block">
					<DashboardErrorBoundary
						fallback={<ChartError title="Erreur" description="Impossible de charger le stock par materiau" />}
					>
						<Suspense fallback={<ChartSkeleton />}>
							<StockByMaterialChart chartDataPromise={stockByMaterialPromise} />
						</Suspense>
					</DashboardErrorBoundary>
				</div>
			</div>

			{/* Produits jamais vendus - Cacher sur mobile */}
			<div className="hidden md:block">
				<DashboardErrorBoundary
					fallback={<ChartError title="Erreur" description="Impossible de charger les produits jamais vendus" />}
				>
					<Suspense fallback={<ListSkeleton />}>
						<NeverSoldProductsList listDataPromise={neverSoldPromise} />
					</Suspense>
				</DashboardErrorBoundary>
			</div>
		</div>
	);
}
