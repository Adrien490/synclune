import { Suspense } from "react";
import { fetchInventoryKpis } from "../../data/get-inventory-kpis";
import { fetchNeverSoldProducts } from "../../data/get-never-sold";
import { fetchStockByColor, fetchStockByMaterial } from "../../data/get-stock-by-attribute";
import { InventoryKpis } from "./inventory-kpis";
import { NeverSoldProductsList } from "./never-sold-products-list";
import { StockByColorChart } from "./stock-by-color-chart";
import { StockByMaterialChart } from "./stock-by-material-chart";
import { KpisSkeleton, ChartSkeleton, ListSkeleton } from "../skeletons";

/**
 * Section Inventaire & Stock du dashboard
 */
export async function InventorySection() {
	// Creer les promises pour les donnees
	const inventoryKpisPromise = fetchInventoryKpis();
	const neverSoldPromise = fetchNeverSoldProducts(10);
	const stockByColorPromise = fetchStockByColor();
	const stockByMaterialPromise = fetchStockByMaterial();

	return (
		<div className="space-y-6">
			{/* KPIs Inventaire */}
			<Suspense fallback={<KpisSkeleton />}>
				<InventoryKpis kpisPromise={inventoryKpisPromise} />
			</Suspense>

			{/* Graphiques stock */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Suspense fallback={<ChartSkeleton />}>
					<StockByColorChart dataPromise={stockByColorPromise} />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<StockByMaterialChart dataPromise={stockByMaterialPromise} />
				</Suspense>
			</div>

			{/* Produits jamais vendus */}
			<Suspense fallback={<ListSkeleton />}>
				<NeverSoldProductsList dataPromise={neverSoldPromise} />
			</Suspense>
		</div>
	);
}
