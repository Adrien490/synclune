"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import dynamic from "next/dynamic";

// Lazy load Calendar pour améliorer les performances mobile (TTI)
const Calendar = dynamic(
	() => import("@/shared/components/ui/calendar").then((mod) => mod.Calendar),
	{
		loading: () => (
			<div className="h-[280px] w-full animate-pulse bg-muted rounded-md" />
		),
		ssr: false,
	}
);
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
import { useEffect, useState, useTransition } from "react";

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
const DEFAULT_PRICE_RANGE = [0, MAX_PRICE];

/**
 * Composant interne pour gerer les inputs de montant avec etat local
 * Les valeurs internes sont en centimes, affichees en euros
 */
function AmountRangeInputs({
	value,
	onChange,
	maxPrice,
}: {
	value: [number, number];
	onChange: (value: [number, number]) => void;
	maxPrice: number;
}) {
	// Etat local en euros pour permettre l'edition libre
	const [minInput, setMinInput] = useState(String(Math.round(value[0] / 100)));
	const [maxInput, setMaxInput] = useState(String(Math.round(value[1] / 100)));

	// Synchroniser l'etat local quand la valeur externe change (ex: slider)
	useEffect(() => {
		setMinInput(String(Math.round(value[0] / 100)));
	}, [value[0]]);

	useEffect(() => {
		setMaxInput(String(Math.round(value[1] / 100)));
	}, [value[1]]);

	const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMinInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Convertir en centimes et appliquer les contraintes
			const centsValue = numValue * 100;
			const constrainedValue = Math.min(Math.max(0, centsValue), value[1]);
			onChange([constrainedValue, value[1]]);
		}
	};

	const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMaxInput(inputValue);

		const numValue = Number(inputValue);
		if (!isNaN(numValue) && inputValue !== "") {
			// Convertir en centimes et appliquer les contraintes
			const centsValue = numValue * 100;
			const constrainedValue = Math.max(Math.min(maxPrice, centsValue), value[0]);
			onChange([value[0], constrainedValue]);
		}
	};

	const handleMinBlur = () => {
		const numValue = Number(minInput);
		if (isNaN(numValue) || minInput === "") {
			setMinInput(String(Math.round(value[0] / 100)));
		} else {
			const centsValue = numValue * 100;
			const constrainedValue = Math.min(Math.max(0, centsValue), value[1]);
			setMinInput(String(Math.round(constrainedValue / 100)));
			if (constrainedValue !== value[0]) {
				onChange([constrainedValue, value[1]]);
			}
		}
	};

	const handleMaxBlur = () => {
		const numValue = Number(maxInput);
		if (isNaN(numValue) || maxInput === "") {
			setMaxInput(String(Math.round(value[1] / 100)));
		} else {
			const centsValue = numValue * 100;
			const constrainedValue = Math.max(Math.min(maxPrice, centsValue), value[0]);
			setMaxInput(String(Math.round(constrainedValue / 100)));
			if (constrainedValue !== value[1]) {
				onChange([value[0], constrainedValue]);
			}
		}
	};

	return (
		<div className="space-y-3">
			<h4 className="font-medium text-sm text-foreground">Montant (€)</h4>
			<div className="space-y-4">
				{/* data-vaul-no-drag empeche le drawer de capturer le drag du slider */}
				<div data-vaul-no-drag>
					<Slider
						value={value}
						onValueChange={(newValue) => onChange([newValue[0], newValue[1]])}
						max={maxPrice}
						min={0}
						step={100}
						className="w-full"
					/>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex-1">
						<Input
							type="number"
							min={0}
							max={Math.round(value[1] / 100)}
							value={minInput}
							onChange={handleMinChange}
							onBlur={handleMinBlur}
							className="h-10 text-sm"
							aria-label="Montant minimum"
						/>
					</div>
					<span className="text-muted-foreground shrink-0">—</span>
					<div className="flex-1">
						<Input
							type="number"
							min={Math.round(value[0] / 100)}
							max={Math.round(maxPrice / 100)}
							value={maxInput}
							onChange={handleMaxChange}
							onBlur={handleMaxBlur}
							className="h-10 text-sm"
							aria-label="Montant maximum"
						/>
					</div>
					<span className="text-muted-foreground text-sm shrink-0">€</span>
				</div>
			</div>
		</div>
	);
}

export function OrdersFilterSheet({ className }: OrdersFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialize values from URL params
	const initialValues = ((): FilterFormData => {
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
	const { hasActiveFilters, activeFiltersCount } = (() => {
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
	})();

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
						<div className="space-y-1">
							<h4 className="font-medium text-sm text-foreground mb-2">
								Statut de commande
							</h4>
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
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Payment Status */}
				<form.Field name="paymentStatuses" mode="array">
					{(field) => (
						<div className="space-y-1">
							<h4 className="font-medium text-sm text-foreground mb-2">
								Statut de paiement
							</h4>
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
						</div>
					)}
				</form.Field>

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
						<div className="space-y-1">
							<h4 className="font-medium text-sm text-foreground mb-2">Affichage</h4>
							{([
								{ value: "all" as const, label: "Toutes" },
								{ value: "active" as const, label: "Non supprimées uniquement" },
								{ value: "deleted" as const, label: "Supprimées uniquement" },
							] as const).map(({ value, label }) => {
								const isSelected = field.state.value === value;
								return (
									<CheckboxFilterItem
										key={value}
										id={`showDeleted-${value}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked) {
												field.handleChange(value);
											}
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</div>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
