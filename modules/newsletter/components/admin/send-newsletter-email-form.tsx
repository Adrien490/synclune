"use client";

import { useAppForm } from "@/shared/components/forms";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { ActionStatus } from "@/shared/types/server-action";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { useSendNewsletterEmail } from "@/modules/newsletter/hooks/use-send-newsletter-email";

export function SendNewsletterEmailForm() {
	const { action, isPending, state } = useSendNewsletterEmail();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			subject: "",
			content: "",
		},
	});

	return (
		<form action={action} className="space-y-6">
			{/* Success message using Alert component */}
			{state?.status === ActionStatus.SUCCESS && state.message && (
				<Alert>
					<CheckCircle2 />
					<AlertDescription>
						<div className="space-y-1">
							<p className="font-medium text-primary">Newsletter envoyée</p>
							<p className="text-sm text-primary/90">{state.message}</p>
							{(() => {
								const data = state.data;
								if (
									data &&
									typeof data === "object" &&
									"successCount" in data &&
									"totalCount" in data &&
									typeof data.successCount === "number" &&
									typeof data.totalCount === "number"
								) {
									return (
										<p className="text-xs text-primary/80 mt-2">
											{data.successCount} email(s) envoyé(s) sur{" "}
											{data.totalCount} abonné(s)
										</p>
									);
								}
								return null;
							})()}
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Error message using Alert component */}
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

			<RequiredFieldsNote className="mb-6" />

			<FieldSet>
				<FieldGroup>
					{/* Subject field - Using pre-bound InputField component */}
					<form.AppField
						name="subject"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le sujet est requis";
								if (value.length > 200)
									return "Le sujet ne doit pas dépasser 200 caractères";
								return undefined;
							},
							onBlur: ({ value }) => {
								if (!value) return "Le sujet est requis";
								if (value.length > 200)
									return "Le sujet ne doit pas dépasser 200 caractères";
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Sujet de l'email"
								type="text"
								placeholder="Ex: Découvrez nos dernières créations"
								disabled={isPending || state?.status === ActionStatus.SUCCESS}
								required
							/>
						)}
					</form.AppField>

					{/* Content field - Using pre-bound TextareaField component */}
					<form.AppField
						name="content"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Le contenu est requis";
								if (value.length < 10)
									return "Le contenu doit contenir au moins 10 caractères";
								if (value.length > 5000)
									return "Le contenu ne doit pas dépasser 5000 caractères";
								return undefined;
							},
							onBlur: ({ value }) => {
								if (!value) return "Le contenu est requis";
								if (value.length < 10)
									return "Le contenu doit contenir au moins 10 caractères";
								if (value.length > 5000)
									return "Le contenu ne doit pas dépasser 5000 caractères";
								return undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-1">
								<field.TextareaField
									label="Contenu de l'email"
									placeholder="Écris le contenu de ta newsletter..."
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
									rows={10}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{field.state.value.length} / 5000 caractères
								</p>
							</div>
						)}
					</form.AppField>
				</FieldGroup>
			</FieldSet>

			<form.Subscribe selector={(state) => [state.canSubmit]}>
				{([canSubmit]) => (
					<Button
						disabled={
							!canSubmit || isPending || state?.status === ActionStatus.SUCCESS
						}
						className="w-full"
						type="submit"
					>
						{isPending ? (
							"Envoi en cours..."
						) : state?.status === ActionStatus.SUCCESS ? (
							<>
								<CheckCircle2 className="w-4 h-4 mr-2" />
								Newsletter envoyée
							</>
						) : (
							<>
								<Send className="w-4 h-4 mr-2" />
								Envoyer la newsletter
							</>
						)}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
