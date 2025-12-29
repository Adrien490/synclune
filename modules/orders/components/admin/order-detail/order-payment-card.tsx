import { CreditCard, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CopyButton } from "@/shared/components/copy-button";
import type { OrderPaymentCardProps } from "./types";

export function OrderPaymentCard({ order }: OrderPaymentCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="h-5 w-5" aria-hidden="true" />
					Paiement
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{order.paymentMethod && (
					<div>
						<p className="text-sm text-muted-foreground">Méthode</p>
						<p className="capitalize">{order.paymentMethod}</p>
					</div>
				)}
				{order.paidAt && (
					<div>
						<p className="text-sm text-muted-foreground">Date de paiement</p>
						<p>
							{format(order.paidAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</p>
					</div>
				)}
				{order.stripePaymentIntentId && (
					<div>
						<p className="text-sm text-muted-foreground">
							Stripe Payment Intent
						</p>
						<div className="flex items-center gap-2">
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
								{order.stripePaymentIntentId}
							</code>
							<CopyButton
								text={order.stripePaymentIntentId}
								label="Payment Intent"
								className="h-6 w-6 p-0"
								size="icon"
							/>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								asChild
							>
								<a
									href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="Voir sur Stripe (s'ouvre dans un nouvel onglet)"
								>
									<ExternalLink className="h-3 w-3" aria-hidden="true" />
								</a>
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
