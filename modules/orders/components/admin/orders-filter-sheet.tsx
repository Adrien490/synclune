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
	FULFILLMENT_STATUS_LABELS,
	INVOICE_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, Suspense, type ComponentProps } from "react";

interface OrdersFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	statuses: string[];
	paymentStatuses: string[];
	fulfillmentStatuses: string[];
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

const MAX_PRICE = 500_000; // 5 000€ in cents — couvre la fourchette bijoux artisanaux haut-de-gamme
const DEFAULT_PRICE_RANGE = [0, MAX_PRICE];

function OrdersFilterSheetInner({ className }: OrdersFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialize values from URL params
	const initialValues = ((): FilterFormData => {
		const statuses: string[] = [];
		const paymentStatuses: string[] = [];
		const fulfillmentStatuses: string[] = [];
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
			} else if (key === "filter_fulfillmentStatus") {
				fulfillmentStatuses.push(value);
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
			fulfillmentStatuses: [...new Set(fulfillmentStatuses)],
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
			"filter_fulfillmentStatus",
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

		// Reset to page 1
		params.set("page", "1");

		// Add statuses
		if (formData.statuses.length > 0) {
			formData.statuses.forEach((status) => params.append("filter_status", status));
		}

		// Add payment statuses
		if (formData.paymentStatuses.length > 0) {
			formData.paymentStatuses.forEach((status) => params.append("filter_paymentStatus", status));
		}

		// Add fulfillment statuses
		if (formData.fulfillmentStatuses.length > 0) {
			formData.fulfillmentStatuses.forEach((status) =>
				params.append("filter_fulfillmentStatus", status),
			);
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

		// Add price range (convert euros to cents)
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("filter_totalMin", formData.priceRange[0].toString());
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
			fulfillmentStatuses: [],
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
			"filter_fulfillmentStatus",
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
		params.set("page", "1");

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
			"filter_fulfillmentStatus",
			"filter_invoiceStatus",
			"filter_invoiceAnomaly",
			"filter_pdfNotArchived",
			"filter_retryDeferred",
		];
		// Paired filters: count the pair as one filter (use the first key as representative)
		const pairedFilters: Record<string, string[]> = {
			filter_totalMin: ["filter_totalMin", "filter_totalMax"],
			filter_createdAfter: ["filter_createdAfter", "filter_createdBefore"],
		};
		// Single-value filters: count if present and non-default
		const singleValueDefaults: Record<string, string> = {
			filter_showDeleted: "active",
		};

		searchParams.forEach((value, key) => {
			if (multiValueKeys.includes(key)) {
				count += 1;
			} else if (key in pairedFilters) {
				count += 1;
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

				{/* Fulfillment Status */}
				<form.Field name="fulfillmentStatuses" mode="array">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de traitement
							</legend>
							{Object.entries(FULFILLMENT_STATUS_LABELS).map(([value, label]) => {
								const isSelected = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`fulfillment-${value}`}
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
									const today = new Date();
									today.setHours(0, 0, 0, 0);
									return { from: today.toISOString(), to: new Date().toISOString() };
								},
							},
							{
								label: "7 derniers jours",
								getRange: () => {
									const to = new Date();
									const from = new Date();
									from.setDate(from.getDate() - 7);
									from.setHours(0, 0, 0, 0);
									return { from: from.toISOString(), to: to.toISOString() };
								},
							},
							{
								label: "Ce mois",
								getRange: () => {
									const to = new Date();
									const from = new Date(to.getFullYear(), to.getMonth(), 1);
									return { from: from.toISOString(), to: to.toISOString() };
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
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													"w-full justify-start text-left font-normal",
													!field.state.value && "text-muted-foreground",
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{field.state.value ? (
													format(new Date(field.state.value), "PPP", {
														locale: fr,
													})
												) : (
													<span>Sélectionner une date</span>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
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
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													"w-full justify-start text-left font-normal",
													!field.state.value && "text-muted-foreground",
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{field.state.value ? (
													format(new Date(field.state.value), "PPP", {
														locale: fr,
													})
												) : (
													<span>Sélectionner une date</span>
												)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
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
