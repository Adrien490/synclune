"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useMarkAsFullyRefunded } from "@/modules/orders/hooks/use-mark-as-fully-refunded";
import type { InvoiceStatus } from "@/app/generated/prisma/browser";
import { Banknote, FileWarning, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";

export const MARK_AS_FULLY_REFUNDED_DIALOG_ID = "mark-as-fully-refunded";

type ManualRefundMethod = "wire" | "check" | "goodwill" | "cash" | "other";

const MANUAL_REFUND_METHODS: ReadonlyArray<{ value: ManualRefundMethod; label: string }> = [
	{ value: "wire", label: "Virement bancaire" },
	{ value: "check", label: "Chèque" },
	{ value: "goodwill", label: "Geste commercial" },
	{ value: "cash", label: "Espèces" },
	{ value: "other", label: "Autre" },
];

interface MarkAsFullyRefundedData {
	orderId: string;
	orderNumber: string;
	invoiceStatus?: InvoiceStatus | null;
	invoiceNumber?: string | null;
	[key: string]: unknown;
}

export function MarkAsFullyRefundedAlertDialog() {
	const dialog = useAlertDialog<MarkAsFullyRefundedData>(MARK_AS_FULLY_REFUNDED_DIALOG_ID);
	const [reason, setReason] = useState("");
	const [method, setMethod] = useState<ManualRefundMethod | "">("");

	const { action, isPending } = useMarkAsFullyRefunded({
		onSuccess: () => {
			dialog.close();
			setReason("");
			setMethod("");
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
			setReason("");
			setMethod("");
		}
	};

	const hasGeneratedInvoice = dialog.data?.invoiceStatus === "GENERATED";
	const invoiceNumber = dialog.data?.invoiceNumber;

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={handleOpenChange} tone="warning">
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={dialog.data?.orderId ?? ""} />
					{reason.trim() ? <input type="hidden" name="reason" value={reason.trim()} /> : null}
					<input type="hidden" name="manualRefundMethod" value={method} />

					<ResponsiveAlertDialogHeroIcon icon={Banknote} />
					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>
							Marquer comme entièrement remboursée
						</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription asChild>
							<div>
								<p>
									Marquer la commande <strong>{dialog.data?.orderNumber}</strong> comme remboursée
									manuellement hors Stripe.
								</p>
								<div className="bg-muted/50 mt-3 space-y-1 rounded-md border p-3 text-sm">
									<p className="text-foreground font-medium">Cas d&apos;usage :</p>
									<ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
										<li>Remboursement par virement bancaire ou chèque</li>
										<li>Geste commercial (échange marchandise, avoir boutique)</li>
										<li>Régularisation après PARTIALLY_REFUNDED Stripe</li>
									</ul>
									<p className="text-muted-foreground mt-2 text-xs">
										<strong>Aucun appel Stripe ne sera effectué.</strong> Pour rembourser via
										Stripe, utiliser plutôt le module Remboursements.
									</p>
								</div>
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
											sera émis automatiquement (Art. 272-I CGI).
										</p>
									</div>
								)}
								<div className="mt-3 space-y-1.5">
									<Label htmlFor="mark-as-fully-refunded-method" className="text-sm">
										Moyen du remboursement <span className="text-destructive">*</span>
									</Label>
									<Select
										value={method}
										onValueChange={(v) => setMethod(v as ManualRefundMethod)}
										disabled={isPending}
									>
										<SelectTrigger id="mark-as-fully-refunded-method">
											<SelectValue placeholder="Sélectionner…" />
										</SelectTrigger>
										<SelectContent>
											{MANUAL_REFUND_METHODS.map((m) => (
												<SelectItem key={m.value} value={m.value}>
													{m.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-muted-foreground text-xs">
										Tracé dans l&apos;audit Art. L123-22 pour distinguer du remboursement Stripe.
									</p>
								</div>

								<div className="mt-3 space-y-1.5">
									<Label htmlFor="mark-as-fully-refunded-reason" className="text-sm">
										Motif (optionnel)
									</Label>
									<Textarea
										id="mark-as-fully-refunded-reason"
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										placeholder="Virement bancaire reçu le ../../...., geste commercial..."
										rows={2}
										disabled={isPending}
										maxLength={500}
									/>
									<p className="text-muted-foreground text-xs">
										Apparaîtra dans la timeline d&apos;audit et la note Refund.
									</p>
								</div>
							</div>
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Fermer</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Marquage…" : "Marquer comme remboursée"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
