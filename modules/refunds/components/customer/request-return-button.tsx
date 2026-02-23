"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { RefundReason } from "@/app/generated/prisma/client";
import { requestReturn } from "@/modules/refunds/actions/request-return";
import { REFUND_REASON_LABELS } from "@/modules/refunds/constants/refund.constants";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
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

const CUSTOMER_REASONS = [
	RefundReason.CUSTOMER_REQUEST,
	RefundReason.DEFECTIVE,
	RefundReason.WRONG_ITEM,
] as const;

interface RequestReturnButtonProps {
	orderId: string;
	daysRemaining: number;
}

export function RequestReturnButton({
	orderId,
	daysRemaining,
}: RequestReturnButtonProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");

	const [, action, isPending] = useActionState(
		withCallbacks(
			requestReturn,
			createToastCallbacks({
				onSuccess: () => {
					setOpen(false);
					setReason("");
					router.refresh();
				},
			})
		),
		undefined
	);

	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold flex items-center gap-2">
				<RotateCcw className="size-4 text-muted-foreground" />
				Retour
			</h2>
			<div className="border-t border-border/60 pt-4">
				<Button
					variant="outline"
					className="w-full"
					onClick={() => setOpen(true)}
				>
					<RotateCcw className="h-4 w-4 mr-2" />
					Demander un retour
				</Button>
			</div>

			<ResponsiveDialog
				open={open}
				onOpenChange={(value) => {
					if (!value && !isPending) {
						setOpen(false);
						setReason("");
					}
				}}
			>
				<ResponsiveDialogContent className="max-w-lg">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>
							Demander un retour
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Il vous reste {daysRemaining} jour(s) pour exercer
							votre droit de rétractation.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<form action={action} className="space-y-4">
						<input type="hidden" name="orderId" value={orderId} />
						<input type="hidden" name="reason" value={reason} />

						<div className="space-y-2">
							<Label htmlFor="return-reason">
								Motif du retour
							</Label>
							<Select
								value={reason}
								onValueChange={setReason}
								disabled={isPending}
							>
								<SelectTrigger id="return-reason">
									<SelectValue placeholder="Sélectionner un motif" />
								</SelectTrigger>
								<SelectContent>
									{CUSTOMER_REASONS.map((key) => (
										<SelectItem key={key} value={key}>
											{REFUND_REASON_LABELS[key]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="return-message">
								Précisions sur votre demande (facultatif)
							</Label>
							<Textarea
								id="return-message"
								name="message"
								placeholder="Décrivez la raison de votre retour..."
								maxLength={500}
								rows={3}
								disabled={isPending}
							/>
						</div>

						<ResponsiveDialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setOpen(false);
									setReason("");
								}}
								disabled={isPending}
							>
								Annuler
							</Button>
							<Button
								type="submit"
								disabled={!reason || isPending}
							>
								{isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Envoi...
									</>
								) : (
									"Envoyer la demande"
								)}
							</Button>
						</ResponsiveDialogFooter>
					</form>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</section>
	);
}
