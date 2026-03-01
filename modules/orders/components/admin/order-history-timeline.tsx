"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ChevronDown,
	Clock,
	CreditCard,
	FileText,
	MapPin,
	Package,
	Truck,
	CheckCircle2,
	XCircle,
	RotateCcw,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import type { OrderAction, HistorySource } from "@/app/generated/prisma/client";

const VISIBLE_COUNT = 5;

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
	source: HistorySource;
	createdAt: Date;
}

interface OrderHistoryTimelineProps {
	history: OrderHistoryEntry[];
}

// Mapping action → icône + couleur + label + symbole (accessibilité: pas couleur seule)
const ACTION_CONFIG: Record<
	OrderAction,
	{ icon: typeof Clock; color: string; label: string; symbol: string }
> = {
	CREATED: { icon: Clock, color: "text-blue-500", label: "Commande créée", symbol: "⏱" },
	PAID: { icon: CreditCard, color: "text-green-500", label: "Paiement reçu", symbol: "✓" },
	PROCESSING: {
		icon: Package,
		color: "text-yellow-500",
		label: "En préparation",
		symbol: "⚙",
	},
	SHIPPED: { icon: Truck, color: "text-purple-500", label: "Expédiée", symbol: "→" },
	DELIVERED: {
		icon: CheckCircle2,
		color: "text-green-600",
		label: "Livrée",
		symbol: "✓✓",
	},
	CANCELLED: { icon: XCircle, color: "text-red-500", label: "Annulée", symbol: "✗" },
	RETURNED: {
		icon: RotateCcw,
		color: "text-orange-500",
		label: "Retournée",
		symbol: "↩",
	},
	STATUS_REVERTED: {
		icon: RotateCcw,
		color: "text-amber-500",
		label: "Statut annulé",
		symbol: "↶",
	},
	TRACKING_UPDATED: {
		icon: Truck,
		color: "text-indigo-500",
		label: "Suivi mis à jour",
		symbol: "📦",
	},
	ADDRESS_UPDATED: {
		icon: MapPin,
		color: "text-teal-500",
		label: "Adresse modifiée",
		symbol: "📍",
	},
	INVOICE_GENERATED: {
		icon: FileText,
		color: "text-emerald-500",
		label: "Facture générée",
		symbol: "📄",
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
	const [isExpanded, setIsExpanded] = useState(false);

	if (history.length === 0) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-medium">Historique des actions</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">Aucun historique disponible</p>
				</CardContent>
			</Card>
		);
	}

	const visibleHistory = isExpanded ? history : history.slice(0, VISIBLE_COUNT);
	const hiddenCount = history.length - VISIBLE_COUNT;
	const canExpand = hiddenCount > 0;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-medium">
					Historique des actions
					{history.length > 0 && (
						<Badge variant="secondary" className="ml-2">
							{history.length}
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative">
					{/* Ligne verticale */}
					<div className="bg-border absolute top-0 bottom-0 left-4 w-px" aria-hidden="true" />

					<ol className="space-y-4" aria-label="Historique chronologique des actions">
						{visibleHistory.map((entry) => {
							const config = ACTION_CONFIG[entry.action];
							const Icon = config.icon;

							return (
								<li key={entry.id} className="relative pl-10">
									{/* Icône sur la ligne */}
									<div
										className={cn(
											"bg-background absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2",
											config.color,
										)}
										aria-label={config.label}
									>
										<Icon className="h-4 w-4" aria-hidden="true" />
										<span className="sr-only">{config.symbol}</span>
									</div>

									{/* Contenu */}
									<div className="bg-muted/50 rounded-lg p-3">
										<div className="mb-1 flex items-center justify-between">
											<span className="text-sm font-medium">{config.label}</span>
											<span className="text-muted-foreground text-xs">
												{formatDistanceToNow(new Date(entry.createdAt), {
													addSuffix: true,
													locale: fr,
												})}
											</span>
										</div>

										{/* Changements de statut */}
										{entry.newStatus && (
											<div className="text-muted-foreground text-xs">
												Statut : {getStatusLabel(entry.previousStatus)} →{" "}
												{getStatusLabel(entry.newStatus)}
											</div>
										)}
										{entry.newPaymentStatus && (
											<div className="text-muted-foreground text-xs">
												Paiement : {getStatusLabel(entry.previousPaymentStatus)} →{" "}
												{getStatusLabel(entry.newPaymentStatus)}
											</div>
										)}
										{entry.newFulfillmentStatus && !entry.newStatus && (
											<div className="text-muted-foreground text-xs">
												Traitement : {getStatusLabel(entry.previousFulfillmentStatus)} →{" "}
												{getStatusLabel(entry.newFulfillmentStatus)}
											</div>
										)}

										{/* Note */}
										{entry.note && (
											<p className="text-muted-foreground mt-2 text-sm italic">
												&quot;{entry.note}&quot;
											</p>
										)}

										{/* Auteur et source */}
										<div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
											<Badge variant="outline" className="py-0 text-xs">
												{entry.source === "ADMIN"
													? "Admin"
													: entry.source === "WEBHOOK"
														? "Stripe"
														: entry.source === "CUSTOMER"
															? "Client"
															: "Système"}
											</Badge>
											{entry.authorName && <span>par {entry.authorName}</span>}
										</div>
									</div>
								</li>
							);
						})}
					</ol>

					{/* Bouton pour afficher plus */}
					{canExpand && !isExpanded && (
						<div className="mt-4 flex justify-center">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsExpanded(true)}
								className="text-muted-foreground"
							>
								<ChevronDown className="mr-1 h-4 w-4" aria-hidden="true" />
								Voir {hiddenCount} entrées plus anciennes
							</Button>
						</div>
					)}

					{/* Bouton pour réduire */}
					{isExpanded && canExpand && (
						<div className="mt-4 flex justify-center">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsExpanded(false)}
								className="text-muted-foreground"
							>
								<ChevronDown className="mr-1 h-4 w-4 rotate-180" aria-hidden="true" />
								Réduire
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
