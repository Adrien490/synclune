"use client"

import { useState } from "react"
import { Send } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/utils/cn"

import { useCreateReviewForm } from "../hooks/use-create-review-form"
import { ReviewStars } from "./review-stars"
import { ReviewMediaUpload, type ReviewMediaItem } from "./review-media-upload"
import { REVIEW_CONFIG } from "../constants/review.constants"

interface CreateReviewFormProps {
	productId: string
	orderItemId: string
	productTitle?: string
	onSuccess?: () => void
	className?: string
}

/**
 * Formulaire de création d'avis
 */
export function CreateReviewForm({
	productId,
	orderItemId,
	productTitle,
	onSuccess,
	className,
}: CreateReviewFormProps) {
	const { form, action, isPending } = useCreateReviewForm({
		productId,
		orderItemId,
		onSuccess: () => {
			onSuccess?.()
		},
	})

	const [rating, setRating] = useState(5)
	const [media, setMedia] = useState<ReviewMediaItem[]>([])

	const handleRatingChange = (newRating: number) => {
		setRating(newRating)
		form.setFieldValue("rating", newRating)
	}

	const handleMediaChange = (newMedia: ReviewMediaItem[]) => {
		setMedia(newMedia)
		form.setFieldValue("media", newMedia)
	}

	return (
		<form action={action} className={cn("space-y-6", className)}>
			{/* Champs cachés */}
			<input type="hidden" name="productId" value={productId} />
			<input type="hidden" name="orderItemId" value={orderItemId} />
			<input type="hidden" name="rating" value={rating} />
			<input type="hidden" name="media" value={JSON.stringify(media)} />

			{/* Titre du formulaire */}
			{productTitle && (
				<div className="text-center">
					<h3 className="font-medium text-lg">
						Donnez votre avis sur
					</h3>
					<p className="text-muted-foreground">{productTitle}</p>
				</div>
			)}

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
								aria-describedby="content-error content-counter"
								className={cn(
									field.state.meta.errors.length > 0 && "border-destructive"
								)}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span id="content-error" role="alert" aria-live="assertive">
									{field.state.meta.errors.length > 0 && (
										<span className="text-destructive">
											{field.state.meta.errors[0]}
										</span>
									)}
								</span>
								<span id="content-counter" aria-live="polite">
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

			{/* Bouton de soumission */}
			<Button
				type="submit"
				disabled={isPending}
				className="w-full"
			>
				{isPending ? (
					"Envoi en cours..."
				) : (
					<>
						<Send className="size-4 mr-2" aria-hidden="true" />
						Publier mon avis
					</>
				)}
			</Button>
		</form>
	)
}
