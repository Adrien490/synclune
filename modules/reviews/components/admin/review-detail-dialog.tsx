"use client"

import { ReviewStatus } from "@/app/generated/prisma/client"
import { useState } from "react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Separator } from "@/shared/components/ui/separator"
import { formatDateShort } from "@/shared/utils/dates"
import {
	CheckCircle2,
	Eye,
	EyeOff,
	ExternalLink,
	MessageSquare,
} from "lucide-react"
import Link from "next/link"

import type { ReviewAdmin } from "../../types/review.types"
import { REVIEW_STATUS_LABELS } from "../../constants/review.constants"
import { ReviewStars } from "../review-stars"
import { ReviewResponseForm } from "./review-response-form"

interface ReviewDetailDialogProps {
	review: ReviewAdmin
	trigger?: React.ReactNode
}

/**
 * Dialog de détail d'un avis avec possibilité de répondre
 */
export function ReviewDetailDialog({ review, trigger }: ReviewDetailDialogProps) {
	const [isOpen, setIsOpen] = useState(false)

	const handleResponseSuccess = () => {
		// Le dialog reste ouvert pour voir le résultat
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<Eye className="size-4 mr-2" aria-hidden="true" />
						Voir
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MessageSquare className="size-5" aria-hidden="true" />
						Détail de l&apos;avis
					</DialogTitle>
					<DialogDescription>
						Avis sur{" "}
						<Link
							href={`/creations/${review.product.slug}`}
							target="_blank"
							className="font-medium text-primary hover:underline inline-flex items-center gap-1"
						>
							{review.product.title}
							<ExternalLink className="size-3" aria-hidden="true" />
						</Link>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Informations client */}
					<div className="flex items-start gap-4">
						<Avatar className="size-12">
							<AvatarImage
								src={review.user.image || undefined}
								alt={review.user.name || ""}
							/>
							<AvatarFallback>
								{review.user.name?.charAt(0) || "?"}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 space-y-1">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">
										{review.user.name || "Anonyme"}
									</p>
									<p className="text-sm text-muted-foreground">
										{review.user.email}
									</p>
								</div>
								<Badge
									variant={review.status === ReviewStatus.PUBLISHED ? "default" : "secondary"}
								>
									{review.status === ReviewStatus.PUBLISHED ? (
										<CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
									) : (
										<EyeOff className="size-3 mr-1" aria-hidden="true" />
									)}
									{REVIEW_STATUS_LABELS[review.status]}
								</Badge>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<ReviewStars rating={review.rating} size="sm" />
								<span>•</span>
								<span>{formatDateShort(review.createdAt)}</span>
							</div>
						</div>
					</div>

					<Separator />

					{/* Contenu de l'avis */}
					<div className="space-y-2">
						{review.title && (
							<h4 className="font-semibold">{review.title}</h4>
						)}
						<p className="text-sm whitespace-pre-wrap">{review.content}</p>
					</div>

					{/* Photos */}
					{review.medias.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<h4 className="text-sm font-medium">Photos jointes</h4>
								<div className="flex gap-2 flex-wrap">
									{review.medias.map((media) => (
										<a
											key={media.id}
											href={media.url}
											target="_blank"
											rel="noopener noreferrer"
											className="relative size-20 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
										>
											<img
												src={media.url}
												alt={media.altText || "Photo de l'avis"}
												className="w-full h-full object-cover"
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
						<h4 className="text-sm font-medium flex items-center gap-2">
							<MessageSquare className="size-4" aria-hidden="true" />
							Réponse de la marque
						</h4>

						{review.response ? (
							<div className="bg-muted/50 rounded-lg p-4 space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">
										{review.response.authorName}
									</p>
									<span className="text-xs text-muted-foreground">
										{formatDateShort(review.response.createdAt)}
									</span>
								</div>
								<p className="text-sm whitespace-pre-wrap">
									{review.response.content}
								</p>
								<Separator className="my-4" />
								<ReviewResponseForm
									reviewId={review.id}
									existingResponse={{
										id: review.response.id,
										content: review.response.content,
									}}
									onSuccess={handleResponseSuccess}
								/>
							</div>
						) : (
							<ReviewResponseForm
								reviewId={review.id}
								onSuccess={handleResponseSuccess}
							/>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
