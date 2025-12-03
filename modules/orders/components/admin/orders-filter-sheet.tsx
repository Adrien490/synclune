"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { useAppForm } from "@/shared/components/tanstack-form";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import { Slider } from "@/shared/components/ui/slider";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

interface OrdersFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	statuses: string[];
	paymentStatuses: string[];
	priceRange: [number, number];
	dateRange: {
		from: string;
		to: string;
	};
	showDeleted?: "all" | "active" | "deleted";
}

const MAX_PRICE = 10000; // 100€ in cents

export function OrdersFilterSheet({ className }: OrdersFilterSheetProps) {
	const DEFAULT_PRICE_RANGE = useMemo(() => [0, MAX_PRICE], []);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialize values from URL params
	const initialValues = useMemo((): FilterFormData => {
		const statuses: string[] = [];
		const paymentStatuses: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];
		let dateFrom = "";
		let dateTo = "";
		let showDeleted: "all" | "active" | "deleted" | undefined = "active";

		searchParams.forEach((value, key) => {
			if (key === "filter_status") {
				statuses.push(value);
			} else if (key === "filter_paymentStatus") {
				paymentStatuses.push(value);
			} else if (key === "filter_totalMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0];
			} else if (key === "filter_totalMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1];
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
			priceRange: [priceMin, priceMax],
			dateRange: { from: dateFrom, to: dateTo },
			showDeleted,
		};
	}, [searchParams, DEFAULT_PRICE_RANGE]);

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
			formData.statuses.forEach((status) =>
				params.append("filter_status", status)
			);
		}

		// Add payment statuses
		if (formData.paymentStatuses.length > 0) {
			formData.paymentStatuses.forEach((status) =>
				params.append("filter_paymentStatus", status)
			);
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
			priceRange: [DEFAULT_PRICE_RANGE[0], DEFAULT_PRICE_RANGE[1]],
			dateRange: { from: "", to: "" },
			showDeleted: "active",
		};

		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_status",
			"filter_paymentStatus",
			"filter_totalMin",
			"filter_totalMax",
			"filter_createdAfter",
			"filter_createdBefore",
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
	const { hasActiveFilters, activeFiltersCount } = useMemo(() => {
		let count = 0;

		searchParams.forEach((value, key) => {
			if (["page", "perPage", "sortBy", "search"].includes(key)) {
				return;
			}

			if (key === "filter_status" || key === "filter_paymentStatus") {
				count += 1;
			} else if (key === "filter_totalMin" || key === "filter_totalMax") {
				if (key === "filter_totalMin") count += 1;
			} else if (
				key === "filter_createdAfter" ||
				key === "filter_createdBefore"
			) {
				if (key === "filter_createdAfter") count += 1;
			}
		});

		return {
			hasActiveFilters: count > 0,
			activeFiltersCount: count,
		};
	}, [searchParams]);

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Order Status */}
				<form.Field name="statuses" mode="array">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Statut de commande
							</h4>
							<div className="space-y-2">
								{Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => {
									const isSelected = field.state.value.includes(value);
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
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
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`status-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Payment Status */}
				<form.Field name="paymentStatuses" mode="array">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Statut de paiement
							</h4>
							<div className="space-y-2">
								{Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => {
									const isSelected = field.state.value.includes(value);
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
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
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`payment-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Price Range */}
				<form.Field name="priceRange">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Montant (€)
							</h4>
							<div className="space-y-3">
								<Slider
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange([value[0], value[1]])
									}
									max={MAX_PRICE}
									min={0}
									step={100}
									className="w-full"
								/>
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{(field.state.value[0] / 100).toFixed(2)}€</span>
									<span>{(field.state.value[1] / 100).toFixed(2)}€</span>
								</div>
							</div>
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Date Range avec Calendar */}
				<div className="space-y-3">
					<h4 className="font-medium text-sm text-foreground">
						Période de commande
					</h4>
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
													!field.state.value && "text-muted-foreground"
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
												selected={
													field.state.value
														? new Date(field.state.value)
														: undefined
												}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
												}}
												disabled={(date) =>
													date > new Date() || date < new Date("2020-01-01")
												}
												initialFocus
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
													!field.state.value && "text-muted-foreground"
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
												selected={
													field.state.value
														? new Date(field.state.value)
														: undefined
												}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
												}}
												disabled={(date) =>
													date > new Date() || date < new Date("2020-01-01")
												}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
								</div>
							)}
						</form.Field>
					</div>
				</div>

				<Separator />

				{/* Show Deleted Filter */}
				<form.Field name="showDeleted">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Affichage</h4>
							<div className="space-y-2">
								{([
									{ value: "all" as const, label: "Toutes" },
									{ value: "active" as const, label: "Non supprimées uniquement" },
									{ value: "deleted" as const, label: "Supprimées uniquement" },
								] as const).map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`showDeleted-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`showDeleted-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
