"use client";

import { useAppForm } from "@/shared/components/tanstack-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ActionStatus } from "@/shared/types/server-action";
import { Mail, XCircle, CheckCircle2 } from "lucide-react";
import { useResendVerificationEmail } from "@/modules/auth/hooks/use-resend-verification-email";

interface ResendVerificationEmailFormProps {
	defaultEmail?: string;
}

export function ResendVerificationEmailForm({
	defaultEmail,
}: ResendVerificationEmailFormProps) {
	const { action, isPending, state } = useResendVerificationEmail();

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			email: defaultEmail || "",
		},
	});

	return (
		<form
			action={action}
			className="space-y-4"
			onSubmit={() => form.handleSubmit()}
		>
			{/* Message de succès */}
			{state?.status === ActionStatus.SUCCESS && state?.message && (
				<Alert>
				<CheckCircle2 />
				<AlertDescription>
					{state.message}
				</AlertDescription>
			</Alert>
			)}

			{/* Message d'erreur */}
			{state?.status !== ActionStatus.SUCCESS &&
				state?.status !== ActionStatus.INITIAL &&
				state?.message && (
					<Alert variant="destructive">
						<XCircle />
						<AlertDescription>
							{state.message}
						</AlertDescription>
					</Alert>
				)}

			<FieldSet>
				<FieldGroup>
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
							<Field data-invalid={field.state.meta.errors.length > 0}>
								<FieldLabel htmlFor={field.name}>
									Adresse email
									<span className="text-destructive ml-1">*</span>
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
									placeholder="exemple@email.com"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									aria-invalid={field.state.meta.errors.length > 0}
									aria-describedby={
										field.state.meta.errors.length > 0
											? `${field.name}-error`
											: undefined
									}
									aria-required="true"
									autoComplete="email"
								/>
								<FieldError
									id={`${field.name}-error`}
									errors={field.state.meta.errors}
								/>
							</Field>
						)}
					</form.AppField>
				</FieldGroup>
			</FieldSet>

			<form.Subscribe selector={(state) => [state.canSubmit]}>
				{([canSubmit]) => (
					<Button
						disabled={!canSubmit || isPending || state?.status === ActionStatus.SUCCESS}
						className="w-full"
						type="submit"
					>
						{isPending ? (
							<>
								<Mail className="h-4 w-4 animate-spin" />
								Envoi en cours...
							</>
						) : state?.status === ActionStatus.SUCCESS ? (
							"Email envoyé"
						) : (
							<>
								<Mail className="h-4 w-4" />
								Renvoyer l'email de vérification
							</>
						)}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
