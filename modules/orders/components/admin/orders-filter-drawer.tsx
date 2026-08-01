"use client";

import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ORDER_TOTAL_FILTER_MAX_EUROS } from "@/modules/orders/constants/order.constants";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_LABELS,
	INVOICE_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";
import { SHIPPABLE_PAYMENT_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import {
	appendToShipParams,
	TO_SHIP_FULFILLMENT_STATUSES,
} from "@/modules/orders/constants/to-ship";

interface OrdersFilterDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** DOM `id` of the drawer content node (paired with `aria-controls`). */
	id?: string;
}

/**
 * Preset composé « à expédier » — la seule file de travail quotidienne, et la seule
 * chose que ce tiroir mono-sélection ne pouvait pas exprimer : elle croise deux
 * dimensions multi-valeurs (`paymentStatus` ∈ {PAID, PARTIALLY_REFUNDED} ET
 * `fulfillmentStatus` ∈ {UNFULFILLED, PROCESSING}). Le plus proche disponible était
 * « Statut: En préparation », qui ne désigne pas la même population.
 *
 * Miroir du prédicat SSOT `buildToShipWhereClause()` / `ORDERS_TO_SHIP_HREF`.
 */
const TO_SHIP_VALUE = "preset_toship";

/**
 * Presets booléens de facturation — auparavant desktop uniquement, alors qu'ils
 * désignent des anomalies à traiter (commande encaissée sans facture, PDF non archivé,
 * DLQ escaladée) qu'on consulte aussi depuis un téléphone.
 *
 * Ils entrent dans la mono-sélection de ce tiroir : ce sont des « vues » exclusives,
 * pas des raffinements cumulables — cohérent avec le modèle existant.
 */
const INVOICE_PRESETS = [
	{ value: "preset_invoiceAnomaly", param: "filter_invoiceAnomaly", label: "Anomalie de facture" },
	{ value: "preset_pdfNotArchived", param: "filter_pdfNotArchived", label: "PDF non archivé" },
	{ value: "preset_retryDeferred", param: "filter_retryDeferred", label: "Retry escaladé" },
] as const;

const DELETED_VALUE = "preset_deleted";

const FILTER_OPTIONS = [
	{ value: "all", label: "Tous" },
	{ value: TO_SHIP_VALUE, label: "À expédier" },
	// Order statuses
	...Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => ({
		value: `status_${key}`,
		label: `Statut: ${label}`,
	})),
	// Payment statuses
	...Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => ({
		value: `payment_${key}`,
		label: `Paiement: ${label}`,
	})),
	// Fulfillment statuses
	...Object.entries(FULFILLMENT_STATUS_LABELS).map(([key, label]) => ({
		value: `fulfillment_${key}`,
		label: `Livraison: ${label}`,
	})),
	// Invoice statuses
	...Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => ({
		value: `invoice_${key}`,
		label: `Facture: ${label}`,
	})),
	// Presets de facturation + corbeille (parité avec la feuille desktop)
	...INVOICE_PRESETS.map(({ value, label }) => ({ value, label })),
	{ value: DELETED_VALUE, label: "Corbeille (supprimées)" },
];

/** Dimensions remises à zéro à chaque sélection dans la liste. */
const RESET_FILTER_KEYS = [
	"filter_status",
	"filter_paymentStatus",
	"filter_fulfillmentStatus",
	"filter_invoiceStatus",
	"filter_invoiceAnomaly",
	"filter_pdfNotArchived",
	"filter_retryDeferred",
	"filter_showDeleted",
] as const;

/**
 * Bornes de raffinement (montant, période) — CUMULABLES avec la mono-sélection
 * ci-dessus, et donc gérées par un formulaire séparé plutôt que comme des « options »
 * de la listbox (une fourchette n'est pas un choix exclusif).
 *
 * Les montants sont en EUROS, comme la feuille desktop et l'URL ; `parseFilters`
 * convertit en centimes (cf. ORDER_TOTAL_FILTER_MAX_EUROS pour la frontière d'unité).
 */
