"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ExternalLink, Eye, MoreVertical, RefreshCw } from "lucide-react";
import { useState } from "react";

interface StripePaymentsRowActionsProps {
	payment: {
		id: string;
		orderNumber: string;
		paymentStatus: string;
		stripePaymentIntentId: string | null;
		total: number;
	};
}

export function StripePaymentsRowActions({
	payment,
}: StripePaymentsRowActionsProps) {
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const canRefund = payment.paymentStatus === "PAID";

	const handleRefund = async () => {
		if (!confirm("Êtes-vous sûr de vouloir rembourser ce paiement ?")) return;

		setIsProcessing(true);
		try {
			const response = await fetch(`/api/payments/refund/${payment.id}`, {
				method: "POST",
			});

			if (!response.ok) throw new Error("Failed to refund payment");

			window.location.reload();
		} catch {
			// console.error("Error refunding payment:", error);
			alert("Erreur lors du remboursement");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => setIsViewDialogOpen(true)}>
						<Eye className="h-4 w-4" />
						Voir les détails
					</DropdownMenuItem>
					{payment.stripePaymentIntentId && (
						<DropdownMenuItem asChild>
							<a
								href={`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="h-4 w-4" />
								Voir sur Stripe
							</a>
						</DropdownMenuItem>
					)}
					{canRefund && (
						<DropdownMenuItem onClick={handleRefund} disabled={isProcessing}>
							<RefreshCw className="h-4 w-4" />
							Rembourser
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Détails du paiement</DialogTitle>
						<DialogDescription>
							Commande: {payment.orderNumber}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<h4 className="font-semibold text-sm mb-1">Montant</h4>
								<p className="text-2xl font-bold">
									{(payment.total / 100).toFixed(2)}€
								</p>
							</div>
							<div>
								<h4 className="font-semibold text-sm mb-1">Statut</h4>
								<p className="text-lg">{payment.paymentStatus}</p>
							</div>
						</div>
						{payment.stripePaymentIntentId && (
							<div>
								<h4 className="font-semibold text-sm mb-1">
									Stripe Payment Intent ID
								</h4>
								<p className="font-mono text-sm bg-muted p-2 rounded">
									{payment.stripePaymentIntentId}
								</p>
							</div>
						)}
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Pour plus de détails, consultez le{" "}
								<a
									href={`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-foreground hover:underline"
								>
									dashboard Stripe
								</a>
							</p>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
