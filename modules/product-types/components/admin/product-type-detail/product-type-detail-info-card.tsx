import { InfoIcon } from "@phosphor-icons/react/ssr";

import type { ProductTypeDetailReturn } from "@/modules/product-types/data/get-product-type";
import { CopyButton } from "@/shared/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ProductTypeDetailInfoCardProps {
	productType: ProductTypeDetailReturn;
}

export function ProductTypeDetailInfoCard({ productType }: ProductTypeDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "product-type-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<InfoIcon className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Label</dt>
						<dd className="text-foreground/80">{productType.label}</dd>
					</div>
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
			</CardContent>
		</Card>
	);
}
