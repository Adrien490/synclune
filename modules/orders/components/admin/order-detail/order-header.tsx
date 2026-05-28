"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentStatus } from "@/app/generated/prisma/browser";
import {
	CircleCheck,
	CreditCard,
	Download,
	Ellipsis,
	FileText,
	Loader2,
	Truck,
} from "lucide-react";
import { useActionState, useState } from "react";
import { exportSingleOrder } from "@/modules/orders/actions/export-single-order";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { toast } from "@/shared/utils/toast";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuItem,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { MARK_AS_PAID_DIALOG_ID } from "../mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "../mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "../mark-as-delivered-alert-dialog";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import { useOrderActions } from "@/modules/orders/hooks/use-order-actions";
import type { OrderHeaderProps } from "./types";

// Items déjà exposés en boutons primaires — masqués du menu secondaire pour éviter doublon
const PRIMARY_BUTTON_KEYS = new Set(["mark-paid", "mark-shipped", "mark-delivered"]);
// Items inutiles dans le contexte détail (déjà sur la page)
const DETAIL_HIDDEN_KEYS = new Set(["view", "select"]);

export function OrderHeader({ order, notesCount }: OrderHeaderProps) {
	const haptic = useHaptic();
	const markAsPaidDialog = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedDialog = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredDialog = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);

	const permissions = getOrderPermissions(order);

	const [, exportAction, isExporting] = useActionState(
		withCallbacks(
			exportSingleOrder,
			createToastCallbacks({
				loadingMessage: "Génération du fichier CSV…",
				onSuccess: (state) => {
					if (!state.csv || !state.filename) return;
					const blob = new Blob([state.csv], { type: "text/csv;charset=utf-8" });
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = state.filename;
					link.click();
					URL.revokeObjectURL(url);
				},
			}),
		),
		undefined,
	);

	const { sections: baseSections } = useOrderActions({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
			paymentStatus: order.paymentStatus,
			fulfillmentStatus: order.fulfillmentStatus,
			trackingNumber: order.trackingNumber,
			trackingUrl: order.trackingUrl,
			invoiceNumber: order.invoiceNumber,
			invoiceStatus: order.invoiceStatus,
		},
	});

	const exportItem: ActionMenuItem = {
		key: "export-csv",
		label: isExporting ? "Export…" : "Exporter en CSV",
		icon: Download,
		disabled: isExporting,
		pending: isExporting,
		onSelect: () => {
			const fd = new FormData();
			fd.set("id", order.id);
			exportAction(fd);
		},
	};

	const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
	const canDownloadInvoice = order.paymentStatus === PaymentStatus.PAID;
	const downloadInvoiceItem: ActionMenuItem = {
		key: "download-invoice",
		label: isDownloadingInvoice ? "Téléchargement…" : "Télécharger la facture",
		icon: FileText,
		disabled: !canDownloadInvoice || isDownloadingInvoice,
		pending: isDownloadingInvoice,
		onSelect: () => {
			void downloadInvoice();
		},
	};

	async function downloadInvoice() {
		if (!canDownloadInvoice || isDownloadingInvoice) return;
		setIsDownloadingInvoice(true);
		const task = (async () => {
			const response = await fetch(`/api/orders/${order.orderNumber}/invoice`);
			if (!response.ok) {
				throw new Error(
					response.status === 400
						? "Facture indisponible — commande non payée"
						: "Erreur lors du téléchargement de la facture",
				);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = order.invoiceNumber
				? `facture-${order.invoiceNumber}.pdf`
				: `facture-${order.orderNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		})();
		toast.promise(task, {
			loading: "Téléchargement…",
			success: "Facture téléchargée",
			error: (e) => (e instanceof Error ? e.message : "Téléchargement impossible"),
		});
		try {
			await task;
		} catch {
			// Surfaced by toast.promise
		} finally {
			setIsDownloadingInvoice(false);
		}
	}

	// EINV-UI-101 : avoir comptable téléchargeable (Art. 272-I CGI) quand la
	// facture a été annulée (VOIDED). Le numéro d'avoir A-YYYY-NNNNN sert de label.
	const [isDownloadingCreditNote, setIsDownloadingCreditNote] = useState(false);
	const canDownloadCreditNote = order.invoiceStatus === "VOIDED" && Boolean(order.creditNoteNumber);
	const downloadCreditNoteItem: ActionMenuItem = {
		key: "download-credit-note",
		label: isDownloadingCreditNote ? "Téléchargement…" : "Télécharger l'avoir",
		icon: FileText,
		disabled: !canDownloadCreditNote || isDownloadingCreditNote,
		pending: isDownloadingCreditNote,
		onSelect: () => {
			void downloadCreditNote();
		},
	};

	async function downloadCreditNote() {
		if (!canDownloadCreditNote || isDownloadingCreditNote) return;
		setIsDownloadingCreditNote(true);
		const task = (async () => {
			const response = await fetch(`/api/orders/${order.orderNumber}/credit-note`);
			if (!response.ok) {
				throw new Error(
					response.status === 404
						? "Avoir indisponible — aucun avoir comptable émis"
						: "Erreur lors du téléchargement de l'avoir",
				);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = order.creditNoteNumber
				? `avoir-${order.creditNoteNumber}.pdf`
				: `avoir-${order.orderNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		})();
		toast.promise(task, {
			loading: "Téléchargement…",
			success: "Avoir téléchargé",
			error: (e) => (e instanceof Error ? e.message : "Téléchargement impossible"),
		});
		try {
			await task;
		} catch {
			// Surfaced by toast.promise
		} finally {
			setIsDownloadingCreditNote(false);
		}
	}

	const sections: ActionMenuSection[] = baseSections
		.map((section) => {
			if (section.key === "info") {
				return {
					...section,
					items: [
						...section.items
							.filter((item) => !DETAIL_HIDDEN_KEYS.has(item.key))
							.map((item) =>
								item.key === "notes" && notesCount > 0
									? { ...item, label: `Notes internes (${notesCount})` }
									: item,
							),
						downloadInvoiceItem,
						...(canDownloadCreditNote ? [downloadCreditNoteItem] : []),
						exportItem,
					],
				};
			}
			return {
				...section,
				items: section.items.filter(
					(item) => !DETAIL_HIDDEN_KEYS.has(item.key) && !PRIMARY_BUTTON_KEYS.has(item.key),
				),
			};
		})
		.filter((section) => section.items.length > 0);

	const handleMarkAsPaid = () => {
		haptic("medium");
		markAsPaidDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsShipped = () => {
		haptic("medium");
		markAsShippedDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsDelivered = () => {
		haptic("medium");
		markAsDeliveredDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<h1
					className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl"
					style={{ viewTransitionName: `order-number-${order.id}` }}
				>
					Commande {order.orderNumber}
				</h1>
				<p className="text-muted-foreground mt-1 text-xs md:hidden">
					Créée {formatDistanceToNow(order.createdAt, { addSuffix: true, locale: fr })}
				</p>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					Créée le{" "}
					{format(order.createdAt, "d MMMM yyyy 'à' HH'h'mm", {
						locale: fr,
					})}
					<span className="text-muted-foreground">
						{" "}
						({formatDistanceToNow(order.createdAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			{/* Actions : sticky bottom au-dessus de la bottom-bar admin sur mobile,
			 * inline à droite du titre sur desktop. */}
			<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
				{permissions.canMarkAsPaid && (
					<Button
						size="sm"
						onClick={handleMarkAsPaid}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<CreditCard className="size-4" aria-hidden="true" />
						Marquer payée
					</Button>
				)}
				{permissions.canMarkAsShipped && (
					<Button
						size="sm"
						onClick={handleMarkAsShipped}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<Truck className="size-4" aria-hidden="true" />
						Marquer expédiée
					</Button>
				)}
				{permissions.canMarkAsDelivered && (
					<Button
						size="sm"
						onClick={handleMarkAsDelivered}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<CircleCheck className="size-4" aria-hidden="true" />
						Marquer livrée
					</Button>
				)}
				{canDownloadInvoice && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => void downloadInvoice()}
						disabled={isDownloadingInvoice}
						aria-busy={isDownloadingInvoice || undefined}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						{isDownloadingInvoice ? (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						) : (
							<FileText className="size-4" aria-hidden="true" />
						)}
						{isDownloadingInvoice ? "Facture…" : "Facture"}
					</Button>
				)}

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							aria-label="Plus d'actions"
							aria-busy={isExporting || undefined}
							className="min-h-11 min-w-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 sm:min-w-9"
						>
							{isExporting ? (
								<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
							) : (
								<Ellipsis className="size-4" aria-hidden="true" />
							)}
						</Button>
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions"
						description={`Commande ${order.orderNumber}${order.paymentStatus === PaymentStatus.PAID ? " · payée" : ""}`}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</div>
		</div>
	);
}
