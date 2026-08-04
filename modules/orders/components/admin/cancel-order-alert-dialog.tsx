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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useCancelOrder } from "@/modules/orders/hooks/use-cancel-order";
import type { InvoiceStatus } from "@/app/generated/prisma/browser";
import { FileWarning } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import { useState } from "react";

export const CANCEL_ORDER_DIALOG_ID = "cancel-order";

interface CancelOrderData {
	orderId: string;
	orderNumber: string;
	isPaid: boolean;
	invoiceStatus?: InvoiceStatus | null;
	invoiceNumber?: string | null;
	[key: string]: unknown;
}

export function CancelOrderAlertDialog() {
	const cancelDialog = useAlertDialog<CancelOrderData>(CANCEL_ORDER_DIALOG_ID);
	const [autoRefund, setAutoRefund] = useState(true);

	const { action, isPending } = useCancelOrder({
		onSuccess: () => {
			cancelDialog.close();
			setAutoRefund(true);
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			cancelDialog.close();
			setAutoRefund(true);
		}
	};

	const isPaid = cancelDialog.data?.isPaid ?? false;
	const hasGeneratedInvoice = cancelDialog.data?.invoiceStatus === "GENERATED";
	const invoiceNumber = cancelDialog.data?.invoiceNumber;

	return (
		// Tonalité alignée sur la gravité réelle : sur une commande FACTURÉE,
		// l'annulation émet un avoir gap-free et devient irréversible (Art. 272-I CGI,
		// cf. le texte du dialogue ci-dessous) → `destructive`. Sans facture, aucun
		// artefact comptable n'est produit → `warning` reste juste.
		<ResponsiveAlertDialog
			open={cancelDialog.isOpen}
			onOpenChange={handleOpenChange}
			tone={hasGeneratedInvoice ? "destructive" : "warning"}
		>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={cancelDialog.data?.orderId ?? ""} />
					<input type="hidden" name="autoRefund" value={isPaid && autoRefund ? "true" : "false"} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Confirmer l'annulation</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription render={<div />}>
							<p>
								Êtes-vous sûr de vouloir annuler la commande{" "}
								<strong>{cancelDialog.data?.orderNumber}</strong> ?
							</p>
							{isPaid && (
								<div className="border-warning/30 bg-warning/10 mt-3 space-y-2 rounded-md border p-3">
									<p className="text-warning">
										Cette commande a été payée. Le statut de paiement passera à REFUNDED.
									</p>
									<label
										htmlFor="cancel-order-auto-refund"
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											id="cancel-order-auto-refund"
											checked={autoRefund}
											onCheckedChange={(v) => setAutoRefund(v === true)}
											disabled={isPending}
										/>
										<span>
											Créer automatiquement le remboursement Stripe (sera traité par le cron)
										</span>
									</label>
									{!autoRefund && (
										<p className="text-muted-foreground text-xs">
											Sans cette option, le remboursement Stripe devra être créé manuellement depuis
											le module Remboursements.
										</p>
									)}
								</div>
							)}
							{hasGeneratedInvoice && (
								<div
									className="border-warning/40 bg-warning/5 mt-3 space-y-1 rounded-md border p-3"
									role="alert"
								>
									<p className="text-foreground flex items-center gap-2 text-sm font-medium">
										<FileWarning className="text-warning size-4" aria-hidden="true" />
										Émission d&apos;un avoir comptable
									</p>
									<p className="text-muted-foreground text-sm">
										Cette commande est facturée
										{invoiceNumber ? (
											<>
												{" "}
												(
												<code className="bg-muted rounded px-1 py-0.5 font-mono text-xs tabular-nums">
													{invoiceNumber}
												</code>
												)
											</>
										) : null}
										. Un avoir{" "}
										<code className="bg-muted rounded px-1 py-0.5 font-mono text-xs tabular-nums">
											A-YYYY-NNNNN
										</code>{" "}
										sera émis automatiquement (Art. 272-I CGI). Cette opération est{" "}
										<strong>irréversible</strong> — l&apos;avoir intègre la séquence comptable
										gap-free.
									</p>
								</div>
							)}
							<p className="text-muted-foreground mt-4 text-sm">
								La commande restera en base de données pour préserver la traçabilité comptable
								(numérotation des factures).
							</p>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Fermer</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <Spinner presentational />}
							{isPending ? "Annulation…" : "Annuler la commande"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
