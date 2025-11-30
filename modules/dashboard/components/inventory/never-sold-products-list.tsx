"use client";

import { use } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ExternalLink, Package } from "lucide-react";
import type { GetNeverSoldProductsReturn } from "../../types/dashboard.types";

interface NeverSoldProductsListProps {
	dataPromise: Promise<GetNeverSoldProductsReturn>;
}

/**
 * Liste des produits jamais vendus
 */
export function NeverSoldProductsList({
	dataPromise,
}: NeverSoldProductsListProps) {
	const data = use(dataPromise);

	if (data.products.length === 0) {
		return (
			<Card className="border-l-4 border-green-500/50">
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<Package className="h-5 w-5" />
						Produits jamais vendus
					</CardTitle>
					<CardDescription>
						Tous vos produits ont ete vendus au moins une fois
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="border-l-4 border-orange-500/50">
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<Package className="h-5 w-5" />
					Produits jamais vendus
				</CardTitle>
				<CardDescription>
					{data.totalCount} produit{data.totalCount > 1 ? "s" : ""} sans aucune vente
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{data.products.map((product) => (
						<div
							key={product.productId}
							className="flex items-center justify-between py-2 border-b last:border-0"
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-medium truncate">
										{product.title}
									</span>
									<Badge variant="outline" className="text-xs">
										{product.skuCount} variante{product.skuCount > 1 ? "s" : ""}
									</Badge>
								</div>
								<div className="text-sm text-muted-foreground mt-1">
									Cree{" "}
									{formatDistanceToNow(new Date(product.createdAt), {
										addSuffix: true,
										locale: fr,
									})}
									{" • "}
									{product.totalInventory} en stock
									{" • "}
									{(product.totalValue / 100).toFixed(2)} € de valeur
								</div>
							</div>
							<Button variant="ghost" size="sm" asChild>
								<Link href={`/admin/catalogue/produits/${product.slug}`}>
									<ExternalLink className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					))}
				</div>

				{data.totalCount > data.products.length && (
					<div className="mt-4 text-center">
						<Button variant="outline" size="sm" asChild>
							<Link href="/admin/catalogue/produits?filter_sold=never">
								Voir tous les {data.totalCount} produits
							</Link>
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
