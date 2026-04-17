"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleX, LoaderCircle } from "lucide-react";

import { cancelCustomizationRequestCustomer } from "@/modules/customizations/actions/cancel-customization-request-customer";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface CancelCustomizationButtonProps {
	requestId: string;
}

export function CancelCustomizationButton({ requestId }: CancelCustomizationButtonProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	const [, action, isPending] = useActionState(
		withCallbacks(
			cancelCustomizationRequestCustomer,
			createToastCallbacks({
				onSuccess: () => {
					setOpen(false);
					router.refresh();
				},
			}),
		),
		undefined,
	);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full"
				onClick={() => setOpen(true)}
			>
				<CircleX className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
				Annuler la demande
			</Button>

			<ResponsiveDialog
				open={open}
				onOpenChange={(value) => {
					if (!value && !isPending) {
						setOpen(false);
					}
				}}
			>
				<ResponsiveDialogContent className="max-w-lg">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Annuler la demande de personnalisation</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Êtes-vous sûr de vouloir annuler cette demande ? Vous recevrez un email de
							confirmation. Cette action est irréversible.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<form action={action}>
						<input type="hidden" name="requestId" value={requestId} />

						<ResponsiveDialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={isPending}
							>
								Ne pas annuler
							</Button>
							<Button type="submit" variant="destructive" disabled={isPending}>
								{isPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
										Annulation...
									</>
								) : (
									"Confirmer l'annulation"
								)}
							</Button>
						</ResponsiveDialogFooter>
					</form>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
