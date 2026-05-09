import { Info, Lock } from "lucide-react";

import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";
import { CopyButton } from "@/shared/components/copy-button";
import { DescriptionCollapse } from "@/shared/components/description-collapse";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ProductTypeDetailInfoCardProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailInfoCard({ productType }: ProductTypeDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "product-type-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Info className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge
								variant={productType.isActive ? "default" : "secondary"}
								style={{ viewTransitionName: `product-type-status-${productType.id}` }}
							>
								{productType.isActive ? "Actif" : "Inactif"}
							</Badge>
						</dd>
					</div>
					{productType.isSystem ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Type</dt>
							<dd>
								<Badge variant="outline">
									<Lock className="size-3" aria-hidden="true" />
									Système (protégé)
								</Badge>
							</dd>
						</div>
					) : null}
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Slug</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{productType.slug}
							</span>
							<CopyButton
								text={productType.slug}
								label="Slug"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
				</dl>

				{productType.description ? (
					<div className="space-y-2 border-t pt-4">
						<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							Description
						</h3>
						<DescriptionCollapse text={productType.description} />
					</div>
				) : (
					<p className="text-muted-foreground border-t pt-4 text-sm italic">
						Aucune description renseignée
					</p>
				)}

				{productType.isSystem ? (
					<p className="border-muted bg-muted/30 text-muted-foreground rounded-md border p-3 text-xs">
						Ce type est protégé du seed et ne peut pas être supprimé ni modifié.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
