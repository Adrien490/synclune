"use client";

import { useAppForm } from "@/shared/components/forms";
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
		<form action={action} className="space-y-6">
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
				{defaultToken && state?.status !== ActionStatus.SUCCESS && (
					<div className="text-center space-y-4">
						<Button
							type="submit"
							size="lg"
							className="w-full sm:w-auto px-8"
							disabled={isPending}
						>
							{isPending ? "Confirmation en cours..." : "Confirmer mon inscription"}
						</Button>
					</div>
				)}

				{/* Afficher le message si pas de token */}
				{!defaultToken && !isPending && (
					<div className="text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Le lien de confirmation est manquant. Vérifie l'email
							que tu as reçu ou réinscris-toi.
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
