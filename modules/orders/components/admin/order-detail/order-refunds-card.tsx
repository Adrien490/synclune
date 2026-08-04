import { type RefundStatus } from "@/app/generated/prisma/browser";
import {
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { formatDateShort } from "@/shared/utils/dates";
import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderRefundsCardProps } from "./types";

export function OrderRefundsCard({
	refunds,
	canRefund,
	stripePaymentIntentId,
}: OrderRefundsCardProps) {
	// Ne pas afficher si aucun remboursement et pas éligible
	if (refunds.length === 0 && !canRefund) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<ArrowCounterClockwiseIcon className="size-5" aria-hidden="true" />
					Remboursements
					{refunds.length > 0 && (
						<Badge variant="secondary" className="ml-1">
							{refunds.length}
						</Badge>
					)}
				</CardTitle>
				{/* Lot 2 S3.3 — le remboursement se fait dans le dashboard Stripe : le
				    webhook charge.refunded crée la ligne ici, émet l'avoir et l'email.
				    « Marquer remboursée » (hors Stripe, irréversible) reste dans la
				    section `danger` du menu d'actions. */}
				{canRefund && stripePaymentIntentId && (
					<Button
						variant="outline"
						size="sm"
						render={
							// eslint-disable-next-line jsx-a11y/anchor-has-content -- prop `render` Base UI : le contenu accessible est porté par les enfants du Button
							<a
								href={`https://dashboard.stripe.com/payments/${stripePaymentIntentId}`}
								target="_blank"
								rel="noopener noreferrer"
							/>
						}
					>
						Rembourser dans Stripe
						<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{refunds.length === 0 ? (
					<p className="text-muted-foreground text-sm">Aucun remboursement pour cette commande.</p>
				) : (
					<div className="space-y-3">
						{refunds.map((refund) => (
							<div
								key={refund.id}
								className="flex items-center justify-between gap-4 rounded-lg border p-3"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant={REFUND_STATUS_VARIANTS[refund.status as RefundStatus]}>
											{REFUND_STATUS_LABELS[refund.status as RefundStatus] || refund.status}
										</Badge>
										<span className="text-sm font-medium">{formatEuro(refund.amount)}</span>
									</div>
									<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
										<span>
											{REFUND_REASON_LABELS[refund.reason as keyof typeof REFUND_REASON_LABELS] ||
												refund.reason}
										</span>
										<span>•</span>
										<span>{formatDateShort(new Date(refund.createdAt))}</span>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									render={<Link href={`/admin/ventes/remboursements/${refund.id}`} />}
								>
									<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
									<span className="sr-only">Voir le détail du remboursement</span>
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
