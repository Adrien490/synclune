"use client";

import { Gem } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchMaterialsAdminAction } from "../../actions/quick-search-materials-admin";
import type { AdminQuickSearchMaterialItem } from "../../data/quick-search-materials-admin";

export const materialsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchMaterialItem> =
	{
		scope: "materials",
		placeholder: "Nom, slug…",
		ariaLabel: "Rechercher un matériau",
		minQueryLength: 2,
		search: (query) => quickSearchMaterialsAdminAction(query),
		getResultId: (m) => `admin-material-${m.id}`,
		getResultHref: (m) => `/admin/catalogue/materiaux?search=${encodeURIComponent(m.slug)}`,
		getResultLabel: (m) => m.name,
		renderResultItem: (m) => <MaterialCard material={m} />,
	};

function MaterialCard({ material }: { material: AdminQuickSearchMaterialItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Gem className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{material.name}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">{material.slug}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{material.skusCount} SKU</span>
				</div>
			</div>
			{!material.isActive && (
				<Badge variant="secondary" className="text-[10px]">
					Inactif
				</Badge>
			)}
		</>
	);
}
