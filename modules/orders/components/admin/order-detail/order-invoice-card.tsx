import { ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import type { OrderInvoiceCardProps } from "./types";

export function OrderInvoiceCard({ order }: OrderInvoiceCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5" aria-hidden="true" />
					Facture
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<p className="text-sm text-muted-foreground">
						Numéro de facture
					</p>
					<p className="font-mono">{order.invoiceNumber}</p>
				</div>
				{order.invoiceGeneratedAt && (
					<div>
						<p className="text-sm text-muted-foreground">Générée le</p>
						<p>
							{format(order.invoiceGeneratedAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</p>
					</div>
				)}
				{order.stripeInvoiceId && (
					<Button variant="outline" size="sm" className="w-full" asChild>
						<a
							href={`https://dashboard.stripe.com/invoices/${order.stripeInvoiceId}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink className="h-4 w-4" aria-hidden="true" />
							Voir sur Stripe
							<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
						</a>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
