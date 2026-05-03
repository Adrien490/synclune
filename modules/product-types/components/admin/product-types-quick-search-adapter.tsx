"use client";

import { Boxes } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchProductTypesAdminAction } from "../../actions/quick-search-product-types-admin";
import type { AdminQuickSearchProductTypeItem } from "../../data/quick-search-product-types-admin";

export const productTypesAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchProductTypeItem> =
	{
		scope: "product-types",
		placeholder: "Label, slug…",
		ariaLabel: "Rechercher un type de produit",
		minQueryLength: 2,
		search: (query) => quickSearchProductTypesAdminAction(query),
		getResultId: (t) => `admin-product-type-${t.id}`,
		getResultHref: (t) => `/admin/catalogue/types-de-produits?search=${encodeURIComponent(t.slug)}`,
		getResultLabel: (t) => t.label,
		renderResultItem: (t) => <ProductTypeCard type={t} />,
	};

function ProductTypeCard({ type }: { type: AdminQuickSearchProductTypeItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Boxes className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{type.label}</p>
				<div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
					<span className="truncate">{type.slug}</span>
					<span aria-hidden="true">·</span>
					<span className="shrink-0">{type.productCount} produits</span>
				</div>
			</div>
			{type.isSystem && (
				<Badge variant="outline" className="text-[10px]">
					Système
				</Badge>
			)}
			{!type.isActive && (
				<Badge variant="secondary" className="text-[10px]">
					Inactif
				</Badge>
			)}
		</>
	);
}
