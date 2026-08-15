import { InfoIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { VariantDetailReturn } from "@/modules/variants/data/get-variant";

interface VariantDetailInfoCardProps {
	variant: VariantDetailReturn;
}

export function VariantDetailInfoCard({ variant }: VariantDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "variant-edit-variant" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<InfoIcon className="size-5" aria-hidden="true" />
					Attributs
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge variant={variant.active ? "default" : "outline"}>
								{variant.active ? "Active" : "Inactive"}
							</Badge>
						</dd>
					</div>
					{variant.isRepresentative ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Variante par défaut</dt>
							<dd>
								<Badge variant="secondary">
									<StarIcon className="size-3" aria-hidden="true" />
									Oui
								</Badge>
							</dd>
						</div>
					) : null}
					{variant.color ? (
						<div className="flex items-start justify-between gap-3">
							<dt className="text-muted-foreground pt-0.5">Couleur</dt>
							<dd className="flex flex-wrap items-center justify-end gap-2">
								<Link
									href={`/admin/catalogue/couleurs/${variant.color.id}`}
									className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
								>
									{variant.color.hex ? (
										<span
											className="border-border size-3 shrink-0 rounded-full border"
											style={{ backgroundColor: variant.color.hex }}
											aria-hidden="true"
										/>
									) : null}
									{variant.color.name}
								</Link>
							</dd>
						</div>
					) : null}
					{variant.material ? (
						<div className="flex items-start justify-between gap-3">
							<dt className="text-muted-foreground pt-0.5">Matériau</dt>
							<dd className="flex flex-wrap items-center justify-end gap-2">
								<Link
									href={`/admin/catalogue/materiaux/${variant.material.id}`}
									className="hover:text-primary focus-visible:ring-ring rounded-md px-1 py-0.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
								>
									{variant.material.name}
								</Link>
							</dd>
						</div>
					) : null}
					{variant.size ? (
						<div className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">Taille</dt>
							<dd className="font-medium">{variant.size}</dd>
						</div>
					) : null}
				</dl>

				{variant.isRepresentative ? (
					<p className="text-muted-foreground border-t pt-4 text-xs italic">
						Cette variante est affichée par défaut sur la fiche produit.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
