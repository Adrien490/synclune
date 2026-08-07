"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { AmountRangeInputs } from "./amount-range-inputs";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
	INVOICE_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";
import { ORDER_TOTAL_FILTER_MAX_EUROS } from "@/modules/orders/constants/order.constants";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarBlankIcon } from "@phosphor-icons/react/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, Suspense, type ComponentProps } from "react";

interface OrdersFilterSheetProps {
	className?: string;
	/**
	 * Contrat CONTRÔLÉ, aligné sur les sept autres `*FilterSheet` (2026-08-07).
	 *
	 * Il manquait ici, et c'est ce qui avait fait naître `orders-filter-drawer.tsx`
	 * (331 l.) : faute de pouvoir piloter cette feuille depuis la barre basse, une
	 * seconde implémentation avait été écrite pour le mobile. Les deux traitaient
	 * exactement les **mêmes onze** `filter_*` — 1 004 lignes pour un seul filtre,
	 * et deux endroits où ajouter tout nouveau critère.
	 */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
	/** `id` DOM du contenu de la feuille (appairé à `aria-controls`). */
	id?: string;
}

interface FilterFormData {
	statuses: string[];
	paymentStatuses: string[];
	invoiceStatuses: string[];
	invoiceAnomaly: boolean;
	pdfNotArchived: boolean;
	retryDeferred: boolean;
	priceRange: [number, number];
	dateRange: {
		from: string;
		to: string;
	};
	showDeleted?: "all" | "active" | "deleted";
}

// Plafond du filtre montant, en EUROS (les inputs et l'URL sont en euros ;
// `parseFilters` convertit en centimes). Dérivé du plafond du schéma : coder une
// valeur en dur ici avait produit un plafond 5× supérieur à ce que le schéma accepte,
// et donc un crash de la liste dès qu'on renseignait un montant.
const MAX_PRICE = ORDER_TOTAL_FILTER_MAX_EUROS;
const DEFAULT_PRICE_RANGE = [0, MAX_PRICE];

