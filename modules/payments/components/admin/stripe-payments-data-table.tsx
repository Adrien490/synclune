import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { GetStripePaymentsReturn } from "@/modules/payments/data/get-stripe-payments";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard } from "lucide-react";
import Link from "next/link";
import { StripePaymentsRowActions } from "./stripe-payments-row-actions";

interface StripePaymentsDataTableProps {
	paymentsPromise: Promise<GetStripePaymentsReturn>;
}

// Helper pour formater les prix en euros (format français)
const formatPrice = (priceInCents: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(priceInCents / 100);
};

export async function StripePaymentsDataTable({
	paymentsPromise,
}: StripePaymentsDataTableProps) {
	const { payments, pagination } = await paymentsPromise;

	if (payments.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<CreditCard />
					</EmptyMedia>
					<EmptyTitle>Aucun paiement trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun paiement ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des paiements" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[18%]">Commande</TableHead>
								<TableHead scope="col" className="w-[22%]">Client</TableHead>
								<TableHead scope="col" className="w-[12%] text-right">Montant</TableHead>
								<TableHead scope="col" className="w-[14%] text-center">Statut</TableHead>
								<TableHead scope="col" className="hidden lg:table-cell w-[14%]">
									Payé le
								</TableHead>
								<TableHead scope="col" className="hidden xl:table-cell w-[16%]">
									Stripe ID
								</TableHead>
								<TableHead scope="col" className="w-[10%] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{payments.map((payment) => {
								const isPaid = payment.paymentStatus === "PAID";

								return (
									<TableRow key={payment.id}>
										{/* Commande */}
										<TableCell>
											<Link
												href={`/dashboard/orders/${payment.id}`}
												className="font-medium text-foreground hover:underline"
											>
												{payment.orderNumber}
											</Link>
										</TableCell>

										{/* Client */}
										<TableCell>
											{payment.user ? (
												<div className="flex flex-col">
													<span className="font-medium text-sm">
														{payment.user.name}
													</span>
													<span className="text-xs text-muted-foreground truncate">
														{payment.user.email}
													</span>
												</div>
											) : (
												<span className="text-sm text-muted-foreground">
													Invité
												</span>
											)}
										</TableCell>

										{/* Montant */}
										<TableCell className="text-right font-semibold">
											{formatPrice(payment.total)}
										</TableCell>

										{/* Statut */}
										<TableCell className="text-center">
											<Badge
												variant={PAYMENT_STATUS_VARIANTS[payment.paymentStatus]}
												className={isPaid ? "bg-green-600" : ""}
											>
												{PAYMENT_STATUS_LABELS[payment.paymentStatus]}
											</Badge>
										</TableCell>

										{/* Payé le */}
										<TableCell className="hidden lg:table-cell text-sm">
											{payment.paidAt
												? format(new Date(payment.paidAt), "d MMM yyyy", {
														locale: fr,
													})
												: "-"}
										</TableCell>

										{/* Stripe ID */}
										<TableCell className="hidden xl:table-cell">
											{payment.stripePaymentIntentId ? (
												<span
													className="font-mono text-xs truncate block"
													title={payment.stripePaymentIntentId}
												>
													{payment.stripePaymentIntentId}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</TableCell>

										{/* Actions */}
										<TableCell className="text-right">
											<StripePaymentsRowActions payment={payment} />
										</TableCell>
									</TableRow>
								);
								})}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell colSpan={8} className="text-center py-4">
									<CursorPagination
										perPage={payments.length}
										hasNextPage={pagination.hasNextPage}
										hasPreviousPage={pagination.hasPreviousPage}
										currentPageSize={payments.length}
										nextCursor={pagination.nextCursor}
										prevCursor={pagination.prevCursor}
									/>
								</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
