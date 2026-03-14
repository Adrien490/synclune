import type { AccountStatus } from "@/app/generated/prisma/client";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { CancelDeletionBanner } from "./cancel-deletion-banner";

interface GdprSectionProps {
	accountStatus: AccountStatus;
	daysRemaining: number;
}

export function GdprSection({ accountStatus, daysRemaining }: GdprSectionProps) {
	const isPendingDeletion = accountStatus === "PENDING_DELETION";

	return (
		<section className="space-y-4" aria-labelledby="gdpr-heading">
			<h2 id="gdpr-heading" className="text-base font-semibold">
				Données personnelles
			</h2>
			<div className="border-border/60 space-y-6 border-t pt-4">
				{isPendingDeletion && daysRemaining > 0 && (
					<CancelDeletionBanner daysRemaining={daysRemaining} />
				)}

				{!isPendingDeletion && (
					<div>
						<h4 className="mb-2 font-medium">Supprimer mon compte</h4>
						<p className="text-muted-foreground mb-4 text-sm">
							Délai de 30 jours avant suppression définitive.
						</p>
						<DeleteAccountDialog />
					</div>
				)}
			</div>
		</section>
	);
}
