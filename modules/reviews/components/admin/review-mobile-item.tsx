"use client";

import { EyeOff, Star } from "lucide-react";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { formatDateShort } from "@/shared/utils/dates";

import {
	REVIEW_ANONYMOUS_AUTHOR_LABEL,
	REVIEW_STATUS_LABELS,
} from "../../constants/review.constants";
import { useReviewActions } from "../../hooks/use-review-actions";
import type { ReviewAdmin } from "../../types/review.types";

interface ReviewMobileItemProps {
	review: ReviewAdmin;
}

export function ReviewMobileItem({ review }: ReviewMobileItemProps) {
	const { sections } = useReviewActions({ review });

	return (
		<LongPressMenuLink
			href={`/admin/marketing/avis/${review.id}`}
			ariaLabel={`Avis sur ${review.product.title}`}
			sections={sections}
			menuTitle="Actions avis"
			menuDescription={review.product.title}
			className="rounded-md text-left"
			viewTransitionName={`review-card-${review.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte avis"
			>
				<ItemMedia variant="icon">
					<span
						className="flex items-center gap-0.5 text-xs font-semibold tabular-nums"
						aria-label={`Note ${review.rating} sur 5`}
						style={{ viewTransitionName: `review-rating-${review.id}` }}
					>
						<span>{review.rating}</span>
						<Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
					</span>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span
							className="truncate font-semibold"
							style={{ viewTransitionName: `review-title-${review.id}` }}
						>
							{review.product.title}
						</span>
						<Badge
							variant="secondary"
							className="gap-1"
							style={{ viewTransitionName: `review-status-${review.id}` }}
						>
							<EyeOff className="size-3" aria-hidden="true" />
							{REVIEW_STATUS_LABELS.HIDDEN}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{review.user.name ?? REVIEW_ANONYMOUS_AUTHOR_LABEL}</span>
						{review.response ? (
							<>
								<span aria-hidden="true">·</span>
								<Badge variant="outline" className="text-xs">
									Répondu
								</Badge>
							</>
						) : null}
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(review.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</LongPressMenuLink>
	);
}
