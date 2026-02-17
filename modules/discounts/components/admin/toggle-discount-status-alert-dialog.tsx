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
import { useToggleDiscountStatus } from "@/modules/discounts/hooks/use-toggle-discount-status";
import { cn } from "@/shared/utils/cn";

export const TOGGLE_DISCOUNT_STATUS_DIALOG_ID = "toggle-discount-status";

interface ToggleDiscountStatusData {
	discountId: string;
	discountCode: string;
	isActive: boolean;
	[key: string]: unknown;
}

export function ToggleDiscountStatusAlertDialog() {
	const dialog = useAlertDialog<ToggleDiscountStatusData>(
		TOGGLE_DISCOUNT_STATUS_DIALOG_ID
	);

	const { action, isPending } = useToggleDiscountStatus({
		onSuccess: () => {
			dialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	const isActive = dialog.data?.isActive ?? true;
	const targetState = isActive ? "désactiver" : "activer";

	return (
		<AlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={dialog.data?.discountId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>
							{isActive ? "Désactiver" : "Activer"} le code promo
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<div>
									Vous êtes sur le point de {targetState} le code promo{" "}
									<strong>&quot;{dialog.data?.discountCode}&quot;</strong>.
								</div>

								<div className="bg-muted rounded-md p-3">
									<div className="text-sm">
										{isActive
											? "Le code ne sera plus utilisable par les clients. Vous pourrez le réactiver à tout moment."
											: "Le code redeviendra utilisable par les clients (sous réserve des autres conditions de validité)."}
									</div>
								</div>
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
							className={cn(
								"text-white",
								isActive
									? "bg-orange-600 hover:bg-orange-700"
									: "bg-green-600 hover:bg-green-700"
							)}
						>
							{isPending ? "En cours..." : isActive ? "Désactiver" : "Activer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
