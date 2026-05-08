import { Info, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { CopyButton } from "@/shared/components/copy-button";
import type { SkuDetailReturn } from "@/modules/skus/data/get-sku";

interface SkuDetailInfoCardProps {
	sku: SkuDetailReturn;
}

export function SkuDetailInfoCard({ sku }: SkuDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "sku-attributes" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Info className="size-5" aria-hidden="true" />
					Attributs
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Référence</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{sku.sku}
							</span>
							<CopyButton
								text={sku.sku}
								label="Référence SKU"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge variant={sku.isActive ? "default" : "outline"}>
								{sku.isActive ? "Active" : "Inactive"}
							</Badge>
						</dd>
					</div>
					{sku.isDefault ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Variante par défaut</dt>
							<dd>
								<Badge variant="secondary">
									<Star className="size-3" aria-hidden="true" />
									Oui
								</Badge>
							</dd>
						</div>
					) : null}
					{sku.color ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Couleur</dt>
							<dd>
								<Link
									href={`/admin/catalogue/couleurs/${sku.color.slug}`}
									className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
								>
									<span
										className="border-border size-3 shrink-0 rounded-full border"
										style={{ backgroundColor: sku.color.hex }}
										aria-hidden="true"
									/>
									{sku.color.name}
								</Link>
							</dd>
						</div>
					) : null}
					{sku.material ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Matériau</dt>
							<dd>
								<Link
									href={`/admin/catalogue/materiaux/${sku.material.slug}`}
									className="hover:text-primary focus-visible:ring-ring rounded-md px-1 py-0.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
								>
									{sku.material.name}
								</Link>
							</dd>
						</div>
					) : null}
					{sku.size ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Taille</dt>
							<dd className="font-medium">{sku.size}</dd>
						</div>
					) : null}
				</dl>

				{sku.isDefault ? (
					<p className="text-muted-foreground border-t pt-4 text-xs italic">
						Cette variante est affichée par défaut sur la fiche produit.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
