"use client";

import { useOptimistic, useTransition } from "react";
import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldLabel, FieldSet } from "@/shared/components/ui/field";
import { EMAIL_REGEX } from "@/shared/constants/validation";
import { useSubscribeToNewsletter } from "@/modules/newsletter/hooks/use-subscribe-to-newsletter";
import { ActionStatus } from "@/shared/types/server-action";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function NewsletterForm() {
	const [, startTransition] = useTransition();

	// Optimistic state pour feedback immédiat
	const [optimisticSubmitted, setOptimisticSubmitted] = useOptimistic(false);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: "",
			consent: false,
		},
	});

	// Newsletter subscription hook with success callback
	const { action, isPending, state } = useSubscribeToNewsletter({
		onSuccess: () => {
			// NE PAS ouvrir le dialog ici - l'utilisateur doit d'abord confirmer son email
			// Le dialog s'ouvrira après la confirmation par email
			// Reset form
			form.reset();
		},
		onError: () => {
			// Rollback de l'état optimiste en cas d'erreur
			startTransition(() => {
				setOptimisticSubmitted(false);
			});
		},
	});

	// Handler combiné pour optimistic UI + form submit
	const handleSubmit = () => {
		form.handleSubmit();
		// Déclencher l'état optimiste immédiatement
		startTransition(() => {
			setOptimisticSubmitted(true);
		});
	};

	// L'inscription est considérée réussie si optimistic OU state.status === SUCCESS
	const isSuccess = optimisticSubmitted || state?.status === ActionStatus.SUCCESS;

	return (
		<form
			action={action}
			className="space-y-4"
			onSubmit={handleSubmit}
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending}
		>
			{/* Success message */}
			{state?.status === ActionStatus.SUCCESS && state.message && (
				<Alert>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			{/* Error message (email already subscribed, etc.) - Skip validation errors */}
			{(state?.status === ActionStatus.ERROR ||
				state?.status === ActionStatus.CONFLICT) &&
				state?.message && (
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

			<FieldSet>
				<FieldGroup className="space-y-4">
					{/* Email field - Using field composition pattern */}
					<form.AppField
						name="email"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "L'email est requis";
								if (!EMAIL_REGEX.test(value)) {
									return "Format d'email invalide";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor={field.name}
									className="text-sm font-medium"
								>
									Adresse email
								</FieldLabel>
								<div className="flex flex-col sm:flex-row gap-3">
									<div className="flex-1">
										{/* ✅ Using pre-bound InputField component */}
										<field.InputField
											type="email"
											inputMode="email"
											autoComplete="email"
											spellCheck={false}
											autoCorrect="off"
											disabled={isPending || isSuccess}
											className="h-12 text-base bg-background/80 backdrop-blur-sm border-2 focus:border-primary"
											aria-label="Ton adresse email pour la newsletter"
											required
										/>
									</div>

									{/* Submit button */}
									<form.Subscribe selector={(state) => [state.canSubmit]}>
										{([canSubmit]) => (
											<Button
												type="submit"
												size="lg"
												disabled={!canSubmit || isPending || isSuccess}
												className="h-12 px-6 sm:px-8 shadow-lg hover:shadow-xl transition-all duration-300"
											>
												{isSuccess ? (
													<>
														<Sparkles className="w-4 h-4 mr-2" />
														Inscrit(e)
													</>
												) : isPending ? (
													"Inscription..."
												) : (
													"S'inscrire"
												)}
											</Button>
										)}
									</form.Subscribe>
								</div>
							</div>
						)}
					</form.AppField>

					{/* GDPR consent checkbox - Using field composition pattern */}
					<form.AppField
						name="consent"
						validators={{
							onSubmit: ({ value }) => {
								if (!value) return "Tu dois accepter pour t'inscrire";
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="flex flex-col items-center space-y-2">
								<field.CheckboxField
									label={
										<span className="text-sm leading-relaxed">
											J'accepte de recevoir la newsletter et j'ai lu la{" "}
											<Link
												href="/confidentialite"
												className="underline hover:bg-accent hover:text-accent-foreground transition-colors px-1 rounded-sm"
												target="_blank"
												rel="noopener noreferrer"
											>
												Politique de confidentialité
											</Link>
										</span>
									}
									disabled={isPending || isSuccess}
									required
								/>
							</div>
						)}
					</form.AppField>
				</FieldGroup>
			</FieldSet>
		</form>
	);
}
