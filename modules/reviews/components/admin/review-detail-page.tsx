import { CircleCheck, EyeOff, ExternalLink, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { RatingStars } from "@/shared/components/rating-stars";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { formatDateShort } from "@/shared/utils/dates";

import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import type { ReviewAdmin } from "../../types/review.types";

import { ReviewResponseForm } from "./review-response-form";

interface ReviewDetailPageProps {
	review: ReviewAdmin;
}

export function ReviewDetailPage({ review }: ReviewDetailPageProps) {
	const isPublished = review.status === "PUBLISHED";

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			{/* Header */}
			<header className="space-y-1">
				<h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
					<MessageSquare className="size-6" aria-hidden="true" />
					Détail de l&apos;avis
				</h1>
				<p className="text-muted-foreground text-sm">
					Avis sur{" "}
					<Link
						href={`/creations/${review.product.slug}`}
						target="_blank"
						className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
					>
						{review.product.title}
						<ExternalLink className="size-3" aria-hidden="true" />
					</Link>
				</p>
			</header>

			<Separator />

			{/* Informations client */}
			<section className="space-y-1">
				<div className="flex items-center justify-between">
					<div>
						<p className="font-medium">{review.user.name ?? "Anonyme"}</p>
						<p className="text-muted-foreground text-sm">{review.user.email}</p>
					</div>
					<Badge
						variant={isPublished ? "default" : "secondary"}
						role="status"
						aria-label={`Statut : ${REVIEW_STATUS_LABELS[review.status]}`}
						style={{ viewTransitionName: `review-status-${review.id}` }}
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
			</section>

			<Separator />

			{/* Contenu de l'avis */}
			<section className="space-y-2">
				{review.title && <h2 className="font-semibold">{review.title}</h2>}
				<p className="text-sm whitespace-pre-wrap">{review.content}</p>
			</section>

			{/* Photos */}
			{review.medias.length > 0 && (
				<>
					<Separator />
					<section className="space-y-2">
						<h3 className="text-sm font-medium">Photos jointes</h3>
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
					</section>
				</>
			)}

			<Separator />

			{/* Réponse admin */}
			<section className="space-y-4">
				<h3 className="flex items-center gap-2 text-sm font-medium">
					<MessageSquare className="size-4" aria-hidden="true" />
					Réponse de la marque
				</h3>

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
			</section>
		</div>
	);
}
