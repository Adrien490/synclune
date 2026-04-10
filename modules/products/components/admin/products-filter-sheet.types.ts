import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductsFilterSheetProps {
	className?: string;
	productTypes?: Array<{ id: string; label: string; slug: string }>;
	collections?: Array<{ id: string; name: string }>;
	colors?: GetColorsReturn["colors"];
	materials?: MaterialOption[];
	maxPriceInCents?: number;
	/** Controlled open state. */
	open?: boolean;
	/** Controlled open change handler. */
	onOpenChange?: (open: boolean) => void;
	/** Hide the default trigger button. */
	hideTrigger?: boolean;
}

export interface AdminFilterFormData {
	statuses: string[];
	priceRange: [number, number];
	typeSlugs: string[];
	collectionIds: string[];
	colorSlugs: string[];
	materialSlugs: string[];
	stockStatus: string | null;
	onSale: boolean;
	createdAfter: string;
	createdBefore: string;
	updatedAfter: string;
	updatedBefore: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEARCH_THRESHOLD = 8;

export const ALL_FILTER_KEYS = [
	"filter_status",
	"filter_priceMin",
	"filter_priceMax",
	"filter_typeId",
	"filter_collectionId",
	"filter_color",
	"filter_material",
	"filter_stockStatus",
	"filter_onSale",
	"filter_createdAfter",
	"filter_createdBefore",
	"filter_updatedAfter",
	"filter_updatedBefore",
];

export const STATUS_OPTIONS = [
	{ value: "PUBLIC", label: "Public" },
	{ value: "DRAFT", label: "Brouillon" },
	{ value: "ARCHIVED", label: "Archivé" },
] as const;

// ============================================================================
// FORM TYPES (shared across filter section components)
// ============================================================================

/**
 * Minimal form interface matching the subset of useAppForm API used by sections.
 * Avoids importing complex TanStack Form generics.
 */
export interface FilterForm {
	Field: React.ComponentType<{
		name: keyof AdminFilterFormData;
		mode?: "array";
		children: (field: FilterFieldApi) => React.ReactNode;
	}>;
	state: {
		values: AdminFilterFormData;
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Wraps TanStack Form's complex generic API
	setFieldValue: (name: keyof AdminFilterFormData, value: any) => void;
}

export interface FilterFieldApi {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field value type varies per field
	state: { value: any };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form field value type varies per field
	handleChange: (value: any) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form pushValue accepts field-dependent types
	pushValue: (value: any) => void;
	removeValue: (index: number) => void;
}

// ============================================================================
// EMPTY DEFAULTS
// ============================================================================

export const EMPTY_PRODUCT_TYPES: Array<{ id: string; label: string; slug: string }> = [];
export const EMPTY_COLLECTIONS: Array<{ id: string; name: string }> = [];
export const EMPTY_COLORS: GetColorsReturn["colors"] = [];
export const EMPTY_MATERIALS: MaterialOption[] = [];
