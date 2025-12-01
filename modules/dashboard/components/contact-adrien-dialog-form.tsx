"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { CONTACT_TYPE_OPTIONS } from "../constants/contact-adrien.constants";
import type { useContactAdrienForm } from "../hooks/use-contact-adrien-form";

interface ContactAdrienDialogFormProps {
	form: ReturnType<typeof useContactAdrienForm>["form"];
	action: ReturnType<typeof useContactAdrienForm>["action"];
	isPending: boolean;
	state: ActionState | undefined;
}

/**
 * Contenu du dialog avec le formulaire de contact
 */
export function ContactAdrienDialogForm({
	form,
	action,
	isPending,
	state,
}: ContactAdrienDialogFormProps) {
	return (
		<DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
			<DialogHeader className="shrink-0">
				<DialogTitle>Contacter Adri</DialogTitle>
				<DialogDescription>
					Signale un bug, demande une nouvelle fonctionnalité ou pose une
					question.
				</DialogDescription>
			</DialogHeader>

			<form
				action={action}
				className="space-y-4 overflow-y-auto flex-1 px-1"
				onSubmit={() => form.handleSubmit()}
			>
				{/* Success message */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert>
						<CheckCircle2 />
						<AlertDescription>
							<p className="font-medium text-primary">Message envoyé</p>
							<p className="text-sm text-primary/90 mt-1">{state.message}</p>
						</AlertDescription>
					</Alert>
				)}

				{/* Error message */}
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
						{/* Type field */}
						<form.AppField
							name="type"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value) return "Le type est requis";
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.SelectField
									label="Type de message"
									options={CONTACT_TYPE_OPTIONS}
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
									required
								/>
							)}
						</form.AppField>

						{/* Message field */}
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
										placeholder="Décrivez votre demande en détail..."
										disabled={isPending || state?.status === ActionStatus.SUCCESS}
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
					{([canSubmit]) => (
						<div className="flex justify-end gap-2">
							<DialogTrigger asChild>
								<Button
									type="button"
									variant="outline"
									disabled={isPending || state?.status === ActionStatus.SUCCESS}
								>
									Annuler
								</Button>
							</DialogTrigger>
							<Button
								type="submit"
								disabled={
									!canSubmit || isPending || state?.status === ActionStatus.SUCCESS
								}
								aria-busy={isPending}
							>
								{isPending
									? "Envoi..."
									: state?.status === ActionStatus.SUCCESS
										? "Envoyé"
										: "Envoyer"}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</form>
		</DialogContent>
	);
}
