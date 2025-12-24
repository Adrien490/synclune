"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateCollectionStatus } from "@/modules/collections/hooks/use-update-collection-status";
import { cn } from "@/shared/utils/cn";

export const CHANGE_COLLECTION_STATUS_DIALOG_ID = "change-collection-status";

interface ChangeCollectionStatusData {
	collectionId: string;
	collectionName: string;
	currentStatus: CollectionStatus;
	targetStatus: CollectionStatus;
	[key: string]: unknown;
}

const STATUS_CONFIG = {
	[CollectionStatus.DRAFT]: {
		label: "Brouillon",
		color: "bg-gray-600 hover:bg-gray-700",
		description:
			"La collection sera sauvegardee comme brouillon. Elle ne sera pas visible sur la boutique mais restera accessible dans le dashboard pour modifications.",
	},
	[CollectionStatus.PUBLIC]: {
		label: "Public",
		color: "bg-green-600 hover:bg-green-700",
		description:
			"La collection sera publiee sur la boutique et visible par tous les visiteurs. Assure-toi que toutes les informations sont correctes.",
	},
	[CollectionStatus.ARCHIVED]: {
		label: "Archivee",
		color: "bg-orange-600 hover:bg-orange-700",
		description:
			"La collection sera archivee. Elle ne sera plus visible sur la boutique mais restera accessible dans le dashboard. Tu pourras la restaurer a tout moment.",
	},
} as const;

export function ChangeCollectionStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeCollectionStatusData>(
		CHANGE_COLLECTION_STATUS_DIALOG_ID
	);

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
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={dialog.data?.collectionId ?? ""}
					/>
					<input type="hidden" name="status" value={targetStatus} />

					<AlertDialogHeader>
						<AlertDialogTitle>
							Changer le statut en &quot;{config.label}&quot;
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<div>
									Tu es sur le point de changer le statut de{" "}
									<strong>&quot;{dialog.data?.collectionName}&quot;</strong> de{" "}
									<span className="font-semibold">
										{STATUS_CONFIG[currentStatus].label}
									</span>{" "}
									vers{" "}
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
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							className={cn("text-white", config.color)}
						>
							{isPending ? "Changement en cours..." : `Changer en ${config.label}`}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
