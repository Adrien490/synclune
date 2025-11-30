"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Clock,
	CreditCard,
	Package,
	Truck,
	CheckCircle2,
	XCircle,
	RotateCcw,
	FileText,
	Edit,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import type { OrderAction } from "@/app/generated/prisma/client";

interface OrderHistoryEntry {
	id: string;
	action: OrderAction;
	previousStatus?: string | null;
	newStatus?: string | null;
	previousPaymentStatus?: string | null;
	newPaymentStatus?: string | null;
	previousFulfillmentStatus?: string | null;
	newFulfillmentStatus?: string | null;
	note?: string | null;
	metadata?: unknown; // JsonValue from Prisma
	authorName?: string | null;
	source: string;
	createdAt: Date;
}

interface OrderHistoryTimelineProps {
	history: OrderHistoryEntry[];
}

// Mapping action → icône + couleur + label
const ACTION_CONFIG: Record<
	OrderAction,
	{ icon: typeof Clock; color: string; label: string }
> = {
	CREATED: { icon: Clock, color: "text-blue-500", label: "Commande créée" },
	PAID: { icon: CreditCard, color: "text-green-500", label: "Paiement reçu" },
	PROCESSING: {
		icon: Package,
		color: "text-yellow-500",
		label: "En préparation",
	},
	SHIPPED: { icon: Truck, color: "text-purple-500", label: "Expédiée" },
	DELIVERED: {
		icon: CheckCircle2,
		color: "text-green-600",
		label: "Livrée",
	},
	CANCELLED: { icon: XCircle, color: "text-red-500", label: "Annulée" },
	RETURNED: {
		icon: RotateCcw,
		color: "text-orange-500",
		label: "Retournée",
	},
	STATUS_REVERTED: {
		icon: RotateCcw,
		color: "text-amber-500",
		label: "Statut annulé",
	},
	NOTE_ADDED: {
		icon: FileText,
		color: "text-gray-500",
		label: "Note ajoutée",
	},
	NOTE_DELETED: {
		icon: FileText,
		color: "text-gray-400",
		label: "Note supprimée",
	},
	TRACKING_UPDATED: {
		icon: Truck,
		color: "text-blue-400",
		label: "Suivi mis à jour",
	},
	MANUAL_EDIT: {
		icon: Edit,
		color: "text-gray-600",
		label: "Modification manuelle",
	},
};

// Labels traduits pour les statuts
const STATUS_LABELS: Record<string, string> = {
	PENDING: "En attente",
	PROCESSING: "En préparation",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELLED: "Annulée",
	PAID: "Payé",
	FAILED: "Échoué",
	PARTIALLY_REFUNDED: "Partiellement remboursé",
	REFUNDED: "Remboursé",
	UNFULFILLED: "Non préparé",
	RETURNED: "Retourné",
};

function getStatusLabel(status: string | null | undefined): string {
	if (!status) return "";
	return STATUS_LABELS[status] || status;
}

export function OrderHistoryTimeline({ history }: OrderHistoryTimelineProps) {
	if (history.length === 0) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-medium">
						Historique des actions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Aucun historique disponible
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-medium">
					Historique des actions
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative">
					{/* Ligne verticale */}
					<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

					<div className="space-y-4">
						{history.map((entry) => {
							const config = ACTION_CONFIG[entry.action];
							const Icon = config.icon;

							return (
								<div key={entry.id} className="relative pl-10">
									{/* Icône sur la ligne */}
									<div
										className={cn(
											"absolute left-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center",
											config.color
										)}
									>
										<Icon className="w-4 h-4" />
									</div>

									{/* Contenu */}
									<div className="bg-muted/50 rounded-lg p-3">
										<div className="flex items-center justify-between mb-1">
											<span className="font-medium text-sm">
												{config.label}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatDistanceToNow(
													new Date(entry.createdAt),
													{
														addSuffix: true,
														locale: fr,
													}
												)}
											</span>
										</div>

										{/* Changements de statut */}
										{entry.newStatus && (
											<div className="text-xs text-muted-foreground">
												Statut :{" "}
												{getStatusLabel(entry.previousStatus)} →{" "}
												{getStatusLabel(entry.newStatus)}
											</div>
										)}
										{entry.newPaymentStatus && (
											<div className="text-xs text-muted-foreground">
												Paiement :{" "}
												{getStatusLabel(entry.previousPaymentStatus)} →{" "}
												{getStatusLabel(entry.newPaymentStatus)}
											</div>
										)}
										{entry.newFulfillmentStatus &&
											!entry.newStatus && (
												<div className="text-xs text-muted-foreground">
													Fulfillment :{" "}
													{getStatusLabel(
														entry.previousFulfillmentStatus
													)}{" "}
													→{" "}
													{getStatusLabel(
														entry.newFulfillmentStatus
													)}
												</div>
											)}

										{/* Note */}
										{entry.note && (
											<p className="text-sm mt-2 italic text-muted-foreground">
												&quot;{entry.note}&quot;
											</p>
										)}

										{/* Auteur et source */}
										<div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
											<Badge
												variant="outline"
												className="text-xs py-0"
											>
												{entry.source === "admin"
													? "Admin"
													: entry.source === "webhook"
														? "Stripe"
														: entry.source === "customer"
															? "Client"
															: "Système"}
											</Badge>
											{entry.authorName && (
												<span>par {entry.authorName}</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
