import { InfoIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { CopyButton } from "@/shared/components/copy-button";
import { DescriptionCollapse } from "@/shared/components/description-collapse";
import type { GetProductReturn } from "@/modules/products/types/product.types";

import { productStatusConfig } from "./product-detail-status.constants";

interface ProductDetailInfoCardProps {
	product: GetProductReturn;
}

export function ProductDetailInfoCard({ product }: ProductDetailInfoCardProps) {
	const status = productStatusConfig(product.active);

	return (
		<Card style={{ viewTransitionName: "product-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<InfoIcon className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge
								variant={status.variant}
								style={{ viewTransitionName: `product-status-${product.id}` }}
							>
								{status.label}
							</Badge>
						</dd>
					</div>
					{product.type ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Type</dt>
							<dd className="font-medium">{product.type.label}</dd>
						</div>
					) : null}
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Slug</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{product.slug}
							</span>
							<CopyButton
								text={product.slug}
								label="Slug"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
				</dl>

				{product.description ? (
					<div className="space-y-2 border-t pt-4">
						<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							Description
						</h3>
						<DescriptionCollapse text={product.description} />
					</div>
				) : (
					<p className="text-muted-foreground border-t pt-4 text-sm italic">
						Aucune description renseignée
					</p>
				)}
			</CardContent>
		</Card>
	);
}
