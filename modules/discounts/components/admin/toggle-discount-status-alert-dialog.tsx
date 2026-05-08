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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useToggleDiscountStatus } from "@/modules/discounts/hooks/use-toggle-discount-status";
import { cn } from "@/shared/utils/cn";
import { LoaderCircle } from "lucide-react";

export const TOGGLE_DISCOUNT_STATUS_DIALOG_ID = "toggle-discount-status";

interface ToggleDiscountStatusData {
	discountId: string;
	discountCode: string;
	isActive: boolean;
	[key: string]: unknown;
}

export function ToggleDiscountStatusAlertDialog() {
	const dialog = useAlertDialog<ToggleDiscountStatusData>(TOGGLE_DISCOUNT_STATUS_DIALOG_ID);
	const haptic = useHaptic();

	const { action, isPending } = useToggleDiscountStatus({
		onSuccess: () => {
			haptic("success");
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
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.discountId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							{isActive ? "Désactiver" : "Activer"} le code promo
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
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
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							onClick={() => haptic("medium")}
							className={cn(
								"text-white",
								isActive ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700",
							)}
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "En cours…" : isActive ? "Désactiver" : "Activer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
