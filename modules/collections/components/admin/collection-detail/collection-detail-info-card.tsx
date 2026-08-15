import { InfoIcon } from "@phosphor-icons/react/ssr";

import { collectionStatusLabel } from "@/modules/collections/constants/collection-status.constants";
import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";
import { CopyButton } from "@/shared/components/copy-button";
import { DescriptionCollapse } from "@/shared/components/description-collapse";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface CollectionDetailInfoCardProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailInfoCard({ collection }: CollectionDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "collection-edit-info" }}>
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
								variant={collection.active ? "default" : "secondary"}
								style={{ viewTransitionName: `collection-status-${collection.id}` }}
							>
								{collectionStatusLabel(collection.active)}
							</Badge>
						</dd>
					</div>
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Slug</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{collection.slug}
							</span>
							<CopyButton
								text={collection.slug}
								label="Slug"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
				</dl>

				{collection.description ? (
					<div className="space-y-2 border-t pt-4">
						<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							Description
						</h3>
						<DescriptionCollapse text={collection.description} />
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
