"use client";

import { FolderOpenIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface ProductDetailCollectionsCardProps {
	collections: GetProductReturn["collections"];
}

export function ProductDetailCollectionsCard({ collections }: ProductDetailCollectionsCardProps) {
	const haptic = useHaptic();
	return (
		<Card style={{ viewTransitionName: "product-detail-collections" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FolderOpenIcon className="size-5" aria-hidden="true" />
					Collections
				</CardTitle>
			</CardHeader>
			<CardContent>
				{collections.length === 0 ? (
					<p className="text-muted-foreground text-sm italic">
						Ce produit n'appartient à aucune collection
					</p>
				) : (
					<ul className="-mx-2 space-y-1" aria-label={`${collections.length} collection(s)`}>
						{collections.map((entry) => (
							<li key={entry.collection.id}>
								<Link
									href={`/admin/catalogue/collections/${entry.collection.slug}`}
									onClick={() => haptic("light")}
									className="hover:bg-muted/40 hover:text-primary active:bg-muted/60 focus-visible:ring-ring flex touch-manipulation items-center justify-between gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
								>
									<span className="min-w-0 truncate">{entry.collection.name}</span>
									{entry.isFeatured ? (
										<Badge variant="default" className="shrink-0">
											<StarIcon className="size-3" aria-hidden="true" />À la une
										</Badge>
									) : null}
								</Link>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
