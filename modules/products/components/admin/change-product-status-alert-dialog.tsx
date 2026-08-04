"use client";

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
import { PRODUCT_STATUS_LABELS } from "@/modules/products/constants/product-status-display";
import { useToggleProductStatus } from "@/modules/products/hooks/use-toggle-product-status";
import { Archive, FileText, Globe } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import type { ComponentType } from "react";

export const CHANGE_PRODUCT_STATUS_DIALOG_ID = "change-product-status";

type ProductStatus = "DRAFT" | "PUBLIC" | "ARCHIVED";

interface ChangeProductStatusData {
	productId: string;
	productTitle: string;
	currentStatus: ProductStatus;
	targetStatus: ProductStatus;
	[key: string]: unknown;
}

const STATUS_CONFIG: Record<
	ProductStatus,
	{
		label: string;
		tone: ResponsiveAlertTone;
		icon: ComponentType<{ className?: string }>;
		description: string;
	}
> = {
	DRAFT: {
		label: PRODUCT_STATUS_LABELS.DRAFT,
		tone: "neutral",
		icon: FileText,
		description:
			"Le bijou sera sauvegardé comme brouillon. Il ne sera pas visible sur la boutique mais restera accessible dans le dashboard pour modifications.",
	},
	PUBLIC: {
		label: PRODUCT_STATUS_LABELS.PUBLIC,
		tone: "success",
		icon: Globe,
		description:
			"Le bijou sera publié sur la boutique et visible par tous les visiteurs. Assurez-vous que toutes les informations sont correctes.",
	},
	ARCHIVED: {
		label: PRODUCT_STATUS_LABELS.ARCHIVED,
		tone: "warning",
		icon: Archive,
		description:
			"Le bijou sera archivé. Il ne sera plus visible sur la boutique mais restera accessible dans le dashboard. Toutes ses variantes seront désactivées. Vous pourrez le restaurer à tout moment (il reviendra en brouillon).",
	},
};

export function ChangeProductStatusAlertDialog() {
	const dialog = useAlertDialog<ChangeProductStatusData>(CHANGE_PRODUCT_STATUS_DIALOG_ID);

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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone={config.tone}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="productId" value={dialog.data?.productId ?? ""} />
					<input type="hidden" name="currentStatus" value={currentStatus} />
					<input type="hidden" name="targetStatus" value={targetStatus} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Changer le statut en &quot;{config.label}&quot;
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div className="space-y-4" />}>
							<div>
								Vous êtes sur le point de changer le statut de{" "}
								<strong>&quot;{dialog.data?.productTitle}&quot;</strong> de{" "}
								<span className="font-semibold">{STATUS_CONFIG[currentStatus].label}</span> vers{" "}
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