const RANGE_KEYS = [
	"filter_totalMin",
	"filter_totalMax",
	"filter_createdAfter",
	"filter_createdBefore",
] as const;

function getCurrentFilter(searchParams: URLSearchParams): string {
	const paymentStatuses = searchParams.getAll("filter_paymentStatus");
	const fulfillmentStatuses = searchParams.getAll("filter_fulfillmentStatus");

	// Preset composé d'abord : ses paramètres ressemblent sinon à un filtre simple.
	const isToShip =
		paymentStatuses.length === SHIPPABLE_PAYMENT_STATUSES.length &&
		SHIPPABLE_PAYMENT_STATUSES.every((s) => paymentStatuses.includes(s)) &&
		fulfillmentStatuses.length === TO_SHIP_FULFILLMENT_STATUSES.length &&
		TO_SHIP_FULFILLMENT_STATUSES.every((s) => fulfillmentStatuses.includes(s));
	if (isToShip) return TO_SHIP_VALUE;

	// Presets booléens ensuite : eux aussi ressembleraient sinon à « Tous ».
	for (const { value, param } of INVOICE_PRESETS) {
		const raw = searchParams.get(param);
		if (raw === "true" || raw === "1") return value;
	}
	if (searchParams.get("filter_showDeleted") === "deleted") return DELETED_VALUE;

	const filterStatus = searchParams.get("filter_status");
	const filterInvoiceStatus = searchParams.get("filter_invoiceStatus");

	if (filterStatus) return `status_${filterStatus}`;
	if (paymentStatuses[0]) return `payment_${paymentStatuses[0]}`;
	if (fulfillmentStatuses[0]) return `fulfillment_${fulfillmentStatuses[0]}`;
	if (filterInvoiceStatus) return `invoice_${filterInvoiceStatus}`;
	return "all";
}

