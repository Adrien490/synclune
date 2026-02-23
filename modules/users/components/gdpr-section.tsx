import type { AccountStatus } from "@/app/generated/prisma/client";
import { Separator } from "@/shared/components/ui/separator";
import { ExportDataButton } from "./export-data-button";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { CancelDeletionBanner } from "./cancel-deletion-banner";
import { Shield } from "lucide-react";

interface GdprSectionProps {
	accountStatus: AccountStatus;
	deletionRequestedAt: Date | null;
}

export function GdprSection({
	accountStatus,
	deletionRequestedAt,
}: GdprSectionProps) {
	const isPendingDeletion = accountStatus === "PENDING_DELETION";

	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-base font-semibold flex items-center gap-2">
					<Shield className="size-4 text-muted-foreground" />
					Données personnelles
				</h2>
				<p className="text-sm text-muted-foreground mt-0.5">
					Gérez vos données conformément au RGPD (Règlement Général sur la
					Protection des Données)
				</p>
			</div>
			<div className="border-t border-border/60 pt-4 space-y-6">
				{isPendingDeletion && deletionRequestedAt && (
					<CancelDeletionBanner
						deletionRequestedAt={deletionRequestedAt}
					/>
				)}

				{/* Export */}
				<div>
					<h4 className="font-medium mb-2">Droit à la portabilité</h4>
					<ExportDataButton />
				</div>

				{!isPendingDeletion && (
					<>
						<Separator />

						{/* Suppression */}
						<div>
							<h4 className="font-medium mb-2">Droit à l&apos;oubli</h4>
							<p className="text-sm text-muted-foreground mb-4">
								Demandez la suppression de votre compte. Un délai de 30
								jours vous permet d&apos;annuler votre demande avant la
								suppression définitive.
							</p>
							<DeleteAccountDialog />
						</div>
					</>
				)}
			</div>
		</section>
	);
}
