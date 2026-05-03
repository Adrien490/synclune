"use client";

import { useState } from "react";
import { CircleCheck, ExternalLink, Eye, EyeOff, LoaderCircle, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { RatingStars } from "@/shared/components/rating-stars";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import { useReviewModeration } from "../../hooks/use-review-moderation";
import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import type { ReviewAdmin } from "../../types/review.types";

const ReviewDetailDialog = dynamic(() =>
	import("./review-detail-dialog").then((mod) => mod.ReviewDetailDialog),
);

export const REVIEW_ITEM_DRAWER_ID = "review-item-drawer";

export interface ReviewItemDrawerData {
	review: ReviewAdmin;
	[key: string]: unknown;
}

export function ReviewItemDrawer() {
	const drawer = useDialog<ReviewItemDrawerData>(REVIEW_ITEM_DRAWER_ID);
	const [moderateOpen, setModerateOpen] = useState(false);
	const [detailOpen, setDetailOpen] = useState(false);

	const { toggleStatus, isPending } = useReviewModeration({
		onSuccess: () => setModerateOpen(false),
	});

	const review = drawer.data?.review;

	const isPublished = review?.status === "PUBLISHED";
	const authorName = review?.user.name ?? "Anonyme";

	const handleOpenDetail = () => {
		setDetailOpen(true);
	};

	const handleOpenModerate = () => {
		setModerateOpen(true);
	};

	const dialogs = review ? (
		<>
			{detailOpen ? (
				<ReviewDetailDialog review={review} open={detailOpen} onOpenChange={setDetailOpen} />
			) : null}

			<AlertDialog open={moderateOpen} onOpenChange={setModerateOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isPublished ? "Masquer cet avis ?" : "Publier cet avis ?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isPublished ? (
								<>
									L&apos;avis de <span className="font-semibold">{authorName}</span> sur &quot;
									{review.product.title}&quot; ne sera plus visible sur le site.
								</>
							) : (
								<>
									L&apos;avis de <span className="font-semibold">{authorName}</span> sur &quot;
									{review.product.title}&quot; sera visible sur le site.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<Button
							onClick={() => toggleStatus(review.id)}
							disabled={isPending}
							variant={isPublished ? "destructive" : "default"}
						>
							{isPending ? (
								<>
									<LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
									{isPublished ? "Masquage..." : "Publication..."}
								</>
							) : isPublished ? (
								<>
									<EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
									Masquer
								</>
							) : (
								<>
									<Eye className="mr-2 h-4 w-4" aria-hidden="true" />
									Publier
								</>
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	) : null;

	if (!review) {
		return (
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title=""
				dialogs={dialogs}
			>
				{null}
			</AdminItemDrawer>
		);
	}

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={review.product.title}
			description={`${authorName} · ${isPublished ? REVIEW_STATUS_LABELS.PUBLISHED : REVIEW_STATUS_LABELS.HIDDEN}`}
			dialogs={dialogs}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Auteur</dt>
				<dd>{authorName}</dd>
				<dt className="text-muted-foreground">Note</dt>
				<dd>
					<RatingStars rating={review.rating} size="sm" />
				</dd>
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					{isPublished ? (
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
				</dd>
				{review.title ? (
					<>
						<dt className="text-muted-foreground">Titre</dt>
						<dd className="font-medium">{review.title}</dd>
					</>
				) : null}
				<dt className="text-muted-foreground">Contenu</dt>
				<dd className="text-pretty whitespace-pre-wrap">{review.content}</dd>
				<dt className="text-muted-foreground">Réponse</dt>
				<dd>
					{review.response ? (
						<Badge variant="outline">Répondu</Badge>
					) : (
						<span className="text-muted-foreground">Aucune</span>
					)}
				</dd>
				<dt className="text-muted-foreground">Date</dt>
				<dd>{formatDateShort(review.createdAt)}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleOpenDetail}
				>
					<Eye className="size-4" aria-hidden="true" />
					Voir le détail
				</Button>
				{!review.response ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleOpenDetail}
					>
						<MessageSquare className="size-4" aria-hidden="true" />
						Répondre
					</Button>
				) : null}
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/creations/${review.product.slug}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => drawer.close()}
					>
						<ExternalLink className="size-4" aria-hidden="true" />
						Voir le produit
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleOpenModerate}
				>
					{isPublished ? (
						<>
							<EyeOff className="size-4" aria-hidden="true" />
							Masquer
						</>
					) : (
						<>
							<Eye className="size-4" aria-hidden="true" />
							Publier
						</>
					)}
				</Button>
			</div>
		</AdminItemDrawer>
	);
}
