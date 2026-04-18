"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { formatDateShort } from "@/shared/utils/dates";
import { CircleCheck, EyeOff, ExternalLink, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { RatingStars } from "@/shared/components/rating-stars";

import type { ReviewAdmin } from "../../types/review.types";
import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import { ReviewResponseForm } from "./review-response-form";

interface ReviewDetailDialogProps {
	review: ReviewAdmin;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog de détail d'un avis avec possibilité de répondre
 */
export function ReviewDetailDialog({
	review,
	trigger,
	open,
	onOpenChange,
}: ReviewDetailDialogProps) {
	const isPublished = review.status === "PUBLISHED";

	return (
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			{trigger && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}
			<ResponsiveDialogContent className="sm:max-w-2xl">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<MessageSquare className="size-5" aria-hidden="true" />
						Détail de l&apos;avis
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription asChild>
						<div>
							Avis sur{" "}
							<Link
								href={`/creations/${review.product.slug}`}
								target="_blank"
								className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
							>
								{review.product.title}
								<ExternalLink className="size-3" aria-hidden="true" />
							</Link>
						</div>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="space-y-6 py-4">
					{/* Informations client */}
					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">{review.user.name ?? "Anonyme"}</p>
								<p className="text-muted-foreground text-sm">{review.user.email}</p>
							</div>
							<Badge
								variant={isPublished ? "default" : "secondary"}
								role="status"
								aria-label={`Statut : ${REVIEW_STATUS_LABELS[review.status]}`}
							>
								{isPublished ? (
									<CircleCheck className="mr-1 size-3" aria-hidden="true" />
								) : (
									<EyeOff className="mr-1 size-3" aria-hidden="true" />
								)}
								{REVIEW_STATUS_LABELS[review.status]}
							</Badge>
						</div>
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<RatingStars rating={review.rating} size="sm" />
							<span>•</span>
							<span>{formatDateShort(review.createdAt)}</span>
						</div>
					</div>

					<Separator />

					{/* Contenu de l'avis */}
					<div className="space-y-2">
						{review.title && <h4 className="font-semibold">{review.title}</h4>}
						<p className="text-sm whitespace-pre-wrap">{review.content}</p>
					</div>

					{/* Photos */}
					{review.medias.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Photos jointes</h4>
								<div className="flex flex-wrap gap-2">
									{review.medias.map((media) => (
										<a
											key={media.id}
											href={media.url}
											target="_blank"
											rel="noopener noreferrer"
											className="relative size-20 overflow-hidden rounded-lg transition-opacity hover:opacity-80"
										>
											<Image
												src={media.url}
												alt={media.altText ?? "Photo de l'avis"}
												fill
												className="object-cover"
												sizes="80px"
												quality={75}
												placeholder={media.blurDataUrl ? "blur" : "empty"}
												blurDataURL={media.blurDataUrl ?? undefined}
											/>
										</a>
									))}
								</div>
							</div>
						</>
					)}

					<Separator />

					{/* Réponse admin */}
					<div className="space-y-4">
						<h4 className="flex items-center gap-2 text-sm font-medium">
							<MessageSquare className="size-4" aria-hidden="true" />
							Réponse de la marque
						</h4>

						{review.response ? (
							<div className="bg-muted/50 space-y-2 rounded-lg p-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">{review.response.authorName}</p>
									<span className="text-muted-foreground text-xs">
										{formatDateShort(review.response.createdAt)}
									</span>
								</div>
								<p className="text-sm whitespace-pre-wrap">{review.response.content}</p>
								<Separator className="my-4" />
								<ReviewResponseForm
									reviewId={review.id}
									existingResponse={{
										id: review.response.id,
										content: review.response.content,
									}}
								/>
							</div>
						) : (
							<ReviewResponseForm reviewId={review.id} />
						)}
					</div>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
