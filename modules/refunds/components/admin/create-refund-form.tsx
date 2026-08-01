"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form-nextjs";
import { RotateCcw } from "lucide-react";

import { type RefundReason } from "@/app/generated/prisma/browser";
import type { OrderForRefund } from "@/modules/refunds/data/get-order-for-refund";
import {
	useCreateRefundForm,
	getDefaultRestock,
	getAvailableQuantity,
} from "@/modules/refunds/hooks/use-create-refund-form";
import { canSubmitRefund } from "@/modules/refunds/services/refund-calculation.service";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary, type ErrorSummaryField } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { RefundItemsCard } from "./refund-items-card";
import { RefundSidebarCards } from "./refund-sidebar-cards";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

interface CreateRefundFormProps {
	order: OrderForRefund;
}

const LIST_PATH = "/admin/ventes/remboursements";

const FIELD_LABELS: Record<string, string> = {
	"refund-items": "Bijoux à rembourser",
	reason: "Motif",
	note: "Note",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function CreateRefundForm({ order }: CreateRefundFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);
	const orderDetailPath = `/admin/ventes/commandes/${order.id}`;

	const alreadyRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0);
	const maxRefundable = order.total - alreadyRefunded;

	const {
		form,
		state,
		action,
		isPending,
		reason,
		items,
		selectedItems,
		totalAmount,
		itemsForAction,
	} = useCreateRefundForm({
		orderId: order.id,
		orderItems: order.items,
		subtotal: order.subtotal,
		discountAmount: order.discountAmount,
		onSuccess: () => {
			haptic("success");
			allowNavigationRef.current?.();
			navigateWithTransition(router, LIST_PATH);
		},
	});

	// Les VALIDATION_ERROR serveur sont exclues du toast par `createToastCallbacks`
	// (affichage inline supposé) : sans cette alerte, un refus de `createRefundSchema`
	// serait totalement silencieux sur une opération monétaire.
	const serverErrors = useServerFieldErrors({ state });

	const acceptCancelledOrder = useStore(form.store, (s) => s.values.acceptCancelledOrder);
	const isDirty = useStore(form.store, (s) => s.isDirty);
	// ORD-REFUND-AUDIT-003 : refund sur commande déjà annulée requiert checkbox.
	const isCancelledOrder = order.status === "CANCELLED";

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: orderDetailPath,
		allowNavigation,
		getIsDirty: () => isDirty,
	});

	// Le motif détermine le restock par défaut : recalcule les items au changement.
	// `reason` est déjà mis à jour par field.handleChange ; on ne touche qu'aux items.
	// Les bijoux dont le restock a été basculé manuellement (restockTouched) sont
	// préservés pour ne pas écraser le choix de l'admin.
	const handleReasonChange = (value: RefundReason) => {
		haptic("selection");
		const defaultRestock = getDefaultRestock(value);
		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) =>
				item.restockTouched ? item : { ...item, restock: defaultRestock },
			),
		);
	};

	const handleItemToggle = (orderItemId: string, checked: boolean) => {
		const currentItems = form.getFieldValue("items");
		const orderItem = order.items.find((oi) => oi.id === orderItemId);
		const available = orderItem ? getAvailableQuantity(orderItem) : 0;

		form.setFieldValue(
			"items",
			currentItems.map((item) => {
				if (item.orderItemId !== orderItemId) return item;
				return {
					...item,
					selected: checked,
					quantity: checked ? Math.min(1, available) : 0,
				};
			}),
		);
	};

	const handleQuantityChange = (orderItemId: string, quantity: number) => {
		const orderItem = order.items.find((oi) => oi.id === orderItemId);
		const available = orderItem ? getAvailableQuantity(orderItem) : 0;
		const validQuantity = Math.max(0, Math.min(quantity, available));

		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) =>
				item.orderItemId === orderItemId
					? { ...item, quantity: validQuantity, selected: validQuantity > 0 }
					: item,
			),
		);
	};

	const handleRestockToggle = (orderItemId: string, checked: boolean) => {
		const currentItems = form.getFieldValue("items");
		form.setFieldValue(
			"items",
			currentItems.map((item) =>
				item.orderItemId === orderItemId
					? { ...item, restock: checked, restockTouched: true }
					: item,
			),
		);
	};

	// Smart toggle : si tous les items disponibles sont sélectionnés → tout désélectionner
	const refundableItems = order.items.filter((oi) => getAvailableQuantity(oi) > 0);
	const allSelected =
		refundableItems.length > 0 &&
		refundableItems.every((oi) => {
			const state = items.find((i) => i.orderItemId === oi.id);
			return state?.selected;
		});

	const handleSelectToggle = () => {
		haptic("selection");
		const currentItems = form.getFieldValue("items");
		if (allSelected) {
			form.setFieldValue(
				"items",
				currentItems.map((item) => ({ ...item, selected: false, quantity: 0 })),
			);
		} else {
			form.setFieldValue(
				"items",
				currentItems.map((item) => {
					const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
					const available = orderItem ? getAvailableQuantity(orderItem) : 0;
					return {
						...item,
						selected: available > 0,
						quantity: available,
					};
				}),
			);
		}
	};

	const canSubmit =
		canSubmitRefund(selectedItems, totalAmount, maxRefundable) &&
		(!isCancelledOrder || acceptCancelledOrder);
	const restockByDefault = getDefaultRestock(reason);

	return (
		<div className="space-y-6">
			{/* Header — PAS de bouton « Retour » ici : `AdminMobileHeader` porte déjà le
			    chevron de retour sur cette route (`remboursements/nouveau`), et ce bouton
			    n'était même pas borné en breakpoint. Le chemin vers la commande d'origine
			    reste offert, mais porté par la référence de commande elle-même — un lien
			    contextuel, pas une seconde affordance de retour. */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Nouveau remboursement</h1>
				<p className="text-muted-foreground text-sm">
					<Link
						href={orderDetailPath}
						onClick={() => haptic("light")}
						className="hover:text-foreground focus-ring rounded-sm underline decoration-dotted underline-offset-2 transition-colors"
					>
						Commande {order.orderNumber}
					</Link>
					{" • "}
					{order.customerName}
				</p>
			</div>

			{/* Mobile sticky récap chip */}
			{selectedItems.length > 0 && (
				<div
					// `--admin-header-height` (déclarée) et non `--admin-mobile-header-height`
					// (qui n'existait nulle part → fallback 56px permanent). Pas de
					// `env(safe-area-inset-top)` : `body` porte déjà ce padding.
					// `md:hidden` aligné sur le breakpoint du header mobile (était `lg:hidden`,
					// donc la puce se collait sous un header absent entre 768 et 1024px).
					className="bg-background/95 sticky top-[var(--admin-header-height,3.5rem)] z-10 -mx-[var(--admin-main-x,1.5rem)] px-[var(--admin-main-x,1.5rem)] py-2 backdrop-blur-md md:hidden"
					style={{ viewTransitionName: "refund-mini-recap" }}
				>
					<div
						className={cn(
							"bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm",
							totalAmount > maxRefundable && "bg-destructive/10 text-destructive",
						)}
					>
						<span>
							{selectedItems.length} bijou{selectedItems.length > 1 ? "x" : ""} sélectionné
							{selectedItems.length > 1 ? "s" : ""}
						</span>
						<span className="font-semibold tabular-nums">{formatEuro(totalAmount)}</span>
					</div>
				</div>
			)}

			<form
				ref={formRef}
				aria-label="Formulaire de remboursement"
				aria-busy={isPending}
				onInvalidCapture={onInvalidCapture}
				onSubmit={(event) => {
					event.preventDefault();
					if (isPending || form.state.isSubmitting) return;
					const formData = new FormData(event.currentTarget);
					runAfterValidation(
						form.handleSubmit(),
						() => {
							if (form.state.isValid && canSubmit) {
								action(formData);
							} else {
								requestAnimationFrame(() => focusFirstInvalid());
							}
						},
						"CreateRefundForm",
					);
				}}
				className="space-y-6"
			>
				{/* Hidden fields — reason/note/acceptCancelledOrder sont soumis par les field components */}
				<input type="hidden" name="orderId" value={order.id} />
				<input type="hidden" name="items" value={JSON.stringify(itemsForAction)} />

				{/* Erreur serveur globale (VALIDATION_ERROR retirée du toast) */}
				<FormServerErrorAlert errors={serverErrors} />

				{/* Résumé d'erreurs — après une tentative de soumission */}
				<form.Subscribe
					selector={(state) => ({
						submissionAttempts: state.submissionAttempts,
						fieldMeta: state.fieldMeta,
					})}
				>
					{({ submissionAttempts, fieldMeta }) => {
						if (!submissionAttempts) return null;
						const fieldErrors: ErrorSummaryField[] = [];
						if (selectedItems.length === 0) {
							fieldErrors.push({
								name: "refund-items",
								label: FIELD_LABELS["refund-items"]!,
								message: "Sélectionne au moins un bijou",
							});
						} else if (totalAmount > maxRefundable) {
							fieldErrors.push({
								name: "refund-items",
								label: FIELD_LABELS["refund-items"]!,
								message: "Le montant dépasse le maximum remboursable",
							});
						}
						for (const [name, meta] of Object.entries(
							fieldMeta as Record<string, { errors?: unknown[] }>,
						)) {
							const message = (meta.errors ?? [])[0];
							if (typeof message === "string" && message.length > 0) {
								fieldErrors.push({ name, label: FIELD_LABELS[name] ?? name, message });
							}
						}
						if (fieldErrors.length === 0) return null;
						return (
							<ErrorSummary
								fieldErrors={fieldErrors}
								ariaLive={totalAmount > maxRefundable ? "assertive" : "polite"}
							/>
						);
					}}
				</form.Subscribe>

				{isCancelledOrder && (
					<div
						role="alert"
						className="border-warning/40 bg-warning/10 text-warning-foreground flex items-start gap-3 rounded-md border p-4"
					>
						<div className="flex-1 space-y-2">
							<p className="text-sm font-semibold">Cette commande est annulée</p>
							<p className="text-warning-foreground/80 text-xs">
								Le remboursement reste possible si le paiement a été capturé, mais vérifie
								qu&apos;un voidInvoice ou un avoir n&apos;a pas déjà été émis depuis
								l&apos;annulation.
							</p>
							<form.AppField
								name="acceptCancelledOrder"
								listeners={{ onChange: () => haptic("selection") }}
							>
								{(field) => (
									<field.CheckboxField label="Je confirme vouloir rembourser cette commande annulée" />
								)}
							</form.AppField>
						</div>
					</div>
				)}

				<RequiredFieldsNote />

				<fieldset disabled={isPending} className="grid gap-6 lg:grid-cols-3 lg:items-start">
					{/* Left column - Items selection */}
					<div className="space-y-6 lg:col-span-2">
						<RefundItemsCard
							orderItems={order.items}
							itemStates={items}
							isPending={isPending}
							allSelected={allSelected}
							onSelectToggle={handleSelectToggle}
							onItemToggle={handleItemToggle}
							onQuantityChange={handleQuantityChange}
							onRestockToggle={handleRestockToggle}
						/>
					</div>

					{/* Right column - Sidebar (Reason + Note + Recap) */}
					<RefundSidebarCards
						form={form}
						isPending={isPending}
						restockByDefault={restockByDefault}
						onReasonChange={handleReasonChange}
						selectedCount={selectedItems.length}
						totalAmount={totalAmount}
						alreadyRefunded={alreadyRefunded}
						maxRefundable={maxRefundable}
					/>
				</fieldset>

				<form.AppForm>
					<AdminFormFooter pending={isPending}>
						<div className="flex justify-end">
							{/* Volontairement PAS de disabled={!canSubmit} : le bouton reste cliquable
							    pour déclencher l'ErrorSummary (feedback explicite plutôt que bouton mort) ;
							    la garde onSubmit bloque la soumission invalide. Ne pas « harmoniser ». */}
							<Button
								type="submit"
								disabled={isPending}
								onClick={() => haptic("medium")}
								className={cn(
									"w-full sm:w-auto sm:min-w-56",
									canSubmit &&
										!isPending &&
										"data-[disabled=false]:shadow-[0_0_24px_var(--color-glow-pink,theme(colors.pink.300))] motion-safe:transition-shadow",
								)}
							>
								{isPending ? (
									<>
										<RotateCcw className="size-4 motion-safe:animate-spin" aria-hidden="true" />
										<span>Création…</span>
									</>
								) : (
									<>
										<RotateCcw className="size-4" aria-hidden="true" />
										<span>
											Créer la demande
											{selectedItems.length > 0 ? ` · ${formatEuro(totalAmount)}` : ""}
										</span>
									</>
								)}
								{!isPending && (
									<Kbd
										aria-hidden="true"
										className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
									>
										⌘S
									</Kbd>
								)}
							</Button>
						</div>
					</AdminFormFooter>
				</form.AppForm>
			</form>
		</div>
	);
}