// Format JOUR partagé avec le tiroir mobile : son `<input type="date">`
// n'accepte que YYYY-MM-DD — un ISO complet écrit ici s'affichait vide dans le
// tiroir, dont handleApplyRanges purgeait alors la période en silence à la
// validation suivante (audit 2026-08-01, P3). `parseFilters` étend la borne
// « Au » à la fin du jour choisi.
const toDayParam = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
		date.getDate(),
	).padStart(2, "0")}`;

function OrdersFilterSheetInner({
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: OrdersFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialize values from URL params
	const initialValues = ((): FilterFormData => {
		const statuses: string[] = [];
		const paymentStatuses: string[] = [];
		const invoiceStatuses: string[] = [];
		let invoiceAnomaly = false;
		let pdfNotArchived = false;
		let retryDeferred = false;
		let priceMin = DEFAULT_PRICE_RANGE[0]!;
		let priceMax = DEFAULT_PRICE_RANGE[1]!;
		let dateFrom = "";
		let dateTo = "";
		let showDeleted: "all" | "active" | "deleted" | undefined = "active";

		searchParams.forEach((value, key) => {
			if (key === "filter_status") {
				statuses.push(value);
			} else if (key === "filter_paymentStatus") {
				paymentStatuses.push(value);
			} else if (key === "filter_invoiceStatus") {
				invoiceStatuses.push(value);
			} else if (key === "filter_invoiceAnomaly") {
				invoiceAnomaly = value === "true" || value === "1";
			} else if (key === "filter_pdfNotArchived") {
				pdfNotArchived = value === "true" || value === "1";
			} else if (key === "filter_retryDeferred") {
				retryDeferred = value === "true" || value === "1";
			} else if (key === "filter_totalMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0]!;
			} else if (key === "filter_totalMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1]!;
			} else if (key === "filter_createdAfter") {
				dateFrom = value;
			} else if (key === "filter_createdBefore") {
				dateTo = value;
			} else if (key === "filter_showDeleted") {
				showDeleted = value as "all" | "active" | "deleted";
			}
		});

		return {
			statuses: [...new Set(statuses)],
			paymentStatuses: [...new Set(paymentStatuses)],
			invoiceStatuses: [...new Set(invoiceStatuses)],
			invoiceAnomaly,
			pdfNotArchived,
			retryDeferred,
			priceRange: [priceMin, priceMax],
			dateRange: { from: dateFrom, to: dateTo },
			showDeleted,
		};
	})();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		// Remove all filter params
		const filterKeys = [
			"filter_status",
			"filter_paymentStatus",
			"filter_invoiceStatus",
			"filter_invoiceAnomaly",
			"filter_pdfNotArchived",
			"filter_retryDeferred",
			"filter_totalMin",
			"filter_totalMax",
			"filter_createdAfter",
			"filter_createdBefore",
			"filter_showDeleted",
		];
		filterKeys.forEach((key) => {
			params.delete(key);
		});

		// Repartir du début du nouveau jeu de résultats.
		//
		// ⚠️ Ces listes sont en pagination CURSEUR : `page` n'est lu par personne, et
		// conserver le `cursor` de l'ancien jeu fait repositionner Prisma sur cet id dans
		// le nouveau `where` (+ `skip: 1`) → tranche arbitraire, sans erreur ni signal
		// visible. Cf. le commentaire de `shared/hooks/use-filter.ts`. Le tiroir mobile
		// fait déjà ce nettoyage.
		params.delete("cursor");
		params.delete("direction");
		params.delete("page"); // résidu offset : plus personne ne le lit

		// Add statuses
		if (formData.statuses.length > 0) {
			formData.statuses.forEach((status) => params.append("filter_status", status));
		}

		// Add payment statuses
		if (formData.paymentStatuses.length > 0) {
			formData.paymentStatuses.forEach((status) => params.append("filter_paymentStatus", status));
		}

		// Add invoice statuses (Art. 286 CGI — auditer factures émises/voided)
		if (formData.invoiceStatuses.length > 0) {
			formData.invoiceStatuses.forEach((status) => params.append("filter_invoiceStatus", status));
		}

		// Preset anomalie (EINV-UI-005) : PAID + invoiceNumber IS NULL
		if (formData.invoiceAnomaly) {
			params.set("filter_invoiceAnomaly", "true");
		}

		// Preset PDF non archivé (EINV-UI-106) : GENERATED + invoicePdfUrl IS NULL
		if (formData.pdfNotArchived) {
			params.set("filter_pdfNotArchived", "true");
		}

		// Preset retry escaladé (EINV-UI-106) : invoiceRetryDeferred = true
		if (formData.retryDeferred) {
			params.set("filter_retryDeferred", "true");
		}

		// Fourchette de montant, en euros (parseFilters convertit en centimes).
		// Chaque borne est écrite INDÉPENDAMMENT : émettre systématiquement les deux
		// poussait le plafond par défaut dans l'URL, ce qui suffisait à faire échouer la
		// validation et à planter la liste alors que l'admin n'avait rempli que « Min ».
		if (formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0]) {
			params.set("filter_totalMin", formData.priceRange[0].toString());
		}
		if (formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]) {
			params.set("filter_totalMax", formData.priceRange[1].toString());
		}

		// Add date range
		if (formData.dateRange.from) {
			params.set("filter_createdAfter", formData.dateRange.from);
		}
		if (formData.dateRange.to) {
			params.set("filter_createdBefore", formData.dateRange.to);
		}

		// Add showDeleted filter
		if (formData.showDeleted && formData.showDeleted !== "active") {
			params.set("filter_showDeleted", formData.showDeleted);
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		const defaultValues: FilterFormData = {
			statuses: [],
			paymentStatuses: [],
			invoiceStatuses: [],
			invoiceAnomaly: false,
			pdfNotArchived: false,
			retryDeferred: false,
			priceRange: [DEFAULT_PRICE_RANGE[0]!, DEFAULT_PRICE_RANGE[1]!],
			dateRange: { from: "", to: "" },
			showDeleted: "active",
		};

		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_status",
			"filter_paymentStatus",
			"filter_invoiceStatus",
			"filter_invoiceAnomaly",
			"filter_pdfNotArchived",
			"filter_retryDeferred",
			"filter_totalMin",
			"filter_totalMax",
			"filter_createdAfter",
			"filter_createdBefore",
			"filter_showDeleted",
		];
		filterKeys.forEach((key) => {
			params.delete(key);
		});
		// Cf. applyFilters : pagination curseur, donc purger le curseur et non `page`.
		params.delete("cursor");
		params.delete("direction");
		params.delete("page");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	// Calculate active filters from URL
	// Count unique filter keys present in the URL to stay in sync with filterKeys
	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;

		// Multi-value filters: count each individual value
		const multiValueKeys = [
			"filter_status",
			"filter_paymentStatus",
			"filter_invoiceStatus",
			"filter_invoiceAnomaly",
			"filter_pdfNotArchived",
			"filter_retryDeferred",
		];
		// Bornes appariées : le groupe compte pour 1 dès qu'UNE borne est présente.
		// L'ancienne table ne reconnaissait que la clé « représentante »
		// (filter_totalMin / filter_createdAfter) alors que chaque borne est écrite
		// indépendamment : « Max = 200 € » seul donnait un compteur à 0 pendant que
		// le badge affichait le filtre et que la StickyActionBar comptait 1 — trois
		// compteurs, deux réponses (audit 2026-08-01, P2).
		const pairedFilterGroups: Record<string, string> = {
			filter_totalMin: "total",
			filter_totalMax: "total",
			filter_createdAfter: "created",
			filter_createdBefore: "created",
		};
		const countedGroups = new Set<string>();
		// Single-value filters: count if present and non-default
		const singleValueDefaults: Record<string, string> = {
			filter_showDeleted: "active",
		};

		searchParams.forEach((value, key) => {
			if (multiValueKeys.includes(key)) {
				count += 1;
			} else if (key in pairedFilterGroups) {
				const group = pairedFilterGroups[key]!;
				if (!countedGroups.has(group)) {
					countedGroups.add(group);
					count += 1;
				}
			} else if (key in singleValueDefaults && value !== singleValueDefaults[key]) {
				count += 1;
			}
		});

		return {
			hasActiveFilters: count > 0,
			activeFiltersCount: count,
		};
	})();

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
			open={controlledOpen}
			onOpenChange={controlledOnOpenChange}
			hideTrigger={hideTrigger}
			id={id}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Order Status */}
				<form.Field name="statuses" mode="array">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de commande
							</legend>
							{Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => {
								const isSelected = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`status-${value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(value);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(value);
												field.removeValue(index);
											}
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</fieldset>
					)}
				</form.Field>

				<Separator />

				{/* Payment Status */}
				<form.Field name="paymentStatuses" mode="array">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de paiement
							</legend>
							{Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => {
								const isSelected = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`payment-${value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(value);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(value);
												field.removeValue(index);
											}
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</fieldset>
					)}
				</form.Field>

				<Separator />

				{/* Invoice Status (Art. 286 CGI — audit fiscal) */}
				<form.Field name="invoiceStatuses" mode="array">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de facture
							</legend>
							{Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => {
								const isSelected = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`invoice-${value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(value);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(value);
												field.removeValue(index);
											}
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</fieldset>
					)}
				</form.Field>

				{/* Presets maintenance facturation (EINV-UI-005 + EINV-UI-106) */}
				<fieldset className="space-y-1">
					<legend className="text-foreground mb-2 text-sm font-medium">
						Anomalies de facturation
					</legend>
					<form.Field name="invoiceAnomaly">
						{(field) => (
							<CheckboxFilterItem
								id="invoice-anomaly"
								checked={field.state.value === true}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true);
								}}
							>
								Commandes payées sans facture émise (Art. 286 / 289-I CGI)
							</CheckboxFilterItem>
						)}
					</form.Field>
					<form.Field name="pdfNotArchived">
						{(field) => (
							<CheckboxFilterItem
								id="invoice-pdf-not-archived"
								checked={field.state.value === true}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true);
								}}
							>
								Facture émise sans PDF archivé (Art. L102 B LPF)
							</CheckboxFilterItem>
						)}
					</form.Field>
					<form.Field name="retryDeferred">
						{(field) => (
							<CheckboxFilterItem
								id="invoice-retry-deferred"
								checked={field.state.value === true}
								onCheckedChange={(checked) => {
									field.handleChange(checked === true);
								}}
							>
								Archivage / avoir escaladé en échec (DLQ)
							</CheckboxFilterItem>
						)}
					</form.Field>
				</fieldset>

				<Separator />

				{/* Price Range */}
				<form.Field name="priceRange">
					{(field) => (
						<AmountRangeInputs
							value={field.state.value}
							onChange={field.handleChange}
							maxPrice={MAX_PRICE}
						/>
					)}
				</form.Field>

				<Separator />

				{/* Date Range avec Calendar */}
				<fieldset className="space-y-3">
					<legend className="text-foreground text-sm font-medium">Période de commande</legend>

					{/* Date presets */}
					<div className="flex flex-wrap gap-2">
						{[
							{
								label: "Aujourd'hui",
								getRange: () => {
									const today = toDayParam(new Date());
									return { from: today, to: today };
								},
							},
							{
								label: "7 derniers jours",
								getRange: () => {
									const from = new Date();
									from.setDate(from.getDate() - 7);
									return { from: toDayParam(from), to: toDayParam(new Date()) };
								},
							},
							{
								label: "Ce mois",
								getRange: () => {
									const to = new Date();
									const from = new Date(to.getFullYear(), to.getMonth(), 1);
									return { from: toDayParam(from), to: toDayParam(to) };
								},
							},
						].map((preset) => (
							<Button
								key={preset.label}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const range = preset.getRange();
									form.setFieldValue("dateRange.from", range.from);
									form.setFieldValue("dateRange.to", range.to);
								}}
							>
								{preset.label}
							</Button>
						))}
					</div>

					<div className="space-y-3">
						<form.Field name="dateRange.from">
							{(field) => (
								<div className="space-y-2">
									<Label className="text-sm">Du</Label>
									<Popover>
										<PopoverTrigger
											render={
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.state.value && "text-muted-foreground",
													)}
												/>
											}
										>
											<CalendarBlankIcon className="mr-2 h-4 w-4" />
											{field.state.value ? (
												format(new Date(field.state.value), "PPP", {
													locale: fr,
												})
											) : (
												<span>Sélectionner une date</span>
											)}
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? toDayParam(date) : "");
												}}
												disabled={(date) => {
													if (date > new Date() || date < new Date("2020-01-01")) return true;
													// Cross-field guard (ORD-UI-006) : dateFrom <= dateTo
													const dateTo = form.getFieldValue("dateRange.to");
													return dateTo ? date > new Date(dateTo) : false;
												}}
												// eslint-disable-next-line jsx-a11y/no-autofocus -- Calendar in Popover: focus expected on explicit open
												autoFocus
											/>
										</PopoverContent>
									</Popover>
								</div>
							)}
						</form.Field>
						<form.Field name="dateRange.to">
							{(field) => (
								<div className="space-y-2">
									<Label className="text-sm">Au</Label>
									<Popover>
										<PopoverTrigger
											render={
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.state.value && "text-muted-foreground",
													)}
												/>
											}
										>
											<CalendarBlankIcon className="mr-2 h-4 w-4" />
											{field.state.value ? (
												format(new Date(field.state.value), "PPP", {
													locale: fr,
												})
											) : (
												<span>Sélectionner une date</span>
											)}
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? toDayParam(date) : "");
												}}
												disabled={(date) => {
													if (date > new Date() || date < new Date("2020-01-01")) return true;
													// Cross-field guard (ORD-UI-006) : dateTo >= dateFrom
													const dateFrom = form.getFieldValue("dateRange.from");
													return dateFrom ? date < new Date(dateFrom) : false;
												}}
												// eslint-disable-next-line jsx-a11y/no-autofocus -- Calendar in Popover: focus expected on explicit open
												autoFocus
											/>
										</PopoverContent>
									</Popover>
								</div>
							)}
						</form.Field>
					</div>
				</fieldset>

				<Separator />

				{/* Show Deleted Filter */}
				<form.Field name="showDeleted">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Affichage</legend>
							{(
								[
									{ value: "all" as const, label: "Toutes" },
									{ value: "active" as const, label: "Non supprimées uniquement" },
									{ value: "deleted" as const, label: "Supprimées uniquement" },
								] as const
							).map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`showDeleted-${value}`}
									name="showDeleted"
									value={value}
									checked={field.state.value === value}
									onCheckedChange={(checked) => {
										if (checked) {
											field.handleChange(value);
										}
									}}
								>
									{label}
								</RadioFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}

export function OrdersFilterSheet(props: ComponentProps<typeof OrdersFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<OrdersFilterSheetInner {...props} />
		</Suspense>
	);
}
