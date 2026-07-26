import { Info, MessageSquare } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatDateShort } from "@/shared/utils/dates";

import { REVIEW_ANONYMOUS_AUTHOR_LABEL } from "../../constants/review.constants";
import type { ReviewAdmin } from "../../types/review.types";

import { ReviewDetailHeader } from "./review-detail-header";
import { ReviewResponseForm } from "./review-response-form";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface ReviewDetailPageProps {
	review: ReviewAdmin;
}

export function ReviewDetailPage({ review }: ReviewDetailPageProps) {
	return (
		<div className="space-y-6">
			<ReviewDetailHeader review={review} />

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<Card style={{ viewTransitionName: "review-detail-info" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="size-5" aria-hidden="true" />
								Avis client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1">
								<p className="font-medium">{review.user.name ?? REVIEW_ANONYMOUS_AUTHOR_LABEL}</p>
								<p className="text-muted-foreground text-sm break-all">{review.user.email}</p>
							</div>
							<Separator />
							<div className="space-y-2">
								{review.title ? <h3 className="font-semibold">{review.title}</h3> : null}
								<p className="text-sm whitespace-pre-wrap">{review.content}</p>
							</div>

							{review.medias.length > 0 ? (
								<>
									<Separator />
									<div className="space-y-2">
										<h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
											Photos jointes
										</h3>
										<div className="flex flex-wrap gap-2">
											{review.medias.map((media, index) => (
												<a
													key={media.id}
													href={media.url}
													target="_blank"
													rel="noopener noreferrer"
													aria-label={`Voir la photo ${index + 1} en grand`}
													className="relative size-20 overflow-hidden rounded-lg transition-opacity hover:opacity-80"
												>
													<Image
														src={media.url}
														alt={media.altText ?? `Photo ${index + 1} de l'avis`}
														fill
														className="object-cover"
														sizes="80px"
														quality={IMAGE_QUALITY.STANDARD}
														placeholder={media.blurDataUrl ? "blur" : "empty"}
														blurDataURL={media.blurDataUrl ?? undefined}
													/>
													<span className="sr-only">(ouvre dans un nouvel onglet)</span>
												</a>
											))}
										</div>
									</div>
								</>
							) : null}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card style={{ viewTransitionName: "review-detail-response" }}>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageSquare className="size-5" aria-hidden="true" />
								Réponse de la marque
							</CardTitle>
						</CardHeader>
						<CardContent>
							{review.response ? (
								<div className="bg-muted/40 space-y-2 rounded-lg p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{review.response.authorName}</p>
										<span className="text-muted-foreground text-xs">
											{formatDateShort(review.response.createdAt)}
										</span>
									</div>
									<p className="text-sm whitespace-pre-wrap">{review.response.content}</p>
									<Separator className="my-3" />
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
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
