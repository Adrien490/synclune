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
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useMarkAsProcessing } from "@/modules/orders/hooks/use-mark-as-processing";
import { Spinner } from "@/shared/components/ui/spinner";

export const MARK_AS_PROCESSING_DIALOG_ID = "mark-as-processing";

interface MarkAsProcessingData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

export function MarkAsProcessingAlertDialog() {
	const dialog = useAlertDialog<MarkAsProcessingData>(MARK_AS_PROCESSING_DIALOG_ID);

	const { action, isPending } = useMarkAsProcessing({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="info">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Passer en préparation</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Êtes-vous sûr de vouloir passer la commande{" "}
									<strong>{dialog.data?.orderNumber}</strong> en préparation ?
								</p>
								<p className="text-muted-foreground mt-4 text-sm">
									Le statut passera de "En attente" à "En préparation". Vous pourrez ensuite
									l'expédier une fois le colis prêt.
								</p>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Passage…" : "Passer en préparation"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
