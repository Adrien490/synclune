"use client";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useCancelAccountDeletion } from "@/modules/users/hooks/use-cancel-account-deletion";
import { TriangleAlert, LoaderCircle } from "lucide-react";

interface CancelDeletionBannerProps {
	daysRemaining: number;
}

export function CancelDeletionBanner({ daysRemaining }: CancelDeletionBannerProps) {
	const { action, isPending } = useCancelAccountDeletion();

	return (
		<Alert variant="destructive">
			<TriangleAlert className="size-4" />
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
						{isPending && <LoaderCircle className="animate-spin" />}
						{isPending ? "Annulation..." : "Annuler la suppression"}
					</Button>
				</form>
			</AlertDescription>
		</Alert>
	);
}
