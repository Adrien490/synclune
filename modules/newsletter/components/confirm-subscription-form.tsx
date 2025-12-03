"use client";

import { useAppForm } from "@/shared/components/tanstack-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FieldSet } from "@/shared/components/ui/field";
import { useConfirmSubscription } from "@/modules/newsletter/hooks/use-confirm-subscription";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface ConfirmSubscriptionFormProps {
	defaultToken?: string;
}

export function ConfirmSubscriptionForm({
	defaultToken,
}: ConfirmSubscriptionFormProps) {
	const { action, isPending, state } = useConfirmSubscription({
		onSuccess: () => {
			// Afficher juste le message de succès (pas de dialog)
			// Le message sera affiché via l'Alert component ci-dessous
		},
	});

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			token: defaultToken || "",
		},
	});

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => form.handleSubmit()}
		>
			<FieldSet>
				{/* Champ token caché */}
				<input type="hidden" name="token" value={defaultToken || ""} />

				{/* Success message */}
				{state?.status === ActionStatus.SUCCESS && state.message && (
					<Alert>
						<CheckCircle2 />
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

				{/* Error message */}
				{state?.status !== ActionStatus.SUCCESS &&
					state?.status !== ActionStatus.INITIAL &&
					state?.message && (
						<Alert variant="destructive">
							<XCircle />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}

				{/* Afficher le bouton si token valide */}
				{defaultToken &&
					!isPending &&
					state?.status !== ActionStatus.SUCCESS && (
						<div className="text-center space-y-4">
							<Button type="submit" size="lg" className="w-full sm:w-auto px-8">
								{isPending ? (
									<>
										<div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
										Confirmation en cours...
									</>
								) : (
									"Confirmer mon inscription"
								)}
							</Button>
						</div>
					)}

				{/* Message de chargement pendant la soumission */}
				{isPending && (
					<div className="text-center space-y-4">
						<div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
						<p className="text-sm text-muted-foreground">
							Confirmation en cours...
						</p>
					</div>
				)}

				{/* Afficher le message si pas de token */}
				{!defaultToken && !isPending && (
					<div className="text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Le lien de confirmation est manquant. Veuillez vérifier l'email
							que vous avez reçu ou vous réinscrire.
						</p>
						<Button asChild variant="outline">
							<Link href="/#newsletter">Me réinscrire</Link>
						</Button>
					</div>
				)}
			</FieldSet>
		</form>
	);
}
