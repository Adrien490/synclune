"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentStatus } from "@/app/generated/prisma/browser";
import {
	CheckCircleIcon,
	CreditCardIcon,
	DotsThreeIcon,
	DownloadSimpleIcon,
	FileTextIcon,
	TruckIcon,
} from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useActionState, useTransition } from "react";
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
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import { MARK_AS_PAID_DIALOG_ID } from "../mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "../mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "../mark-as-delivered-alert-dialog";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import { useOrderActions } from "@/modules/orders/hooks/use-order-actions";
import type { OrderHeaderProps } from "./types";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

// Items déjà exposés en boutons primaires — masqués du menu secondaire pour éviter doublon
const PRIMARY_BUTTON_KEYS = new Set(["mark-paid", "mark-shipped", "mark-delivered"]);
// Items inutiles dans le contexte détail (déjà sur la page)
const DETAIL_HIDDEN_KEYS = new Set(["view", "select"]);

export function OrderHeader({ order }: OrderHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(`Commande ${order.orderNumber}`);
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
			trackingNumber: order.trackingNumber,
			trackingUrl: order.trackingUrl,
			invoiceNumber: order.invoiceNumber,
			invoiceStatus: order.invoiceStatus,
		},
	});

	const exportItem: ActionMenuItem = {
		key: "export-csv",
		label: isExporting ? "Export…" : "Exporter en CSV",
		icon: DownloadSimpleIcon,
		disabled: isExporting,
		pending: isExporting,
		onSelect: () => {
			const fd = new FormData();
			fd.set("id", order.id);
			exportAction(fd);
		},
	};

	// `useTransition` et non un booléen fait main : `isExporting` ci-dessus vient
	// déjà de `useActionState`, ces deux-là en étaient les jumeaux artisanaux.
	// `isPending` couvre tout le corps async, donc plus de `setState` final ni de
	// `try { await task } catch {}` en guise de `finally`.
	const [isDownloadingInvoice, startInvoiceDownload] = useTransition();
	// Miroir de la garde route : la facture d'une commande ENCAISSÉE reste
	// téléchargeable après remboursement (partiel : facture valide ; total :
	// facture VOIDED servie avec bandeau « FACTURE ANNULÉE »).
	const canDownloadInvoice = order.paidAt !== null || order.paymentStatus === PaymentStatus.PAID;
	const downloadInvoiceItem: ActionMenuItem = {
		key: "download-invoice",
		label: isDownloadingInvoice ? "Téléchargement…" : "Télécharger la facture",
		icon: FileTextIcon,
		disabled: !canDownloadInvoice || isDownloadingInvoice,
		pending: isDownloadingInvoice,
		onSelect: () => {
			downloadInvoice();
		},
	};

	function downloadInvoice() {
		if (!canDownloadInvoice || isDownloadingInvoice) return;
		startInvoiceDownload(async () => {
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
			await task.catch(() => {
				// Surfaced by toast.promise
			});
		});
	}

	// EINV-UI-101 : avoir comptable téléchargeable (Art. 272-I CGI) quand la
	// facture a été annulée (VOIDED). Le numéro d'avoir A-YYYY-NNNNN sert de label.
	const [isDownloadingCreditNote, startCreditNoteDownload] = useTransition();
	const canDownloadCreditNote = order.invoiceStatus === "VOIDED" && Boolean(order.creditNoteNumber);
	const downloadCreditNoteItem: ActionMenuItem = {
		key: "download-credit-note",
		label: isDownloadingCreditNote ? "Téléchargement…" : "Télécharger l'avoir",
		icon: FileTextIcon,
		disabled: !canDownloadCreditNote || isDownloadingCreditNote,
		pending: isDownloadingCreditNote,
		onSelect: () => {
			downloadCreditNote();
		},
	};

	function downloadCreditNote() {
		if (!canDownloadCreditNote || isDownloadingCreditNote) return;
		startCreditNoteDownload(async () => {
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
			await task.catch(() => {
				// Surfaced by toast.promise
			});
		});
	}

	const sections: ActionMenuSection[] = baseSections
		.map((section) => {
			if (section.key === "info") {
				return {
					...section,
					items: [
						...section.items.filter((item) => !DETAIL_HIDDEN_KEYS.has(item.key)),
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
		<DetailHeaderShell>
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
			<DetailStickyActionBar>
				{permissions.canMarkAsPaid && (
					<Button
						size="sm"
						onClick={handleMarkAsPaid}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<CreditCardIcon className="size-4" aria-hidden="true" />
						Marquer payée
					</Button>
				)}
				{permissions.canMarkAsShipped && (
					<Button
						size="sm"
						onClick={handleMarkAsShipped}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<TruckIcon className="size-4" aria-hidden="true" />
						Marquer expédiée
					</Button>
				)}
				{permissions.canMarkAsDelivered && (
					<Button
						size="sm"
						onClick={handleMarkAsDelivered}
						className="min-h-11 flex-1 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 md:flex-none"
					>
						<CheckCircleIcon className="size-4" aria-hidden="true" />
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
							<Spinner presentational />
						) : (
							<FileTextIcon className="size-4" aria-hidden="true" />
						)}
						{isDownloadingInvoice ? "Facture…" : "Facture"}
					</Button>
				)}

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger
						render={
							<Button
								variant="outline"
								size="sm"
								aria-label="Plus d'actions"
								aria-busy={isExporting || undefined}
								className="min-h-11 min-w-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9 sm:min-w-9"
							/>
						}
					>
						{isExporting ? (
							<Spinner presentational />
						) : (
							<DotsThreeIcon className="size-4" aria-hidden="true" />
						)}
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions"
						description={`Commande ${order.orderNumber}${order.paymentStatus === PaymentStatus.PAID ? " · payée" : ""}`}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
