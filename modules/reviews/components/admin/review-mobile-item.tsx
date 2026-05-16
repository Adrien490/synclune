"use client";

import { ReviewStatus } from "@/app/generated/prisma/browser";
import { CircleCheck, EyeOff, Loader2 } from "lucide-react";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { RatingStars } from "@/shared/components/rating-stars";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";
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
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(review.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

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
				viewTransitionName: `review-card-${review.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn("w-full gap-3 motion-safe:transition-opacity", isPendingItem && "opacity-60")}
				aria-roledescription="carte avis"
				aria-busy={isPendingItem || undefined}
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span
							className="hover:text-primary truncate font-semibold"
							style={{ viewTransitionName: `review-title-${review.id}` }}
						>
							{review.product.title}
						</span>
						{isPendingItem ? (
							<Badge
								variant="secondary"
								className="gap-1"
								aria-live="polite"
								style={{ viewTransitionName: `review-status-${review.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : review.status === ReviewStatus.PUBLISHED ? (
							<Badge
								variant="default"
								className="gap-1"
								style={{ viewTransitionName: `review-status-${review.id}` }}
							>
								<CircleCheck className="size-3" aria-hidden="true" />
								{REVIEW_STATUS_LABELS.PUBLISHED}
							</Badge>
						) : (
							<Badge
								variant="secondary"
								className="gap-1"
								style={{ viewTransitionName: `review-status-${review.id}` }}
							>
								<EyeOff className="size-3" aria-hidden="true" />
								{REVIEW_STATUS_LABELS.HIDDEN}
							</Badge>
						)}
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{review.user.name ?? REVIEW_ANONYMOUS_AUTHOR_LABEL}</span>
						<span aria-hidden="true">·</span>
						<span style={{ viewTransitionName: `review-rating-${review.id}` }}>
							<RatingStars rating={review.rating} size="sm" />
						</span>
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
		</MobileSelectableCard>
	);
}
