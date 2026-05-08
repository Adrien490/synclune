"use client";

import { useState } from "react";
import { Send, Trash2, LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
	ResponsiveAlertDialogTrigger,
} from "@/shared/components/ui/responsive-alert-dialog";
import { cn } from "@/shared/utils/cn";

import { useReviewResponseForm } from "../../hooks/use-review-response-form";
import { REVIEW_CONFIG } from "../../constants/review.constants";

interface ReviewResponseFormProps {
	reviewId: string;
	existingResponse?: {
		id: string;
		content: string;
	} | null;
	onSuccess?: () => void;
	className?: string;
}

/**
 * Formulaire pour créer ou modifier une réponse admin à un avis
 */
export function ReviewResponseForm({
	reviewId,
	existingResponse,
	onSuccess,
	className,
}: ReviewResponseFormProps) {
	const [content, setContent] = useState(existingResponse?.content ?? "");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const { createResponse, editResponse, removeResponse, isPending } = useReviewResponseForm({
		onSuccess,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!isValid) {
			focusFirstInvalid();
			return;
		}

		if (existingResponse) {
			editResponse(existingResponse.id, content);
		} else {
			createResponse(reviewId, content);
		}
	};

	const handleDelete = () => {
		if (existingResponse) {
			removeResponse(existingResponse.id);
			setDeleteDialogOpen(false);
		}
	};

	const isValid = content.trim().length >= REVIEW_CONFIG.MIN_RESPONSE_LENGTH;

	return (
		<form
			ref={formRef}
			onSubmit={handleSubmit}
			onInvalidCapture={onInvalidCapture}
			className={cn("space-y-4", className)}
		>
			<div className="space-y-2">
				<Label htmlFor="response-content">
					{existingResponse ? "Modifier votre réponse" : "Répondre à cet avis"}
				</Label>
				<Textarea
					id="response-content"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Écrivez votre réponse…"
					rows={4}
					maxLength={REVIEW_CONFIG.MAX_RESPONSE_LENGTH}
					disabled={isPending}
					aria-invalid={content.length > 0 && content.length < REVIEW_CONFIG.MIN_RESPONSE_LENGTH}
					aria-describedby="response-error response-counter"
				/>
				<div className="text-muted-foreground flex justify-between text-xs">
					<span id="response-error" role="alert" aria-live="polite">
						{content.length > 0 && content.length < REVIEW_CONFIG.MIN_RESPONSE_LENGTH && (
							<span className="text-destructive">
								Minimum {REVIEW_CONFIG.MIN_RESPONSE_LENGTH} caractères
							</span>
						)}
					</span>
					<span id="response-counter" aria-live="polite">
						{content.length}/{REVIEW_CONFIG.MAX_RESPONSE_LENGTH}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button type="submit" disabled={isPending || !isValid} className="flex-1">
					{isPending ? (
						<>
							<LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
							{existingResponse ? "Modification…" : "Envoi…"}
						</>
					) : (
						<>
							<Send className="mr-2 size-4" aria-hidden="true" />
							{existingResponse ? "Modifier" : "Envoyer"}
						</>
					)}
				</Button>

				{existingResponse && (
					<ResponsiveAlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
						<ResponsiveAlertDialogTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={isPending}
								className="text-destructive hover:text-destructive"
								aria-label="Supprimer la réponse"
							>
								<Trash2 className="size-4" aria-hidden="true" />
							</Button>
						</ResponsiveAlertDialogTrigger>
						<ResponsiveAlertDialogContent>
							<ResponsiveAlertDialogHeader>
								<ResponsiveAlertDialogTitle>Supprimer cette réponse ?</ResponsiveAlertDialogTitle>
								<ResponsiveAlertDialogDescription>
									Cette action est irréversible. La réponse ne sera plus visible sur la page
									produit.
								</ResponsiveAlertDialogDescription>
							</ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogFooter>
								<ResponsiveAlertDialogCancel>Annuler</ResponsiveAlertDialogCancel>
								<ResponsiveAlertDialogAction
									onClick={handleDelete}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{isPending ? (
										<>
											<LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
											Suppression…
										</>
									) : (
										<>
											<Trash2 className="mr-2 size-4" aria-hidden="true" />
											Supprimer
										</>
									)}
								</ResponsiveAlertDialogAction>
							</ResponsiveAlertDialogFooter>
						</ResponsiveAlertDialogContent>
					</ResponsiveAlertDialog>
				)}
			</div>
		</form>
	);
}
