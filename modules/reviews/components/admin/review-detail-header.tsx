"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CircleCheck, Ellipsis, ExternalLink, EyeOff, MessageSquare } from "lucide-react";
import Link from "next/link";

import { RatingStars } from "@/shared/components/rating-stars";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import { useReviewActions } from "../../hooks/use-review-actions";
import type { ReviewAdmin } from "../../types/review.types";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface ReviewDetailHeaderProps {
	review: ReviewAdmin;
}

export function ReviewDetailHeader({ review }: ReviewDetailHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(`Avis · ${review.product.title}`);
	const { sections } = useReviewActions({ review });
	const isPublished = review.status === "PUBLISHED";

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1 className="font-display text-foreground flex flex-wrap items-center gap-2 text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					<MessageSquare className="size-6 shrink-0 sm:size-7" aria-hidden="true" />
					<span>Avis</span>
					<Link
						href={`/creations/${review.product.slug}`}
						target="_blank"
						className="text-primary inline-flex items-center gap-1 text-base font-medium hover:underline sm:text-lg"
					>
						sur {review.product.title}
						<ExternalLink className="size-3.5" aria-hidden="true" />
					</Link>
				</h1>
				<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs md:hidden">
					<Badge
						variant={isPublished ? "default" : "secondary"}
						className="shrink-0"
						style={{ viewTransitionName: `review-status-${review.id}` }}
					>
						{isPublished ? (
							<CircleCheck className="size-3" aria-hidden="true" />
						) : (
							<EyeOff className="size-3" aria-hidden="true" />
						)}
						{REVIEW_STATUS_LABELS[review.status]}
					</Badge>
					<RatingStars rating={review.rating} size="sm" />
					<span aria-hidden="true">·</span>
					<span className="truncate">
						{formatDistanceToNow(review.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<div className="text-muted-foreground mt-1 hidden items-center gap-2 text-sm md:flex">
					<Badge
						variant={isPublished ? "default" : "secondary"}
						className="shrink-0"
						style={{ viewTransitionName: `review-status-${review.id}` }}
					>
						{isPublished ? (
							<CircleCheck className="size-3" aria-hidden="true" />
						) : (
							<EyeOff className="size-3" aria-hidden="true" />
						)}
						{REVIEW_STATUS_LABELS[review.status]}
					</Badge>
					<RatingStars rating={review.rating} size="sm" />
					<span aria-hidden="true">·</span>
					<span>Publié le {format(review.createdAt, "d MMMM yyyy", { locale: fr })}</span>
				</div>
			</div>

			<DetailStickyActionBar>
				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							aria-label="Plus d'actions"
							className="min-h-11 w-full touch-manipulation sm:min-h-9 md:w-auto"
						>
							<Ellipsis className="size-4" aria-hidden="true" />
							<span className="md:hidden">Actions</span>
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions avis"
						description={review.product.title}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
