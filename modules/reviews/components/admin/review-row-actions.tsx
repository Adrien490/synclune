"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useReviewActions } from "../../hooks/use-review-actions";
import type { ReviewAdmin } from "../../types/review.types";

interface ReviewRowActionsProps {
	review: ReviewAdmin;
}

export function ReviewRowActions({ review }: ReviewRowActionsProps) {
	const { sections } = useReviewActions({ review });

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label="Actions"
				>
					<EllipsisVertical className="h-4 w-4" aria-hidden="true" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions avis" sections={sections} />
		</ResponsiveActionMenu>
	);
}
