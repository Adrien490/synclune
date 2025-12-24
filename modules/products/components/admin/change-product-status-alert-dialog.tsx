"use client";

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
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";
import { cn } from "@/shared/utils/cn";

export const CHANGE_PRODUCT_STATUS_DIALOG_ID = "change-product-status";

type ProductStatus = "DRAFT" | "PUBLIC" | "ARCHIVED";

interface ChangeProductStatusData {
	productId: string;
	productTitle: string;
	currentStatus: ProductStatus;
	targetStatus: ProductStatus;
	[key: string]: unknown;
}

const STATUS_CONFIG = {
	DRAFT: {
		label: "Brouillon",
		color: "bg-gray-600 hover:bg-gray-700",
		description:
			"Le bijou sera sauvegardé comme brouillon. Il ne sera pas visible sur la boutique mais restera accessible dans le dashboard pour modifications.",
	},
	PUBLIC: {
		label: "Public",
		color: "bg-green-600 hover:bg-green-700",
		description:
			"Le bijou sera publié sur la boutique et visible par tous les visiteurs. Assure-toi que toutes les informations sont correctes.",
	},
	ARCHIVED: {
		label: "Archivé",
		color: "bg-orange-600 hover:bg-orange-700",
		description:
			"Le bijou sera archivé. Il ne sera plus visible sur la boutique mais restera accessible dans le dashboard. Tu pourras le restaurer à tout moment.",
	},
} as const;

export function ChangeProductStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeProductStatusData>(
		CHANGE_PRODUCT_STATUS_DIALOG_ID
	);

	const { action, isPending } = useToggleProductStatus({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const currentStatus = dialog.data?.currentStatus ?? "DRAFT";
	const targetStatus = dialog.data?.targetStatus ?? "PUBLIC";
	const config = STATUS_CONFIG[targetStatus];

	// Determine if the change is significant (needs confirmation)
	const isSignificantChange =
		(currentStatus === "PUBLIC" && targetStatus !== "PUBLIC") ||
		(currentStatus !== "PUBLIC" && targetStatus === "PUBLIC");

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="productId"
						value={dialog.data?.productId ?? ""}
					/>
					<input type="hidden" name="currentStatus" value={currentStatus} />
					<input type="hidden" name="targetStatus" value={targetStatus} />

					<AlertDialogHeader>
						<AlertDialogTitle>
							Changer le statut en &quot;{config.label}&quot;
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<div>
									Tu es sur le point de changer le statut de{" "}
									<strong>&quot;{dialog.data?.productTitle}&quot;</strong> de{" "}
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
										{targetStatus === "PUBLIC"
											? "⚠️ Le bijou deviendra visible par tous les visiteurs de la boutique."
											: "⚠️ Le bijou ne sera plus visible sur la boutique."}
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
