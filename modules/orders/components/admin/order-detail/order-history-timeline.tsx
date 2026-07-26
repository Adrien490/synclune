"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	AlertTriangle,
	ChevronDown,
	Clock,
	CreditCard,
	FileText,
	MapPin,
	Package,
	Truck,
	CircleCheck,
	CircleX,
	RotateCcw,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/dates";
import type { OrderAction, HistorySource } from "@/app/generated/prisma/enums";

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
		icon: CircleCheck,
		color: "text-green-600",
		label: "Livrée",
		symbol: "✓✓",
	},
	CANCELLED: { icon: CircleX, color: "text-red-500", label: "Annulée", symbol: "✗" },
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
	INVOICE_GENERATION_FAILED: {
		icon: AlertTriangle,
		color: "text-destructive",
		label: "Échec génération facture",
		symbol: "⚠",
	},
	REFUND_CREATED: {
		icon: RotateCcw,
		color: "text-orange-500",
		label: "Remboursement créé",
		symbol: "↩",
	},
	REFUND_COMPLETED: {
		icon: CircleCheck,
		color: "text-green-500",
		label: "Remboursement confirmé",
		symbol: "✓",
	},
	REFUND_FAILED: {
		icon: CircleX,
		color: "text-red-500",
		label: "Remboursement échoué",
		symbol: "✗",
	},
	DISPUTE_OPENED: {
		icon: CircleX,
		color: "text-red-600",
		label: "Litige ouvert",
		symbol: "⚠",
	},
	DISPUTE_RESOLVED: {
		icon: CircleCheck,
		color: "text-green-600",
		label: "Litige résolu",
		symbol: "✓",
	},
	INVOICE_VOIDED: {
		icon: FileText,
		color: "text-gray-500",
		label: "Facture annulée",
		symbol: "✗",
	},
	CREDIT_NOTE_GENERATED: {
		icon: FileText,
		color: "text-amber-500",
		label: "Avoir émis",
		symbol: "↺",
	},
	CREDIT_NOTE_ARCHIVED: {
		icon: FileText,
		color: "text-amber-600",
		label: "PDF avoir archivé",
		symbol: "🔒",
	},
	INVOICE_ARCHIVED: {
		icon: FileText,
		color: "text-emerald-500",
		label: "PDF facture archivé",
		symbol: "🔒",
	},
	PDF_ARCHIVE_FAILED: {
		icon: AlertTriangle,
		color: "text-destructive",
		label: "Échec archivage PDF",
		symbol: "⚠",
	},
	CREDIT_NOTE_FAILED: {
		icon: AlertTriangle,
		color: "text-destructive",
		label: "Échec émission avoir",
		symbol: "⚠",
	},
	INVOICE_RECONCILED: {
		icon: CircleCheck,
		color: "text-emerald-600",
		label: "Facture rattrapée (cron)",
		symbol: "🔄",
	},
	INVOICE_DOWNLOADED: {
		icon: FileText,
		color: "text-blue-400",
		label: "Facture téléchargée",
		symbol: "⬇",
	},
	BULK_EXPORT: {
		icon: FileText,
		color: "text-indigo-400",
		label: "Export CSV admin",
		symbol: "📊",
	},
	// ⚠️ RÉSERVÉ — BRANCHES INATTEIGNABLES à ce jour.
	//
	// L'e-reporting DGFiP a été retiré du code (recentrage B2C) : AUCUN writer n'émet
	// ces 6 `OrderAction`, donc aucune entrée d'historique ne peut les porter. Elles
	// restent ici uniquement parce que `ACTION_CONFIG` est un `Record<OrderAction, …>`
	// exhaustif : les retirer imposerait de passer le type en `Partial` + fallback au
	// point de lecture, ce qui SUPPRIMERAIT le garde-fou « toute nouvelle valeur d'enum
	// doit avoir un rendu » (erreur de compilation aujourd'hui). Les valeurs d'enum
	// Postgres sont elles-mêmes conservées (cf. prisma/schema.prisma : retirer une
	// valeur impose de recréer le type).
	//
	// Ne pas en déduire que la transmission PDP existe : à réécrire au go-live contre
	// l'arrêté définitif et une Plateforme Agréée réelle (cf. docs/RUNBOOK.md).
	PDP_SUBMITTED: {
		icon: FileText,
		color: "text-sky-500",
		label: "Transmis à la PDP",
		symbol: "📤",
	},
	PDP_ACCEPTED: {
		icon: CircleCheck,
		color: "text-emerald-500",
		label: "Accepté par la PDP",
		symbol: "✓",
	},
	PDP_REJECTED: {
		icon: CircleX,
		color: "text-red-500",
		label: "Rejeté par la PDP",
		symbol: "✗",
	},
	PDP_RETRY: {
		icon: RotateCcw,
		color: "text-amber-500",
		label: "Nouvelle tentative PDP",
		symbol: "🔄",
	},
	PDP_ABANDONED: {
		icon: AlertTriangle,
		color: "text-destructive",
		label: "Transmission PDP abandonnée",
		symbol: "⚠",
	},
	PDP_CANCELLED: {
		icon: CircleX,
		color: "text-gray-500",
		label: "Transmission PDP annulée",
		symbol: "✗",
	},
};

