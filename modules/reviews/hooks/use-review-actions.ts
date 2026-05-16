"use client";

import { ExternalLink, Eye, EyeOff } from "lucide-react";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useBulkSelectionActionItem } from "@/shared/hooks/use-bulk-selection-action-item";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { TOGGLE_REVIEW_STATUS_DIALOG_ID } from "../components/admin/toggle-review-status-alert-dialog";
import { REVIEW_ANONYMOUS_AUTHOR_LABEL } from "../constants/review.constants";
import type { ReviewAdmin } from "../types/review.types";

interface UseReviewActionsParams {
	review: Pick<ReviewAdmin, "id" | "status" | "user" | "product">;
}

export function useReviewActions({ review }: UseReviewActionsParams): {
	sections: ActionMenuSection[];
} {
	const toggleDialog = useAlertDialog(TOGGLE_REVIEW_STATUS_DIALOG_ID);
	const selectActionItem = useBulkSelectionActionItem(review.id);

	const isPublished = review.status === "PUBLISHED";

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				...(selectActionItem ? [selectActionItem] : []),
				{
					key: "detail",
					label: "Voir le détail",
					icon: Eye,
					href: `/admin/marketing/avis/${review.id}`,
				},
				{
					key: "product",
					label: "Voir le produit",
					icon: ExternalLink,
					href: `/creations/${review.product.slug}`,
					external: true,
				},
			],
		},
		{
			key: "moderation",
			items: [
				{
					key: "toggle",
					label: isPublished ? "Masquer" : "Publier",
					icon: isPublished ? EyeOff : Eye,
					variant: isPublished ? "destructive" : "default",
					closesMenu: false,
					onSelect: () =>
						toggleDialog.open({
							reviewId: review.id,
							authorName: review.user.name ?? REVIEW_ANONYMOUS_AUTHOR_LABEL,
							productTitle: review.product.title,
							isPublished,
						}),
				},
			],
		},
	];

	return { sections };
}
