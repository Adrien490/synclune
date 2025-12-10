"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { useContactAdrienForm } from "@/modules/dashboard/hooks/use-contact-adrien-form";
import { ActionStatus } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface ContactAdrienFormProps {
	/** Callback appelé après succès (auto-fermeture) */
	onSuccess?: () => void;
	/** Callback pour le bouton Annuler */
	onCancel?: () => void;
	/** Classes CSS additionnelles pour le form */
	className?: string;
	/** Composant personnalisé pour le footer (boutons) */
	renderFooter?: (props: {
		canSubmit: boolean;
		isPending: boolean;
		isSuccess: boolean;
		onCancel?: () => void;
	}) => React.ReactNode;
}

/**
 * Formulaire de contact Adrien réutilisable
 * Utilisé dans le FAB desktop et le nested drawer mobile
 */
export function ContactAdrienForm({
	onSuccess,
	onCancel,
	className,
	renderFooter,
}: ContactAdrienFormProps) {
	const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cleanup des timeouts au démontage
	useEffect(() => {
		return () => {
			if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
			if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
		};
	}, []);

	const { form, action, isPending, state } = useContactAdrienForm({
		onSuccess: () => {
			if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
			autoCloseTimeoutRef.current = setTimeout(() => {
				onSuccess?.();
			}, 2000);
		},
	});

	const handleCancel = () => {
		if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
		resetTimeoutRef.current = setTimeout(() => {
			if (!isPending) {
				form.reset();
			}
		}, 300);
		onCancel?.();
	};

	const isSuccess = state?.status === ActionStatus.SUCCESS;

	return (
		<form
			action={action}
			className={cn("space-y-4", className)}
			onSubmit={() => form.handleSubmit()}
		>
			{isSuccess && state.message && (
				<Alert>
					<CheckCircle2 />
					<AlertDescription>
						<p className="font-medium text-primary">Message envoyé</p>
						<p className="text-sm text-primary/90 mt-1">{state.message}</p>
					</AlertDescription>
				</Alert>
			)}

			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert variant="destructive">
						<AlertCircle />
						<AlertDescription>
							<p className="font-medium">Erreur</p>
							<p className="text-sm mt-1">{state.message}</p>
						</AlertDescription>
					</Alert>
				)}

			<FieldSet>
				<FieldGroup>
					<form.AppField
						name="message"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le message est requis";
								if (value.length < 10)
									return "Le message doit contenir au moins 10 caractères";
								if (value.length > 5000)
									return "Le message ne doit pas dépasser 5000 caractères";
								return undefined;
							},
							onBlur: ({ value }) => {
								if (!value) return "Le message est requis";
								if (value.length < 10)
									return "Le message doit contenir au moins 10 caractères";
								if (value.length > 5000)
									return "Le message ne doit pas dépasser 5000 caractères";
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-1">
								<field.TextareaField
									label="Message"
									placeholder="Décris ta demande en détail..."
									disabled={isPending || isSuccess}
									rows={6}
									className={cn(
										"resize-none transition-opacity",
										isPending && "opacity-60"
									)}
									aria-describedby="message-counter"
									required
								/>
								<p
									id="message-counter"
									className="text-xs text-muted-foreground"
									aria-live="polite"
								>
									{field.state.value.length} / 5000 caractères
								</p>
							</div>
						)}
					</form.AppField>
				</FieldGroup>
			</FieldSet>

			<form.Subscribe selector={(formState) => [formState.canSubmit]}>
				{([canSubmit]) =>
					renderFooter ? (
						renderFooter({
							canSubmit,
							isPending,
							isSuccess,
							onCancel: handleCancel,
						})
					) : (
						<div className="pt-4">
							<Button
								type="submit"
								disabled={!canSubmit || isPending || isSuccess}
								aria-busy={isPending}
								className="w-full"
							>
								{isPending ? "Envoi..." : isSuccess ? "Envoyé" : "Envoyer"}
							</Button>
						</div>
					)
				}
			</form.Subscribe>

			{/* Annonce pour lecteurs d'écran lors de la fermeture automatique */}
			<div aria-live="polite" className="sr-only">
				{isSuccess && "Message envoyé avec succès. La fenêtre se fermera automatiquement."}
			</div>
		</form>
	);
}
