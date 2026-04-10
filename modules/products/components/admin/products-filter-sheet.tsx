"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Accordion } from "@/shared/components/ui/accordion";
import { useRouter, useSearchParams } from "next/navigation";
import {
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useDeferredValue,
	useRef,
	useState,
	useTransition,
} from "react";
import { useAppForm } from "@/shared/components/forms";
import { ProductsFilterSections } from "./products-filter-sections";
import {
	ALL_FILTER_KEYS,
	EMPTY_PRODUCT_TYPES,
	EMPTY_COLLECTIONS,
	EMPTY_COLORS,
	EMPTY_MATERIALS,
} from "./products-filter-sheet.types";

import type { ProductsFilterSheetProps, AdminFilterFormData } from "./products-filter-sheet.types";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductsFilterSheet({
	className,
	productTypes = EMPTY_PRODUCT_TYPES,
	collections = EMPTY_COLLECTIONS,
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	maxPriceInCents = 50000,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
}: ProductsFilterSheetProps) {
	const maxPriceInEuros = Math.ceil(maxPriceInCents / 100);
	const DEFAULT_PRICE_RANGE: [number, number] = [0, maxPriceInEuros];

	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Controlled/uncontrolled open state
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;

	// P1.2: Focus restoration (WCAG 2.4.3)
	const triggerRef = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (isOpen) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [isOpen]);

	// Search state for long lists
	const [colorSearch, setColorSearch] = useState("");
	const [materialSearch, setMaterialSearch] = useState("");
	const deferredColorSearch = useDeferredValue(colorSearch);
	const deferredMaterialSearch = useDeferredValue(materialSearch);

	const getValuesFromURL = (): AdminFilterFormData => {
		const statuses: string[] = [];
		const typeSlugs: string[] = [];
		const collectionIds: string[] = [];
		const colorSlugs: string[] = [];
		const materialSlugs: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];
		let stockStatus: string | null = null;
		let onSale = false;
		let createdAfter = "";
		let createdBefore = "";
		let updatedAfter = "";
		let updatedBefore = "";

		searchParams.forEach((value, key) => {
			if (key === "filter_status") statuses.push(value);
			else if (key === "filter_typeId") typeSlugs.push(value);
			else if (key === "filter_collectionId") collectionIds.push(value);
			else if (key === "filter_color") colorSlugs.push(value);
			else if (key === "filter_material") materialSlugs.push(value);
			else if (key === "filter_priceMin") {
				const n = Number(value);
				if (!isNaN(n)) priceMin = Math.round(n / 100);
			} else if (key === "filter_priceMax") {
				const n = Number(value);
				if (!isNaN(n)) priceMax = Math.round(n / 100);
			} else if (key === "filter_stockStatus") {
				if (value === "in_stock" || value === "out_of_stock") stockStatus = value;
			} else if (key === "filter_onSale") {
				onSale = value === "true";
			} else if (key === "filter_createdAfter") createdAfter = value;
			else if (key === "filter_createdBefore") createdBefore = value;
			else if (key === "filter_updatedAfter") updatedAfter = value;
			else if (key === "filter_updatedBefore") updatedBefore = value;
		});

		return {
			statuses: [...new Set(statuses)],
			priceRange: [priceMin, priceMax],
			typeSlugs: [...new Set(typeSlugs)],
			collectionIds: [...new Set(collectionIds)],
			colorSlugs: [...new Set(colorSlugs)],
			materialSlugs: [...new Set(materialSlugs)],
			stockStatus,
			onSale,
			createdAfter,
			createdBefore,
			updatedAfter,
			updatedBefore,
		};
	};

	const initialValues = getValuesFromURL();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: AdminFilterFormData }) => {
			applyFilters(value);
		},
	});

	// P1.1: Sync form values from URL when sheet opens or URL changes
	const onSheetSync = useEffectEvent(() => {
		const values = getValuesFromURL();
		form.reset(values);
		setColorSearch("");
		setMaterialSearch("");
	});

	useEffect(() => {
		if (isOpen) {
			onSheetSync();
		}
	}, [isOpen, searchParams]);

	const applyFilters = (formData: AdminFilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		ALL_FILTER_KEYS.forEach((key) => params.delete(key));
		params.set("page", "1");

		// Statuses
		formData.statuses.forEach((s) => params.append("filter_status", s));

		// Types (slug-based)
		formData.typeSlugs.forEach((slug) => params.append("filter_typeId", slug));

		// Collections
		formData.collectionIds.forEach((id) => params.append("filter_collectionId", id));

		// Colors
		formData.colorSlugs.forEach((slug) => params.append("filter_color", slug));

		// Materials
		formData.materialSlugs.forEach((slug) => params.append("filter_material", slug));

		// Price (convert euros to cents)
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("filter_priceMin", (formData.priceRange[0] * 100).toString());
			params.set("filter_priceMax", (formData.priceRange[1] * 100).toString());
		}

		// Stock status
		if (formData.stockStatus) {
			params.set("filter_stockStatus", formData.stockStatus);
		}

		// On sale
		if (formData.onSale) {
			params.set("filter_onSale", "true");
		}

		// Date filters
		if (formData.createdAfter) params.set("filter_createdAfter", formData.createdAfter);
		if (formData.createdBefore) params.set("filter_createdBefore", formData.createdBefore);
		if (formData.updatedAfter) params.set("filter_updatedAfter", formData.updatedAfter);
		if (formData.updatedBefore) params.set("filter_updatedBefore", formData.updatedBefore);

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			statuses: [],
			priceRange: DEFAULT_PRICE_RANGE,
			typeSlugs: [],
			collectionIds: [],
			colorSlugs: [],
			materialSlugs: [],
			stockStatus: null,
			onSale: false,
			createdAfter: "",
			createdBefore: "",
			updatedAfter: "",
			updatedBefore: "",
		});

		const params = new URLSearchParams(searchParams.toString());
		ALL_FILTER_KEYS.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		searchParams.forEach((_, key) => {
			if (ALL_FILTER_KEYS.includes(key)) count += 1;
		});
		// Group priceMin/priceMax as 1
		const hasPriceMin = searchParams.has("filter_priceMin");
		const hasPriceMax = searchParams.has("filter_priceMax");
		if (hasPriceMin && hasPriceMax) count -= 1;
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	// Sort colors and materials by count (descending)
	const sortedColors = [...colors].sort((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = [...materials].sort(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);

	// Filter lists by deferred search term
	const filteredColors = deferredColorSearch
		? sortedColors.filter((c) => c.name.toLowerCase().includes(deferredColorSearch.toLowerCase()))
		: sortedColors;
	const filteredMaterials = deferredMaterialSearch
		? sortedMaterials.filter((m) =>
				m.name.toLowerCase().includes(deferredMaterialSearch.toLowerCase()),
			)
		: sortedMaterials;

	// Default open sections: types + price + any section with active filters
	const defaultOpenSections = (() => {
		const sections = ["status", "types", "price"];
		if (initialValues.colorSlugs.length > 0) sections.push("colors");
		if (initialValues.materialSlugs.length > 0) sections.push("materials");
		if (initialValues.stockStatus || initialValues.onSale) sections.push("availability");
		if (
			initialValues.createdAfter ||
			initialValues.createdBefore ||
			initialValues.updatedAfter ||
			initialValues.updatedBefore
		)
			sections.push("dates");
		return sections;
	})();

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={(newOpen) => {
				(controlledOnOpenChange ?? setInternalOpen)(newOpen);
				if (!newOpen) {
					triggerRef.current?.focus();
				}
			}}
			hideTrigger={hideTrigger}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
			title="Filtres"
			description="Affinez votre recherche"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<Accordion
					type="multiple"
					defaultValue={defaultOpenSections}
					className="w-full"
					aria-label="Filtres de recherche"
				>
					<ProductsFilterSections
						form={form}
						productTypes={productTypes}
						collections={collections}
						sortedColors={sortedColors}
						sortedMaterials={sortedMaterials}
						filteredColors={filteredColors}
						filteredMaterials={filteredMaterials}
						colorSearch={colorSearch}
						setColorSearch={setColorSearch}
						materialSearch={materialSearch}
						setMaterialSearch={setMaterialSearch}
						defaultPriceRange={DEFAULT_PRICE_RANGE}
						maxPriceInEuros={maxPriceInEuros}
					/>
				</Accordion>
			</form>
		</FilterSheetWrapper>
	);
}
