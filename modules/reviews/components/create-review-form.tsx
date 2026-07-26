"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { cn } from "@/shared/utils/cn";

import { useCreateReviewForm } from "../hooks/use-create-review-form";
import { ReviewMediaField } from "./review-media-field";
import { REVIEW_CONFIG } from "../constants/review.constants";

/** Champs pouvant recevoir une erreur serveur path-préfixée (`create-review.ts`). */
const SERVER_FIELD_NAMES = ["rating", "title", "content", "media"] as const;

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
	const [deletedMediaUrls, setDeletedMediaUrls] = useState<string[]>([]);

	const { form, state, action, isPending } = useCreateReviewForm({
		productId,
		orderItemId,
		onSuccess: () => {
			onSuccess?.();
		},
	});

	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// `createReview` émet des messages path-préfixés ("content: trop court") et
	// `createToastCallbacks` les retire du toast : on les remonte sur le champ
	// ciblé, sinon en alerte globale.
	const serverErrors = useServerFieldErrors({
		state,
		fieldNames: SERVER_FIELD_NAMES,
		setFieldError: (field, message) =>
			form.setFieldMeta(field, (prev) => ({ ...prev, errors: [message] })),
		onFieldError: () => requestAnimationFrame(() => focusFirstInvalid()),
	});

	return (
		<div className="group/form">
			<form
				ref={formRef}
				action={action}
				data-pending={isPending || undefined}
				aria-busy={isPending}
				className={cn(
					"space-y-6 transition-all duration-200",
					"group-has-[[data-pending]]/form:pointer-events-none group-has-[[data-pending]]/form:scale-[0.99] group-has-[[data-pending]]/form:blur-[1px]",
					className,
				)}
			>
				{/* Champs cachés pour les IDs */}
				<input type="hidden" name="productId" value={productId} />
				<input type="hidden" name="orderItemId" value={orderItemId} />
				{deletedMediaUrls.length > 0 && (
					<input type="hidden" name="deletedMediaUrls" value={JSON.stringify(deletedMediaUrls)} />
				)}

				<FormServerErrorAlert errors={serverErrors} />

				{/* Titre du formulaire */}
				{productTitle && (
					<div className="text-center">
						<h3 className="text-lg font-medium">Donnez votre avis sur</h3>
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
							placeholder="Partagez votre expérience avec ce produit…"
							rows={4}
							maxLength={REVIEW_CONFIG.MAX_CONTENT_LENGTH}
							showCounter
						/>
					)}
				</form.AppField>

				{/* Photos */}
				<form.Field name="media">
					{() => (
						<ReviewMediaField
							label="Photos"
							onMediaRemoved={(url) => setDeletedMediaUrls((prev) => [...prev, url])}
							disabled={isPending}
						/>
					)}
				</form.Field>

				{/* Bouton de soumission */}
				<Button type="submit" disabled={isPending} className="w-full">
					{isPending ? (
						"Envoi en cours…"
					) : (
						<>
							<Send className="mr-2 size-4" aria-hidden="true" />
							Publier mon avis
						</>
					)}
				</Button>
			</form>
		</div>
	);
}
