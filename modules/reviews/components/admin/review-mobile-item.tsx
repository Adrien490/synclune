"use client";

import { ReviewStatus } from "@/app/generated/prisma/enums";
import { CircleCheck, EyeOff } from "lucide-react";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { RatingStars } from "@/shared/components/rating-stars";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { formatDateShort } from "@/shared/utils/dates";

import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import { useReviewActions } from "../../hooks/use-review-actions";
import type { ReviewAdmin } from "../../types/review.types";

interface ReviewMobileItemProps {
	review: ReviewAdmin;
}

export function ReviewMobileItem({ review }: ReviewMobileItemProps) {
	const { sections } = useReviewActions({ review });

	return (
		<MobileSelectableCard
			id={review.id}
			itemLabel={`Avis sur ${review.product.title}`}
			longPressProps={{
				href: `/admin/marketing/avis/${review.id}`,
				ariaLabel: `Avis sur ${review.product.title}`,
				sections,
				menuTitle: "Actions avis",
				menuDescription: review.product.title,
				className: "rounded-md text-left",
			}}
		>
			<Item variant="outline" size="sm" className="w-full gap-3" aria-roledescription="carte avis">
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="hover:text-primary truncate font-semibold">
							{review.product.title}
						</span>
						{review.status === ReviewStatus.PUBLISHED ? (
							<Badge variant="default" className="gap-1">
								<CircleCheck className="size-3" aria-hidden="true" />
								{REVIEW_STATUS_LABELS.PUBLISHED}
							</Badge>
						) : (
							<Badge variant="secondary" className="gap-1">
								<EyeOff className="size-3" aria-hidden="true" />
								{REVIEW_STATUS_LABELS.HIDDEN}
							</Badge>
						)}
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{review.user.name ?? "Anonyme"}</span>
						<span aria-hidden="true">·</span>
						<RatingStars rating={review.rating} size="sm" />
						{review.response ? (
							<>
								<span aria-hidden="true">·</span>
								<Badge variant="outline" className="text-xs">
									Repondu
								</Badge>
							</>
						) : null}
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(review.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
