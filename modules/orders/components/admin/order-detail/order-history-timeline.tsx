"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowCounterClockwiseIcon,
	CaretDownIcon,
	CheckCircleIcon,
	ClockIcon,
	CreditCardIcon,
	FileTextIcon,
	MapPinIcon,
	PackageIcon,
	TruckIcon,
	XCircleIcon,
} from "@phosphor-icons/react/ssr";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/dates";
import type { OrderAction, HistorySource } from "@/app/generated/prisma/enums";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";

const VISIBLE_COUNT = 5;

interface OrderHistoryEntry {
	id: string;
	action: OrderAction;
	previousStatus?: string | null;
	newStatus?: string | null;
	previousPaymentStatus?: string | null;
	newPaymentStatus?: string | null;
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
	{ icon: typeof ClockIcon; color: string; label: string; symbol: string }
> = {
	CREATED: { icon: ClockIcon, color: "text-info", label: "Commande créée", symbol: "⏱" },
	PAID: { icon: CreditCardIcon, color: "text-success", label: "Paiement reçu", symbol: "✓" },
	PROCESSING: {
		icon: PackageIcon,
		color: "text-warning",
		label: "En préparation",
		symbol: "⚙",
	},
	SHIPPED: { icon: TruckIcon, color: "text-info", label: "Expédiée", symbol: "→" },
	DELIVERED: {
		icon: CheckCircleIcon,
		color: "text-success",
		label: "Livrée",
		symbol: "✓✓",
	},
	CANCELLED: { icon: XCircleIcon, color: "text-destructive", label: "Annulée", symbol: "✗" },
	RETURNED: {
		icon: ArrowCounterClockwiseIcon,
		color: "text-warning",
		label: "Retournée",
		symbol: "↩",
	},
	STATUS_REVERTED: {
		icon: ArrowCounterClockwiseIcon,
		color: "text-warning",
		label: "Statut annulé",
		symbol: "↶",
	},
	TRACKING_UPDATED: {
		icon: TruckIcon,
		color: "text-info",
		label: "Suivi mis à jour",
		symbol: "📦",
	},
	ADDRESS_UPDATED: {
		icon: MapPinIcon,
		color: "text-info",
		label: "Adresse modifiée",
		symbol: "📍",
	},
	INVOICE_GENERATED: {
		icon: FileTextIcon,
		color: "text-success",
		label: "Facture générée",
		symbol: "📄",
	},
	REFUND_CREATED: {
		icon: ArrowCounterClockwiseIcon,
		color: "text-warning",
		label: "Remboursement créé",
		symbol: "↩",
	},
	REFUND_COMPLETED: {
		icon: CheckCircleIcon,
		color: "text-success",
		label: "Remboursement confirmé",
		symbol: "✓",
	},
	REFUND_FAILED: {
		icon: XCircleIcon,
		color: "text-destructive",
		label: "Remboursement échoué",
		symbol: "✗",
	},
	DISPUTE_OPENED: {
		icon: XCircleIcon,
		color: "text-destructive",
		label: "Litige ouvert",
		symbol: "⚠",
	},
	DISPUTE_RESOLVED: {
		icon: CheckCircleIcon,
		color: "text-success",
		label: "Litige résolu",
		symbol: "✓",
	},
	INVOICE_VOIDED: {
		icon: FileTextIcon,
		color: "text-muted-foreground",
		label: "Facture annulée",
		symbol: "✗",
	},
	CREDIT_NOTE_GENERATED: {
		icon: FileTextIcon,
		color: "text-warning",
		label: "Avoir émis",
		symbol: "↺",
	},
	// ⚠️ Ces deux entrées restent OBLIGATOIRES (`ACTION_CONFIG` est un
	// `Record<OrderAction, …>`, le compilateur les exige) mais ne sont plus
	// atteintes : `ACCESS_LOG_ACTIONS` les filtre avant le rendu. Ne pas les
	// supprimer, ne pas supprimer les actions de l'enum non plus — cf. la note
	// sur `ACCESS_LOG_ACTIONS`.
	INVOICE_DOWNLOADED: {
		icon: FileTextIcon,
		color: "text-info",
		label: "Facture téléchargée",
		symbol: "⬇",
	},
	BULK_EXPORT: {
		icon: FileTextIcon,
		color: "text-info",
		label: "Export CSV admin",
		symbol: "📊",
	},
	// ⚠️ RÉSERVÉ — BRANCHES INATTEIGNABLES à ce jour.
	//
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

// Labels traduits pour les statuts.
//
// Un seul spread de statut commande depuis le Lot 4 (audit V2) : `ORDER_STATUS_LABELS`
// a absorbé la table fulfillment. L'arbitrage que l'ordre de spread portait
// auparavant (PROCESSING → « En préparation », le libellé fulfillment) est
// désormais figé DANS la SSOT — c'est le mot du bouton, et c'est ce que la timeline
// affichait déjà.
const STATUS_LABELS: Record<string, string> = {
	...PAYMENT_STATUS_LABELS,
	...ORDER_STATUS_LABELS,
};

function getStatusLabel(status: string | null | undefined): string {
	if (!status) return "";
	return STATUS_LABELS[status] ?? status;
}

/**
 * Actions de JOURNAL D'ACCÈS, masquées de cette timeline (audit V2, Lot 4).
 *
 * ⚠️ Masquées à l'affichage SEULEMENT — elles continuent d'être écrites, et il ne
 * faut pas les retirer d'`OrderAction`. Ce sont des contrôles RGPD Art. 30/32
 * durcis délibérément : `BULK_EXPORT` est **fail-closed** (l'export CSV renvoie
 * 503 si l'audit n'a pas pu être écrit, et la route est POST plutôt que GET
 * exactement pour ça), `INVOICE_DOWNLOADED` escalade en Sentry — c'est la seule
 * trace de qui a téléchargé la facture d'un client, qui porte ses nom et adresse.
 *
 * Pourquoi les masquer : elles tracent un ACCÈS à un document, pas un changement
 * d'état de la commande. Un téléchargement par commande suffisait à noyer les
 * événements métier de la fiche, et le compteur du titre les comptait aussi.
 */
const ACCESS_LOG_ACTIONS: ReadonlySet<string> = new Set(["INVOICE_DOWNLOADED", "BULK_EXPORT"]);

export function OrderHistoryTimeline({ history: rawHistory }: OrderHistoryTimelineProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const history = rawHistory.filter((entry) => !ACCESS_LOG_ACTIONS.has(entry.action));

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
								<CaretDownIcon className="mr-1 size-4" aria-hidden="true" />
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
								<CaretDownIcon className="mr-1 size-4 rotate-180" aria-hidden="true" />
								Réduire
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
