import { type OrderStatus, type PaymentStatus } from "@/app/generated/prisma/client";
import { Badge } from "@/shared/components/ui/badge";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/shared/utils/cn";
import {
	ArrowUUpLeftIcon,
	CheckCircleIcon,
	ClockIcon,
	CreditCardIcon,
	PackageIcon,
	TruckIcon,
	XCircleIcon,
} from "@phosphor-icons/react/ssr";

interface OrderStatusTimelineProps {
	order: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		createdAt: Date;
		paidAt: Date | null;
		shippedAt: Date | null;
		actualDelivery: Date | null;
	};
}

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
	// Les étapes de progression dérivent d'`OrderStatus`, seul axe depuis le Lot 4.
	//
	// Historique utile : ce composant lisait `fulfillmentStatus`, et le webhook
	// `payment_intent.succeeded` écrivait `status = PROCESSING` sans y toucher — la
	// paire `(PROCESSING, UNFULFILLED)` était donc l'état NORMAL de toute commande
	// payée, et « En préparation » restait ni cochée ni active pour 100 % des
	// clientes ayant payé. La correction d'alors fut de tout lire sur `status`, sauf
	// `RETURNED` — « seule information qu'OrderStatus ne porte pas ». C'est
	// exactement le constat qui a fondé la fusion des deux axes : cette exception
	// est désormais une valeur d'`OrderStatus`.
	// `RETURNED` succède à `DELIVERED` : les étapes antérieures restent COMPLÉTÉES.
	// C'est précisément le défaut historique décrit ci-dessus — les trois étapes
	// régressaient en gris sur un retour — qu'il ne faut pas réintroduire en
	// traitant `RETURNED` comme un état parallèle plutôt que postérieur.
	const isReturned = order.status === "RETURNED";
	const isDelivered = order.status === "DELIVERED" || isReturned;
	const isShipped = order.status === "SHIPPED" || isDelivered;

	// Un remboursement (total ou partiel) n'annule pas le fait que le paiement a
	// été reçu : sans ces deux valeurs, l'étape « Paiement reçu » restait muette
	// et sans date sur une commande remboursée.
	const isPaid =
		order.paymentStatus === "PAID" ||
		order.paymentStatus === "REFUNDED" ||
		order.paymentStatus === "PARTIALLY_REFUNDED";

	const steps = [
		{
			label: "Commande passée",
			date: order.createdAt,
			icon: ClockIcon,
			completed: true,
		},
		{
			label: "Paiement reçu",
			date: order.paidAt,
			icon: CreditCardIcon,
			completed: isPaid,
			failed: order.paymentStatus === "FAILED",
		},
		{
			label: "En préparation",
			// Pas de date : aucune colonne ne marque l'entrée en préparation, et
			// réutiliser `paidAt` affichait l'horodatage du paiement deux étapes de
			// suite sous un libellé qui ne le désigne pas.
			date: null,
			icon: PackageIcon,
			completed: order.status === "PROCESSING" || isShipped,
			active: order.status === "PROCESSING",
		},
		{
			label: "Expédiée",
			date: order.shippedAt,
			icon: TruckIcon,
			completed: isShipped,
			active: order.status === "SHIPPED",
		},
		{
			label: "Livrée",
			date: order.actualDelivery,
			icon: CheckCircleIcon,
			completed: isDelivered,
			active: isDelivered && !isReturned,
		},
		// `markAsReturned` laisse `status = DELIVERED` : sans cette étape, le badge
		// affichait « Livrée » pendant que la timeline ne mentionnait nulle part le
		// retour.
		...(isReturned
			? [
					{
						label: "Retournée",
						date: null,
						icon: ArrowUUpLeftIcon,
						completed: true,
					},
				]
			: []),
	];

	const isCancelled = order.status === "CANCELLED";

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold">Suivi de commande</h2>
				<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
					{ORDER_STATUS_LABELS[order.status]}
				</Badge>
			</div>
			<div className="border-border/60 border-t pt-4">
				{isCancelled ? (
					<div className="bg-destructive/10 flex items-center gap-3 rounded-lg p-4">
						<XCircleIcon className="text-destructive size-6" />
						<div>
							<p className="text-destructive font-medium">Commande annulée</p>
							<p className="text-muted-foreground text-sm">Cette commande a été annulée.</p>
						</div>
					</div>
				) : (
					<div className="relative">
						{/* Timeline line */}
						<div className="bg-border absolute top-6 bottom-6 left-4 w-0.5" />

						<div className="space-y-6">
							{steps.map((step) => {
								const Icon = step.icon;
								const isCompleted = step.completed;
								const isActive = step.active;
								const isFailed = step.failed;

								return (
									<div key={step.label} className="relative flex gap-4">
										{/* Icon */}
										<div
											className={cn(
												"relative z-10 flex size-8 items-center justify-center rounded-full border-2",
												isFailed
													? "border-destructive bg-destructive/10 text-destructive"
													: isCompleted
														? "border-primary bg-primary text-primary-foreground"
														: isActive
															? "border-primary bg-background text-primary"
															: "border-border bg-muted text-muted-foreground",
											)}
										>
											<Icon className="size-4" aria-hidden="true" />
										</div>

										{/* Content */}
										<div className="flex-1 pt-1">
											<p
												className={cn(
													"text-sm font-medium",
													isCompleted || isActive ? "text-foreground" : "text-muted-foreground",
												)}
											>
												{step.label}
											</p>
											{step.date && isCompleted && (
												<p className="text-muted-foreground text-xs">
													{format(step.date, "d MMMM yyyy 'à' HH:mm", {
														locale: fr,
													})}
												</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
