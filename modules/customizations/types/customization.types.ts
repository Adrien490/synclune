// ============================================================================
// STATUS TYPE - Client-safe type (mirrors Prisma enum)
// ============================================================================

/**
 * Client-safe type for customization request status.
 * Must be kept in sync with Prisma enum CustomizationRequestStatus.
 */
export type CustomizationRequestStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED";

// ============================================================================
// PRODUCT TYPE - For customization form
// ============================================================================

export interface ProductType {
	id: string;
	label: string;
	slug: string;
}

// ============================================================================
// LIST ITEM TYPE
// ============================================================================

export interface CustomizationRequestListItem {
	id: string;
	createdAt: Date;
	firstName: string;
	lastName: string;
	email: string;
	phone: string | null;
	productTypeLabel: string;
	status: CustomizationRequestStatus;
	adminNotes: string | null;
	respondedAt: Date | null;
	_count: {
		inspirationProducts: number;
		preferredColors: number;
		preferredMaterials: number;
	};
}

// ============================================================================
// DETAIL TYPE
// ============================================================================

export interface CustomizationRequestDetail {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	firstName: string;
	lastName: string;
	email: string;
	phone: string | null;
	productTypeLabel: string;
	productType: {
		id: string;
		label: string;
		slug: string;
	} | null;
	details: string;
	status: CustomizationRequestStatus;
	adminNotes: string | null;
	respondedAt: Date | null;
	inspirationProducts: {
		id: string;
		title: string;
		slug: string;
		skus: {
			id: string;
			images: {
				url: string;
			}[];
		}[];
	}[];
	preferredColors: {
		id: string;
		name: string;
		hex: string;
	}[];
	preferredMaterials: {
		id: string;
		name: string;
		description: string | null;
	}[];
}

// ============================================================================
// STATS TYPE
// ============================================================================

export interface CustomizationStats {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	open: number;
	closed: number;
	thisMonth: number;
}

// ============================================================================
// PARAMS & RESULTS TYPES
// ============================================================================

export interface CustomizationFilters {
	status?: CustomizationRequestStatus;
	search?: string;
}

export interface GetCustomizationRequestsParams {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	filters?: CustomizationFilters;
}

export interface GetCustomizationRequestsResult {
	items: CustomizationRequestListItem[];
	pagination: {
		nextCursor: string | null;
		prevCursor: string | null;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

// ============================================================================
// PRODUCT SEARCH TYPE
// ============================================================================

export interface ProductSearchResult {
	id: string;
	title: string;
	slug: string;
	description: string | null;
	imageUrl: string | null;
	blurDataUrl: string | null;
}
