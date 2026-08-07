"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Accordion } from "@/shared/components/ui/accordion";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { withViewTransition } from "@/shared/utils/view-transition";
import { useRouter, useSearchParams } from "next/navigation";
import {
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { useAppForm } from "@/shared/components/forms";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
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
// CONSTANTS
// ============================================================================

/** Sections possibles de l'Accordion (sert au focus management desktop). */
type SectionValue =
	"status" | "types" | "price" | "colors" | "materials" | "collections" | "availability" | "dates";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ProductsFilterSheetInner({
	className,
	productTypes = EMPTY_PRODUCT_TYPES,
	collections = EMPTY_COLLECTIONS,
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	maxPriceInCents = 50000,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: ProductsFilterSheetProps) {
	const maxPriceInEuros = Math.ceil(maxPriceInCents / 100);
	const DEFAULT_PRICE_RANGE: [number, number] = [0, maxPriceInEuros];

	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const isMobile = useIsMobile();

	// Controlled/uncontrolled open state
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;

	// Focus restoration (WCAG 2.4.3) — capture activeElement avant que le sheet
	// ne vole le focus, restaure sur close via rAF + preventScroll (évite jump iOS).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	// Ref sur la racine Accordion pour focus le 1er input d'une section
	// dépliée manuellement (desktop uniquement).
	const accordionRef = useRef<HTMLDivElement>(null);

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
				if (value === "in_stock" || value === "low_stock" || value === "out_of_stock")
					stockStatus = value;
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

	// Resynchronise le FORMULAIRE sur l'URL. `form.reset` n'est pas un state React
	// (TanStack Form est un store externe), donc cet effet ne dérive rien : il
	// pousse une source externe (searchParams) vers une autre. Les deux `useState`
	// locaux qui étaient vidés ici, eux, sont partis dans `handleOpenChange`.
	const onSheetSync = useEffectEvent(() => {
		form.reset(getValuesFromURL());
	});

	useEffect(() => {
		if (isOpen) {
			onSheetSync();
		}
	}, [isOpen, searchParams]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
			// Vider les champs de recherche de section à l'OUVERTURE, dans le
			// gestionnaire d'événement — c'est une interaction utilisateur, pas une
			// dérivation. Le faire depuis l'effet de synchronisation obligeait à
			// `setState` dedans (d'où l'ancien `eslint-disable`) et re-rendait une
			// fois de plus après paint. Ce handler est le point de passage UNIQUE
			// des deux modes (contrôlé par la barre basse, ou interne).
			setColorSearch("");
			setMaterialSearch("");
		}
		(controlledOnOpenChange ?? setInternalOpen)(nextOpen);
		if (!nextOpen) {
			requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
		}
	};

	const applyFilters = (formData: AdminFilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		ALL_FILTER_KEYS.forEach((key) => params.delete(key));
		params.set("page", "1");

		formData.statuses.forEach((s) => params.append("filter_status", s));
		formData.typeSlugs.forEach((slug) => params.append("filter_typeId", slug));
		formData.collectionIds.forEach((id) => params.append("filter_collectionId", id));
		formData.colorSlugs.forEach((slug) => params.append("filter_color", slug));
		formData.materialSlugs.forEach((slug) => params.append("filter_material", slug));

		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("filter_priceMin", (formData.priceRange[0] * 100).toString());
			params.set("filter_priceMax", (formData.priceRange[1] * 100).toString());
		}

		if (formData.stockStatus) {
			params.set("filter_stockStatus", formData.stockStatus);
		}

		if (formData.onSale) {
			params.set("filter_onSale", "true");
		}

		if (formData.createdAfter) params.set("filter_createdAfter", formData.createdAfter);
		if (formData.createdBefore) params.set("filter_createdBefore", formData.createdBefore);
		if (formData.updatedAfter) params.set("filter_updatedAfter", formData.updatedAfter);
		if (formData.updatedBefore) params.set("filter_updatedBefore", formData.updatedBefore);

		startTransition(() => {
			withViewTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
		});
	};

	const clearAllFilters = () => {
		triggerHaptic("light");
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
			withViewTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		searchParams.forEach((_, key) => {
			if (ALL_FILTER_KEYS.includes(key)) count += 1;
		});
		const hasPriceMin = searchParams.has("filter_priceMin");
		const hasPriceMax = searchParams.has("filter_priceMax");
		if (hasPriceMin && hasPriceMax) count -= 1;
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	const sortedColors = colors.toSorted((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = materials.toSorted(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);

	const filteredColors = deferredColorSearch
		? sortedColors.filter((c) => c.name.toLowerCase().includes(deferredColorSearch.toLowerCase()))
		: sortedColors;
	const filteredMaterials = deferredMaterialSearch
		? sortedMaterials.filter((m) =>
				m.name.toLowerCase().includes(deferredMaterialSearch.toLowerCase()),
			)
		: sortedMaterials;

	// Lazy-init stable defaultOpenSections — types + price toujours, autres si actifs.
	// Status retiré du toujours-ouvert : 3 sections initiales saturent l'écran mobile.
	const [defaultOpenSections] = useState<string[]>(() => {
		const sections = ["types", "price"];
		if (initialValues.statuses.length > 0) sections.push("status");
		if (initialValues.colorSlugs.length > 0) sections.push("colors");
		if (initialValues.materialSlugs.length > 0) sections.push("materials");
		if (initialValues.collectionIds.length > 0) sections.push("collections");
		if (initialValues.stockStatus || initialValues.onSale) sections.push("availability");
		if (
			initialValues.createdAfter ||
			initialValues.createdBefore ||
			initialValues.updatedAfter ||
			initialValues.updatedBefore
		)
			sections.push("dates");
		return sections;
	});
	const previousOpenSectionsRef = useRef<string[]>(defaultOpenSections);

	// Liste effective des sections rendues (filtre les sections conditionnelles
	// absentes : types/colors/materials/collections renvoient null si vide).
	// Permet de retrouver le bon AccordionItem via son index DOM.
	const renderedSections: SectionValue[] = [
		"status",
		...(productTypes.length > 0 ? (["types"] as const) : []),
		"price",
		...(sortedColors.length > 0 ? (["colors"] as const) : []),
		...(sortedMaterials.length > 0 ? (["materials"] as const) : []),
		...(collections.length > 0 ? (["collections"] as const) : []),
		"availability",
		"dates",
	];

	// Quand une section Accordion est dépliée manuellement (desktop), focus le
	// 1er input. Skip mobile pour ne pas ouvrir le clavier soft.
	const handleAccordionValueChange = (values: string[]) => {
		const prev = previousOpenSectionsRef.current;
		previousOpenSectionsRef.current = values;
		if (isMobile) return;
		const previousSet = new Set(prev);
		const renderedSet = new Set<string>(renderedSections);
		const newlyOpened = values.find((v) => !previousSet.has(v) && renderedSet.has(v)) as
			SectionValue | undefined;
		if (!newlyOpened) return;
		const index = renderedSections.indexOf(newlyOpened);
		if (index < 0 || !accordionRef.current) return;
		requestAnimationFrame(() => {
			const item = accordionRef.current?.children[index] as HTMLElement | undefined;
			if (!item) return;
			const focusable = item.querySelector<HTMLElement>(
				'input:not([type="hidden"]):not([disabled]), [role="slider"]:not([disabled])',
			);
			focusable?.focus({ preventScroll: true });
		});
	};

	// Compte des filtres actifs dans le formulaire (pas l'URL) pour annoncer
	// les toggles avant Apply, mis à jour à chaque ajout/retrait via chip ou section.
	const formValues = form.state.values;
	const pendingFilterCount =
		formValues.statuses.length +
		formValues.typeSlugs.length +
		formValues.collectionIds.length +
		formValues.colorSlugs.length +
		formValues.materialSlugs.length +
		(formValues.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
		formValues.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
			? 1
			: 0) +
		(formValues.stockStatus ? 1 : 0) +
		(formValues.onSale ? 1 : 0) +
		(formValues.createdAfter ? 1 : 0) +
		(formValues.createdBefore ? 1 : 0) +
		(formValues.updatedAfter ? 1 : 0) +
		(formValues.updatedBefore ? 1 : 0);

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			id={id}
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
					ref={accordionRef}
					defaultValue={defaultOpenSections}
					onValueChange={handleAccordionValueChange}
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

				<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					{pendingFilterCount === 0
						? "Aucun filtre sélectionné"
						: `${pendingFilterCount} filtre${pendingFilterCount > 1 ? "s" : ""} sélectionné${pendingFilterCount > 1 ? "s" : ""}`}
				</div>
			</form>
		</FilterSheetWrapper>
	);
}

export function ProductsFilterSheet(props: ComponentProps<typeof ProductsFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<ProductsFilterSheetInner {...props} />
		</Suspense>
	);
}
