"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldLabel, FieldSet } from "@/shared/components/ui/field";
import { useSubscribeToNewsletter } from "@/modules/newsletter/hooks/use-subscribe-to-newsletter";
import { ActionStatus } from "@/shared/types/server-action";
import { Mail, Sparkles } from "lucide-react";
import Link from "next/link";

export function NewsletterForm() {
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
	});

// console.log(state);

	return (
		<form
			action={action}
			className="space-y-4"
			onSubmit={() => form.handleSubmit()}
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
								if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
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
									className="text-sm font-medium flex items-center gap-2"
								>
									<Mail className="w-4 h-4 text-primary" aria-hidden="true" />
									Adresse email
								</FieldLabel>
								<div className="flex flex-col sm:flex-row gap-3">
									<div className="flex-1">
										{/* ✅ Using pre-bound InputField component */}
										<field.InputField
											type="email"
											disabled={
												isPending || state?.status === ActionStatus.SUCCESS
											}
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
												disabled={
													!canSubmit ||
													isPending ||
													state?.status === ActionStatus.SUCCESS
												}
												className="h-12 px-6 sm:px-8 shadow-lg hover:shadow-xl transition-all duration-300"
											>
												{isPending ? (
													"Inscription..."
												) : state?.status === ActionStatus.SUCCESS ? (
													<>
														<Sparkles className="w-4 h-4 mr-2" />
														Inscrit(e)
													</>
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
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
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
