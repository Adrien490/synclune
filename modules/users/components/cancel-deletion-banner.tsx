"use client";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useCancelAccountDeletion } from "@/modules/users/hooks/use-cancel-account-deletion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CancelDeletionBannerProps {
	daysRemaining: number;
}

export function CancelDeletionBanner({ daysRemaining }: CancelDeletionBannerProps) {
	const { action, isPending } = useCancelAccountDeletion();

	return (
		<Alert variant="destructive">
			<AlertTriangle className="size-4" />
			<AlertTitle>Suppression programmée</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>
					Votre compte sera définitivement supprimé dans{" "}
					<strong>
						{daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
					</strong>
					. Toutes vos données personnelles seront effacées conformément au RGPD.
				</p>
				<form action={action}>
					<Button type="submit" variant="outline" size="sm" disabled={isPending}>
						{isPending && <Loader2 className="animate-spin" />}
						{isPending ? "Annulation..." : "Annuler la suppression"}
					</Button>
				</form>
			</AlertDescription>
		</Alert>
	);
}