function OrdersFilterDrawerInner({ open, onOpenChange, id }: OrdersFilterDrawerProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentFilter = getCurrentFilter(searchParams);
	const [optimisticFilter, setOptimisticFilter] = useOptimistic(currentFilter);

	const handleSelect = (value: string) => {
		startTransition(() => {
			setOptimisticFilter(value);
			const params = new URLSearchParams(searchParams);

			// Reset cursor and all filters
			params.delete("cursor");
			params.delete("direction");
			for (const key of RESET_FILTER_KEYS) params.delete(key);

			// Apply new filter
			if (value === TO_SHIP_VALUE) {
				// Applier SSOT partagé avec `ORDERS_TO_SHIP_HREF` : construire la
				// query-string ici laissait le preset mobile omettre `filter_status`,
				// donc afficher les commandes annulées que la pastille ne compte pas.
				appendToShipParams(params);
			} else if (value.startsWith("status_")) {
				params.set("filter_status", value.replace("status_", ""));
			} else if (value.startsWith("payment_")) {
				params.set("filter_paymentStatus", value.replace("payment_", ""));
			} else if (value.startsWith("fulfillment_")) {
				params.set("filter_fulfillmentStatus", value.replace("fulfillment_", ""));
			} else if (value.startsWith("invoice_")) {
				params.set("filter_invoiceStatus", value.replace("invoice_", ""));
			} else if (value === DELETED_VALUE) {
				params.set("filter_showDeleted", "deleted");
			} else {
				const preset = INVOICE_PRESETS.find((p) => p.value === value);
				if (preset) params.set(preset.param, "true");
			}

			router.push(`?${params.toString()}`, { scroll: false });
			onOpenChange(false);
		});
	};

	/**
	 * Applique les bornes de raffinement sans toucher à la mono-sélection en cours.
	 *
	 * `onSubmit` et non `action={}` : ce handler est purement CLIENT (il réécrit l'URL),
	 * il n'appelle aucune Server Action et ne produit donc aucun `ActionState` à
	 * surfacer. Le garde-fou `server-validation-error-surfaced` traite tout
	 * `<form action={…}>` comme branché sur le pipeline toast — passer par `onSubmit`
	 * évite de l'affaiblir par une entrée d'allowlist qui ne décrirait pas la réalité.
	 */
	const handleApplyRanges = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		startTransition(() => {
			const params = new URLSearchParams(searchParams);
			params.delete("cursor");
			params.delete("direction");
			for (const key of RANGE_KEYS) params.delete(key);

			// Chaque borne est écrite INDÉPENDAMMENT (cf. feuille desktop) : émettre un
			// plafond par défaut non saisi faisait échouer la validation du schéma.
			for (const key of RANGE_KEYS) {
				const raw = formData.get(key);
				if (typeof raw === "string" && raw.trim() !== "") params.set(key, raw.trim());
			}

			router.push(`?${params.toString()}`, { scroll: false });
			onOpenChange(false);
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent id={id}>
				<DrawerHeader>
					<DrawerTitle>Filtrer les commandes</DrawerTitle>
				</DrawerHeader>
				<DrawerBody className="overscroll-contain" data-vaul-no-drag>
					<div role="listbox" aria-label="Filtrer les commandes" className="flex flex-col gap-1">
						{FILTER_OPTIONS.map((option) => {
							const isSelected = optimisticFilter === option.value;

							return (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={isSelected}
									onClick={() => handleSelect(option.value)}
									disabled={isPending}
									className={cn(
										"focus-ring flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
										isSelected
											? "bg-primary/5 text-foreground"
											: "text-foreground can-hover:hover:bg-muted/50",
									)}
								>
									<span>{option.label}</span>
									{isSelected && (
										<Check className="text-primary size-4 shrink-0" aria-hidden="true" />
									)}
								</button>
							);
						})}
					</div>

					{/* Bornes de raffinement — cumulables avec la sélection ci-dessus, d'où un
					    formulaire séparé et non des entrées de la listbox. Inputs natifs
					    `type="number"` / `type="date"` : sur mobile ils ouvrent le pavé
					    numérique et le sélecteur de date du système, plus utilisables qu'un
					    calendrier custom dans une feuille Vaul. */}
					<form onSubmit={handleApplyRanges} className="mt-4 space-y-4 border-t pt-4">
						<fieldset className="space-y-2" disabled={isPending}>
							<legend className="text-foreground text-sm font-medium">Montant (EUR)</legend>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label htmlFor="drawer-total-min" className="text-muted-foreground text-xs">
										Min
									</Label>
									<Input
										id="drawer-total-min"
										name="filter_totalMin"
										type="number"
										inputMode="numeric"
										min={0}
										max={ORDER_TOTAL_FILTER_MAX_EUROS}
										defaultValue={searchParams.get("filter_totalMin") ?? ""}
										placeholder="0"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="drawer-total-max" className="text-muted-foreground text-xs">
										Max
									</Label>
									<Input
										id="drawer-total-max"
										name="filter_totalMax"
										type="number"
										inputMode="numeric"
										min={0}
										max={ORDER_TOTAL_FILTER_MAX_EUROS}
										defaultValue={searchParams.get("filter_totalMax") ?? ""}
										placeholder={String(ORDER_TOTAL_FILTER_MAX_EUROS)}
									/>
								</div>
							</div>
						</fieldset>

						<fieldset className="space-y-2" disabled={isPending}>
							<legend className="text-foreground text-sm font-medium">Période</legend>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label htmlFor="drawer-created-after" className="text-muted-foreground text-xs">
										Du
									</Label>
									<Input
										id="drawer-created-after"
										name="filter_createdAfter"
										type="date"
										defaultValue={searchParams.get("filter_createdAfter") ?? ""}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="drawer-created-before" className="text-muted-foreground text-xs">
										Au
									</Label>
									<Input
										id="drawer-created-before"
										name="filter_createdBefore"
										type="date"
										defaultValue={searchParams.get("filter_createdBefore") ?? ""}
									/>
								</div>
							</div>
						</fieldset>

						<Button type="submit" className="w-full" disabled={isPending}>
							Appliquer
						</Button>
					</form>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}

export function OrdersFilterDrawer(props: ComponentProps<typeof OrdersFilterDrawerInner>) {
	return (
		<Suspense fallback={null}>
			<OrdersFilterDrawerInner {...props} />
		</Suspense>
	);
}
