"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { useUnsubscribeFromNewsletter } from "@/modules/newsletter/hooks/use-unsubscribe-from-newsletter";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface UnsubscribeFormProps {
	defaultToken?: string;
	defaultEmail?: string;
}

export function UnsubscribeForm({
	defaultToken,
	defaultEmail,
}: UnsubscribeFormProps) {
	const { action, isPending, state } = useUnsubscribeFromNewsletter();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			token: defaultToken || "",
			email: defaultEmail || "",
		},
	});

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => form.handleSubmit()}
		>
			{/* Success message using Alert component */}
			{state?.status === ActionStatus.SUCCESS && state.message && (
				<div className="space-y-4">
					<Alert>
						<CheckCircle2 />
						<AlertDescription>{state.message}</AlertDescription>
						<p className="text-sm text-muted-foreground mt-2">
							Merci pour le temps passé ensemble 🌸
						</p>
					</Alert>
					<div className="text-center pt-2">
						<Button asChild variant="outline" size="sm">
							<Link href="/">Retour à l'accueil</Link>
						</Button>
					</div>
				</div>
			)}

			{/* Error message using Alert component */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert variant="destructive">
						<XCircle />
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

			{/* Formulaire visible seulement si pas encore désabonné */}
			{state?.status !== ActionStatus.SUCCESS && (
				<FieldSet>
					<FieldGroup>
						{/* Champ token caché si fourni dans l'URL */}
						{defaultToken && (
							<input type="hidden" name="token" value={defaultToken} />
						)}

						{/* Email field - Using pre-bound InputField component */}
						<form.AppField
							name="email"
							validators={{
								onBlur: ({ value }) => {
									if (!value) return "L'email est requis";
									if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
										return "Format d'email invalide";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.InputField
									type="email"
									inputMode="email"
									autoComplete="email"
									spellCheck={false}
									autoCorrect="off"
									label="Adresse email"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>

						{/* Token field - Using pre-bound InputField component */}
						{!defaultToken && (
							<form.AppField name="token">
								{(field) => (
									<div className="space-y-1">
										<field.InputField
											type="text"
											label="Code de désinscription (optionnel)"
											placeholder="Si tu as reçu un code par email"
											disabled={isPending}
										/>
										<p className="text-xs text-muted-foreground">
											Ce code se trouve dans les emails de newsletter
										</p>
									</div>
								)}
							</form.AppField>
						)}

						{/* Bouton de désinscription */}
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button
									type="submit"
									size="lg"
									disabled={!canSubmit || isPending}
									className="w-full"
									variant="destructive"
								>
									{isPending ? "Désinscription en cours..." : "Me désinscrire"}
								</Button>
							)}
						</form.Subscribe>
					</FieldGroup>
				</FieldSet>
			)}

			{/* Message de réassurance */}
			{state?.status !== ActionStatus.SUCCESS && (
				<div className="text-center text-sm text-muted-foreground space-y-2">
					<p>Tu peux toujours te réinscrire plus tard</p>
					<p>
						Tu as changé d'avis ?{" "}
						<Link href="/#newsletter" className="text-primary underline">
							Rester abonné(e)
						</Link>
					</p>
				</div>
			)}
		</form>
	);
}
