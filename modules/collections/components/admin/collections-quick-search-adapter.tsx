"use client";

import { Layers } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchCollectionsAdminAction } from "../../actions/quick-search-collections-admin";
import type { AdminQuickSearchCollectionItem } from "../../data/quick-search-collections-admin";

export const collectionsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchCollectionItem> =
	{
		scope: "collections",
		placeholder: "Nom, slug, description…",
		ariaLabel: "Rechercher une collection",
		minQueryLength: 2,
		search: (query) => quickSearchCollectionsAdminAction(query),
		getResultId: (c) => `admin-collection-${c.id}`,
		getResultHref: (c) => `/admin/catalogue/collections/${c.slug}`,
		getResultLabel: (c) => c.name,
		renderResultItem: (c) => <CollectionCard collection={c} />,
	};

function CollectionCard({ collection }: { collection: AdminQuickSearchCollectionItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Layers className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{collection.name}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">{collection.slug}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{collection.productCount} produits</span>
				</div>
			</div>
			<Badge
				variant={collection.status === "PUBLIC" ? "default" : "secondary"}
				className="text-[10px]"
			>
				{collection.status === "PUBLIC" ? "Publique" : "Brouillon"}
			</Badge>
		</>
	);
}
