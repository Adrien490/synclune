"use client";

import { Send } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

import { useCreateReviewForm } from "../hooks/use-create-review-form";
import { ReviewMediaField } from "./review-media-field";
import { REVIEW_CONFIG } from "../constants/review.constants";

interface CreateReviewFormProps {
	productId: string;
	orderItemId: string;
	productTitle?: string;
	onSuccess?: () => void;
	className?: string;
}

/**
 * Formulaire de création d'avis
 *
 * Utilise TanStack Form pour gérer l'état du formulaire.
 * Tous les champs (rating, title, content, media) sont gérés
 * par le form hook, sans useState local.
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
			onSuccess?.();
		},
	});

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
			{/* Champs cachés pour les IDs */}
			<input type="hidden" name="productId" value={productId} />
			<input type="hidden" name="orderItemId" value={orderItemId} />

			{/* Titre du formulaire */}
			{productTitle && (
				<div className="text-center">
					<h3 className="font-medium text-lg">Donnez votre avis sur</h3>
					<p className="text-muted-foreground">{productTitle}</p>
				</div>
			)}

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

			{/* Bouton de soumission */}
			<Button type="submit" disabled={isPending} className="w-full">
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
		</div>
	);
}
