"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
	type ResponsiveAlertTone,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";
import { Archive, FileText, Globe } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import type { ComponentType } from "react";

export const CHANGE_COLLECTION_STATUS_DIALOG_ID = "change-collection-status";

interface ChangeCollectionStatusData {
	collectionId: string;
	collectionName: string;
	currentStatus: CollectionStatus;
	targetStatus: CollectionStatus;
	[key: string]: unknown;
}

const STATUS_CONFIG: Record<
	CollectionStatus,
	{
		label: string;
		tone: ResponsiveAlertTone;
		icon: ComponentType<{ className?: string }>;
		description: string;
	}
> = {
	[CollectionStatus.DRAFT]: {
		label: "Brouillon",
		tone: "neutral",
		icon: FileText,
		description:
			"La collection sera sauvegardee comme brouillon. Elle ne sera pas visible sur la boutique mais restera accessible dans le dashboard pour modifications.",
	},
	[CollectionStatus.PUBLIC]: {
		label: "Public",
		tone: "success",
		icon: Globe,
		description:
			"La collection sera publiee sur la boutique et visible par tous les visiteurs. Assurez-vous que toutes les informations sont correctes.",
	},
	[CollectionStatus.ARCHIVED]: {
		label: "Archivee",
		tone: "warning",
		icon: Archive,
		description:
			"La collection sera archivee. Elle ne sera plus visible sur la boutique mais restera accessible dans le dashboard. Vous pourrez la restaurer a tout moment.",
	},
};

export function ChangeCollectionStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeCollectionStatusData>(CHANGE_COLLECTION_STATUS_DIALOG_ID);

	const { action, isPending } = useUpdateCollectionStatus({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const currentStatus = dialog.data?.currentStatus ?? CollectionStatus.DRAFT;
	const targetStatus = dialog.data?.targetStatus ?? CollectionStatus.PUBLIC;
	const config = STATUS_CONFIG[targetStatus];

	// Determine if the change is significant (needs confirmation)
	const isSignificantChange =
		(currentStatus === CollectionStatus.PUBLIC && targetStatus !== CollectionStatus.PUBLIC) ||
		(currentStatus !== CollectionStatus.PUBLIC && targetStatus === CollectionStatus.PUBLIC);

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone={config.tone}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.collectionId ?? ""} />
					<input type="hidden" name="status" value={targetStatus} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Changer le statut en &quot;{config.label}&quot;
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div className="space-y-4">
								<div>
									Vous êtes sur le point de changer le statut de{" "}
									<strong>&quot;{dialog.data?.collectionName}&quot;</strong> de{" "}
									<span className="font-semibold">{STATUS_CONFIG[currentStatus].label}</span> vers{" "}
									<span className="font-semibold">{config.label}</span>.
								</div>

								<div className="bg-muted rounded-md p-3">
									<div className="text-sm">{config.description}</div>
								</div>

								{isSignificantChange && (
									<div className="text-muted-foreground text-xs">
										{targetStatus === CollectionStatus.PUBLIC
											? "La collection deviendra visible par tous les visiteurs de la boutique."
											: "La collection ne sera plus visible sur la boutique."}
									</div>
								)}
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Changement en cours…" : `Changer en ${config.label}`}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
