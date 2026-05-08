import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";

import { CollectionDetailHeader } from "./collection-detail-header";
import { CollectionDetailInfoCard } from "./collection-detail-info-card";
import { CollectionDetailProductsCard } from "./collection-detail-products-card";
import { CollectionDetailStatsCard } from "./collection-detail-stats-card";
import { CollectionDetailStorefrontLinkCard } from "./collection-detail-storefront-link-card";

interface CollectionDetailPageProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailPage({ collection }: CollectionDetailPageProps) {
	return (
		<div className="space-y-6">
			<CollectionDetailHeader collection={collection} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<CollectionDetailInfoCard collection={collection} />
					<CollectionDetailProductsCard collection={collection} />
				</div>

				<div className="space-y-6">
					<CollectionDetailStorefrontLinkCard slug={collection.slug} status={collection.status} />
					<CollectionDetailStatsCard collection={collection} />
				</div>
			</div>
		</div>
	);
}
