import { CreditCard, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CopyButton } from "@/shared/components/copy-button";
import { DetailInfoList, DetailInfoRow } from "@/shared/components/admin/detail-info-row";
import type { OrderPaymentCardProps } from "./types";

export function OrderPaymentCard({ order }: OrderPaymentCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="size-5" aria-hidden="true" />
					Paiement
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* `stacked` : l'identifiant Stripe `pi_…` ne tient pas à côté de son libellé. */}
				<DetailInfoList orientation="stacked">
					<DetailInfoRow label="Méthode" valueClassName="capitalize">
						{order.paymentMethod}
					</DetailInfoRow>
					{order.paidAt && (
						<DetailInfoRow label="Date de paiement">
							{format(order.paidAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</DetailInfoRow>
					)}
					{order.stripePaymentIntentId && (
						<DetailInfoRow label="Stripe Payment Intent">
							<div className="flex items-center gap-2">
								<code className="bg-muted max-w-[150px] truncate rounded px-1.5 py-0.5 text-xs tabular-nums">
									{order.stripePaymentIntentId}
								</code>
								<CopyButton
									text={order.stripePaymentIntentId}
									label="Payment Intent"
									className="size-6 p-0"
									size="icon"
								/>
								<Button
									variant="ghost"
									size="sm"
									className="size-6 p-0"
									render={
										<a
											href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Voir sur Stripe (s'ouvre dans un nouvel onglet)"
										/>
									}
								>
									<ExternalLink className="size-3" aria-hidden="true" />
								</Button>
							</div>
						</DetailInfoRow>
					)}
				</DetailInfoList>
			</CardContent>
		</Card>
	);
}
