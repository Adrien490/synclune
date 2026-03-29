"use client";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

interface DashboardListsTabsProps {
	ordersSlot: React.ReactNode;
	productsSlot: React.ReactNode;
	discountsSlot: React.ReactNode;
}

/**
 * On mobile: renders lists in tabs to reduce scroll depth
 * On desktop: renders the standard 3-column grid
 */
export function DashboardListsTabs({
	ordersSlot,
	productsSlot,
	discountsSlot,
}: DashboardListsTabsProps) {
	const isMobile = useIsMobile();

	if (!isMobile) {
		return (
			<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
				{ordersSlot}
				{productsSlot}
				{discountsSlot}
			</div>
		);
	}

	return (
		<Tabs defaultValue="orders" className="w-full">
			<TabsList className="w-full">
				<TabsTrigger value="orders" className="flex-1">
					Commandes
				</TabsTrigger>
				<TabsTrigger value="products" className="flex-1">
					Produits
				</TabsTrigger>
				<TabsTrigger value="discounts" className="flex-1">
					Promos
				</TabsTrigger>
			</TabsList>
			<TabsContent value="orders">{ordersSlot}</TabsContent>
			<TabsContent value="products">{productsSlot}</TabsContent>
			<TabsContent value="discounts">{discountsSlot}</TabsContent>
		</Tabs>
	);
}
