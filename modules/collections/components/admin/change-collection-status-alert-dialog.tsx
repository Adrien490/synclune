"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { ConfirmDialog } from "@/shared/components/dialogs/confirm-dialog";
import type { AlertActionTone } from "@/shared/components/ui/alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";
import { ArchiveIcon, FileTextIcon, GlobeIcon } from "@phosphor-icons/react/ssr";
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
		tone: AlertActionTone;
		icon: ComponentType<{ className?: string }>;
		description: string;
	}
> = {
	[CollectionStatus.DRAFT]: {
		label: "Brouillon",
		tone: "neutral",
		icon: FileTextIcon,
		description:
			"La collection sera sauvegardee comme brouillon. Elle ne sera pas visible sur la boutique mais restera accessible dans le dashboard pour modifications.",
	},
	[CollectionStatus.PUBLIC]: {
		label: "Public",
		tone: "success",
		icon: GlobeIcon,
		description:
			"La collection sera publiee sur la boutique et visible par tous les visiteurs. Assurez-vous que toutes les informations sont correctes.",
	},
	[CollectionStatus.ARCHIVED]: {
		label: "Archivee",
		tone: "warning",
		icon: ArchiveIcon,
		description:
			"La collection sera archivee. Elle ne sera plus visible sur la boutique mais restera accessible dans le dashboard. Vous pourrez la restaurer a tout moment.",
	},
};

export function ChangeCollectionStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeCollectionStatusData>(CHANGE_COLLECTION_STATUS_DIALOG_ID);
	const { action } = useUpdateCollectionStatus();

	const currentStatus = dialog.data?.currentStatus ?? CollectionStatus.DRAFT;
	const targetStatus = dialog.data?.targetStatus ?? CollectionStatus.PUBLIC;
	const config = STATUS_CONFIG[targetStatus];

	// Determine if the change is significant (needs confirmation)
	const isSignificantChange =
		(currentStatus === CollectionStatus.PUBLIC && targetStatus !== CollectionStatus.PUBLIC) ||
		(currentStatus !== CollectionStatus.PUBLIC && targetStatus === CollectionStatus.PUBLIC);

	return (
		<ConfirmDialog
			open={dialog.isOpen}
			onClose={dialog.close}
			action={action}
			tone={config.tone}
			fields={{ id: dialog.data?.collectionId, status: targetStatus }}
			title={`Changer le statut en "${config.label}"`}
			confirmLabel={`Changer en ${config.label}`}
			descriptionClassName="space-y-4"
			description={
				<>
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
				</>
			}
		/>
	);
}
