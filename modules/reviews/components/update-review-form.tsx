"use client"

import { useState } from "react"
import { Send } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/utils/cn"

import { useUpdateReviewForm } from "../hooks/use-update-review-form"
import { ReviewStars } from "./review-stars"
import { ReviewMediaUpload, type ReviewMediaItem } from "./review-media-upload"
import { REVIEW_CONFIG } from "../constants/review.constants"
import type { ReviewUser } from "../types/review.types"

interface UpdateReviewFormProps {
	review: ReviewUser
	onSuccess?: () => void
	onCancel?: () => void
	className?: string
}

/**
 * Formulaire de modification d'avis
 */
export function UpdateReviewForm({
	review,
	onSuccess,
	onCancel,
	className,
}: UpdateReviewFormProps) {
	const initialMedia = review.medias.map((m) => ({
		url: m.url,
		blurDataUrl: m.blurDataUrl ?? undefined,
		altText: m.altText ?? undefined,
	}))

	const { form, action, isPending } = useUpdateReviewForm({
		reviewId: review.id,
		initialRating: review.rating,
		initialTitle: review.title ?? "",
		initialContent: review.content,
		initialMedia,
		onSuccess: () => {
			onSuccess?.()
		},
	})

	const [rating, setRating] = useState(review.rating)
	const [media, setMedia] = useState<ReviewMediaItem[]>(initialMedia)

	const handleRatingChange = (newRating: number) => {
		setRating(newRating)
		form.setFieldValue("rating", newRating)
	}

	const handleMediaChange = (newMedia: ReviewMediaItem[]) => {
		setMedia(newMedia)
		form.setFieldValue("media", newMedia)
	}

	return (
		<div className="group/form">
			<form
				action={action}
				data-pending={isPending || undefined}
				className={cn(
					"space-y-6 transition-all duration-200",
					"group-has-[[data-pending]]/form:blur-[1px] group-has-[[data-pending]]/form:scale-[0.99] group-has-[[data-pending]]/form:pointer-events-none",
					className
				)}
			>
				{/* Champs cachés */}
			<input type="hidden" name="reviewId" value={review.id} />
			<input type="hidden" name="rating" value={rating} />
			<input type="hidden" name="media" value={JSON.stringify(media)} />

			{/* Sélection de la note */}
			<div className="flex flex-col items-center gap-2">
				<Label className="text-base">Votre note</Label>
				<ReviewStars
					rating={rating}
					size="lg"
					interactive
					onChange={handleRatingChange}
				/>
				<span className="text-sm text-muted-foreground">
					{rating} étoile{rating > 1 ? "s" : ""}
				</span>
			</div>

			{/* Titre (optionnel) */}
			<div className="space-y-2">
				<Label htmlFor="title">
					Titre de votre avis <span className="text-muted-foreground">(optionnel)</span>
				</Label>
				<form.Field name="title">
					{(field) => (
						<Input
							id="title"
							name="title"
							placeholder="Résumez votre expérience en quelques mots"
							maxLength={REVIEW_CONFIG.MAX_TITLE_LENGTH}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					)}
				</form.Field>
			</div>

			{/* Contenu */}
			<div className="space-y-2">
				<Label htmlFor="content">
					Votre avis <span className="text-destructive">*</span>
				</Label>
				<form.Field name="content">
					{(field) => (
						<>
							<Textarea
								id="content"
								name="content"
								placeholder="Partagez votre expérience avec ce produit..."
								rows={4}
								maxLength={REVIEW_CONFIG.MAX_CONTENT_LENGTH}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby="update-content-error update-content-counter"
								className={cn(
									field.state.meta.errors.length > 0 && "border-destructive"
								)}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span id="update-content-error" role="alert" aria-live="assertive">
									{field.state.meta.errors.length > 0 && (
										<span className="text-destructive">
											{field.state.meta.errors[0]}
										</span>
									)}
								</span>
								<span id="update-content-counter" aria-live="polite">
									{field.state.value.length}/{REVIEW_CONFIG.MAX_CONTENT_LENGTH}
								</span>
							</div>
						</>
					)}
				</form.Field>
			</div>

			{/* Photos */}
			<div className="space-y-2">
				<Label>Photos (optionnel)</Label>
				<ReviewMediaUpload
					media={media}
					onChange={handleMediaChange}
					disabled={isPending}
				/>
			</div>

			{/* Boutons d'action */}
			<div className="flex gap-3">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isPending}
						className="flex-1"
					>
						Annuler
					</Button>
				)}
				<Button
					type="submit"
					disabled={isPending}
					className="flex-1"
				>
					{isPending ? (
						"Enregistrement..."
					) : (
						<>
							<Send className="size-4 mr-2" aria-hidden="true" />
							Enregistrer les modifications
						</>
					)}
				</Button>
				</div>
			</form>
		</div>
	)
}
