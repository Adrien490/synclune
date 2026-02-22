"use client"

import { Send } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"

import { REVIEW_CONFIG } from "../constants/review.constants"
import { useUpdateReviewForm } from "../hooks/use-update-review-form"
import type { ReviewUser } from "../types/review.types"
import { ReviewMediaField } from "./review-media-field"

interface UpdateReviewFormProps {
	review: ReviewUser
	onSuccess?: () => void
	onCancel?: () => void
	className?: string
}

/**
 * Formulaire de modification d'avis
 *
 * Utilise TanStack Form pour gérer l'état du formulaire.
 * Tous les champs (rating, title, content, media) sont gérés
 * par le form hook, sans useState local.
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

	return (
		<div className="group/form">
			<form
				action={action}
				data-pending={isPending || undefined}
				aria-busy={isPending}
				className={cn(
					"space-y-6 transition-all duration-200",
					"group-has-[[data-pending]]/form:blur-[1px] group-has-[[data-pending]]/form:scale-[0.99] group-has-[[data-pending]]/form:pointer-events-none",
					className
				)}
			>
				{/* Champ caché pour l'ID */}
				<input type="hidden" name="id" value={review.id} />

				{/* Sélection de la note */}
				<form.AppField name="rating">
					{(field) => <field.RatingField label="Votre note" size="lg" />}
				</form.AppField>

				{/* Titre (optionnel) */}
				<form.AppField name="title">
					{(field) => (
						<field.InputField
							label="Titre de votre avis"
							optional
							placeholder="Résumez votre expérience en quelques mots"
							maxLength={REVIEW_CONFIG.MAX_TITLE_LENGTH}
						/>
					)}
				</form.AppField>

				{/* Contenu */}
				<form.AppField name="content">
					{(field) => (
						<field.TextareaField
							label="Votre avis"
							required
							placeholder="Partagez votre expérience avec ce produit..."
							rows={4}
							maxLength={REVIEW_CONFIG.MAX_CONTENT_LENGTH}
							showCounter
						/>
					)}
				</form.AppField>

				{/* Photos */}
				<form.Field name="media">
					{() => <ReviewMediaField label="Photos" disabled={isPending} />}
				</form.Field>

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
