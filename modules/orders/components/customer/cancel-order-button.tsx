"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Loader2 } from "lucide-react";
import { cancelOrderCustomer } from "@/modules/orders/actions/cancel-order-customer";
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

interface CancelOrderButtonProps {
	orderId: string;
}

export function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	const [, action, isPending] = useActionState(
		withCallbacks(
			cancelOrderCustomer,
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
		<section className="space-y-4">
			<h2 className="text-base font-semibold">Annulation</h2>
			<div className="border-border/60 border-t pt-4">
				<Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
					<XCircle className="mr-2 h-4 w-4" />
					Annuler la commande
				</Button>
			</div>

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
						<ResponsiveDialogTitle>Annuler la commande</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible. Si le
							paiement a déjà été effectué, un remboursement sera initié.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<form action={action}>
						<input type="hidden" name="id" value={orderId} />

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
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
		</section>
	);
}
