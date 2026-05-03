"use client";

import { Star } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import type { AdminQuickSearchAdapter } from "@/shared/components/sticky-action-bar";

import { quickSearchReviewsAdminAction } from "../../actions/quick-search-reviews-admin";
import type { AdminQuickSearchReviewItem } from "../../data/quick-search-reviews-admin";

export const reviewsAdminQuickSearchAdapter: AdminQuickSearchAdapter<AdminQuickSearchReviewItem> = {
	scope: "reviews",
	placeholder: "Client, produit, contenu…",
	ariaLabel: "Rechercher un avis",
	minQueryLength: 2,
	search: (query) => quickSearchReviewsAdminAction(query),
	getResultId: (r) => `admin-review-${r.id}`,
	// Pas de page détail dédiée — filtrer la liste sur l'email/produit pour ouvrir le drawer.
	getResultHref: (r) =>
		`/admin/marketing/avis?search=${encodeURIComponent(r.customerEmail ?? r.productTitle)}`,
	getResultLabel: (r) => r.title ?? `Avis ${r.rating}/5 — ${r.productTitle}`,
	renderResultItem: (r) => <ReviewCard review={r} />,
};

function ReviewCard({ review }: { review: AdminQuickSearchReviewItem }) {
	return (
		<>
			<div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
				<Star className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">
					{review.title ?? `${review.rating}/5 — ${review.productTitle}`}
				</p>
				<p className="text-muted-foreground truncate text-xs">
					{review.customerName ?? review.customerEmail ?? "Client"} · {review.productTitle}
				</p>
			</div>
			<Badge
				variant={review.status === "PUBLISHED" ? "success" : "secondary"}
				className="text-[10px]"
			>
				{review.status === "PUBLISHED" ? "Publié" : "Masqué"}
			</Badge>
		</>
	);
}