/**
 * Extrait les numéros de facture / avoir depuis `entry.metadata` (JsonValue) pour
 * affichage inline. Renvoie null si introuvable — l'entry reste rendue mais sans
 * code monospace. Cf. EINV-UI-009 (audit UI admin facturation 2026-05-28).
 */
const RENDERED_METADATA_KEYS = ["invoiceNumber", "creditNoteNumber", "errorMessage"] as const;

function extractInvoiceMetadata(metadata: unknown): {
	invoiceNumber?: string;
	creditNoteNumber?: string;
	errorMessage?: string;
	/**
	 * Nombre de clés présentes dans `metadata` mais volontairement NON rendues.
	 * On expose le compte, jamais les valeurs : `OrderHistory` est immuable et
	 * n'est jamais scrubée à l'anonymisation, donc y afficher un blob arbitraire
	 * risquerait de faire remonter de la PII (invariant 9 + régression
	 * `order-history-no-customer-pii`). Sans ce compte, l'admin ne pouvait pas
	 * savoir qu'il existe davantage d'informations tracées.
	 */
	droppedCount: number;
} {
	if (typeof metadata !== "object" || metadata === null) return { droppedCount: 0 };
	const m = metadata as Record<string, unknown>;
	const droppedCount = Object.keys(m).filter(
		(k) => !RENDERED_METADATA_KEYS.includes(k as (typeof RENDERED_METADATA_KEYS)[number]),
	).length;
	return {
		invoiceNumber: typeof m.invoiceNumber === "string" ? m.invoiceNumber : undefined,
		creditNoteNumber: typeof m.creditNoteNumber === "string" ? m.creditNoteNumber : undefined,
		errorMessage: typeof m.errorMessage === "string" ? m.errorMessage : undefined,
		droppedCount,
	};
}

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
	return STATUS_LABELS[status] ?? status;
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
							const invoiceMeta = extractInvoiceMetadata(entry.metadata);

							return (
								<li key={entry.id} className="relative pl-10">
									{/* Icône sur la ligne */}
									<div
										className={cn(
											"bg-background absolute left-0 flex size-8 items-center justify-center rounded-full border-2",
											config.color,
										)}
										aria-label={config.label}
									>
										<Icon className="size-4" aria-hidden="true" />
										<span className="sr-only">{config.symbol}</span>
									</div>

									{/* Contenu */}
									<div className="bg-muted/50 rounded-lg p-3">
										<div className="mb-1 flex items-center justify-between gap-2">
											<span className="text-sm font-medium">{config.label}</span>
											{/* `<time>` + horodatage absolu : cet audit trail est conservé 10 ans
											    (Art. L123-22) et « il y a 3 mois » n'y est pas exploitable. Le
											    relatif reste affiché (lecture rapide), l'absolu est dans `title`
											    + `dateTime` pour la machine et le survol. */}
											<time
												dateTime={new Date(entry.createdAt).toISOString()}
												title={formatDateTime(entry.createdAt)}
												className="text-muted-foreground shrink-0 text-xs"
											>
												{formatDistanceToNow(new Date(entry.createdAt), {
													addSuffix: true,
													locale: fr,
												})}
											</time>
										</div>

										{/* Numéro facture / avoir extrait du metadata (EINV-UI-009) */}
										{invoiceMeta.invoiceNumber && (
											<div className="text-muted-foreground mt-1 text-xs">
												Facture{" "}
												<code className="bg-muted rounded px-1 py-0.5 font-mono tabular-nums">
													{invoiceMeta.invoiceNumber}
												</code>
											</div>
										)}
										{invoiceMeta.creditNoteNumber && (
											<div className="text-muted-foreground mt-1 text-xs">
												Avoir{" "}
												<code className="bg-muted rounded px-1 py-0.5 font-mono tabular-nums">
													{invoiceMeta.creditNoteNumber}
												</code>
											</div>
										)}
										{invoiceMeta.errorMessage && (
											<div className="text-destructive mt-1 text-xs">
												Erreur : {invoiceMeta.errorMessage}
											</div>
										)}
										{/* Compte seul, jamais les valeurs — cf. `extractInvoiceMetadata`. */}
										{invoiceMeta.droppedCount > 0 && (
											<div className="text-muted-foreground/70 mt-1 text-xs italic">
												+ {invoiceMeta.droppedCount} champ
												{invoiceMeta.droppedCount > 1 ? "s" : ""} technique
												{invoiceMeta.droppedCount > 1 ? "s" : ""} tracé
												{invoiceMeta.droppedCount > 1 ? "s" : ""}
											</div>
										)}

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
								<ChevronDown className="mr-1 size-4" aria-hidden="true" />
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
								<ChevronDown className="mr-1 size-4 rotate-180" aria-hidden="true" />
								Réduire
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
