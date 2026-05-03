"use client";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchColorsAdminAction } from "../../actions/quick-search-colors-admin";
import type { AdminQuickSearchColorItem } from "../../data/quick-search-colors-admin";

export const colorsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchColorItem> = {
	scope: "colors",
	placeholder: "Nom, slug, hex…",
	ariaLabel: "Rechercher une couleur",
	minQueryLength: 2,
	search: (query) => quickSearchColorsAdminAction(query),
	getResultId: (c) => `admin-color-${c.id}`,
	getResultHref: (c) => `/admin/catalogue/couleurs?search=${encodeURIComponent(c.slug)}`,
	getResultLabel: (c) => c.name,
	renderResultItem: (c) => <ColorCard color={c} />,
};

function ColorCard({ color }: { color: AdminQuickSearchColorItem }) {
	return (
		<>
			<div
				className="border-border size-12 shrink-0 rounded-lg border"
				style={{ backgroundColor: color.hex }}
				aria-hidden="true"
			/>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{color.name}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">{color.slug}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{color.skusCount} SKU</span>
				</div>
			</div>
			{!color.isActive && (
				<Badge variant="secondary" className="text-[10px]">
					Inactif
				</Badge>
			)}
		</>
	);
}
