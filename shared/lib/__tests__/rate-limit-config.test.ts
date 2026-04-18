import { describe, it, expect } from "vitest";
import type { RateLimitConfig } from "@/shared/types/rate-limit.types";
import {
	// Cart
	CART_ADD_LIMIT,
	CART_UPDATE_LIMIT,
	CART_REMOVE_LIMIT,
	CART_VALIDATE_LIMIT,
	CART_MERGE_LIMIT,
	CART_LIMITS,
	// Payment
	CHECKOUT_CREATE_SESSION_LIMIT,
	DISCOUNT_CODE_VALIDATE_LIMIT,
	PAYMENT_UPDATE_AMOUNT_LIMIT,
	PAYMENT_LIMITS,
	// Auth
	AUTH_LOGIN_LIMIT,
	AUTH_SIGNUP_LIMIT,
	AUTH_PASSWORD_RESET_LIMIT,
	AUTH_EMAIL_VERIFICATION_LIMIT,
	AUTH_PASSWORD_CHANGE_LIMIT,
	AUTH_LIMITS,
	// Sessions
	SESSION_REVOKE_LIMIT,
	// Communication
	CONTACT_SEND_MESSAGE_LIMIT,
	NEWSLETTER_SUBSCRIBE_LIMIT,
	COMMUNICATION_LIMITS,
	// Customization (client)
	CUSTOMIZATION_QUOTE_REQUEST_LIMIT,
	CUSTOMIZATION_IMAGE_UPLOAD_LIMIT,
	CUSTOMIZATION_LIMITS,
	// Orders (client)
	ORDER_CREATE_LIMIT,
	ORDER_CANCEL_LIMIT,
	ORDER_INVOICE_DOWNLOAD_LIMIT,
	ORDER_LIMITS,
	// Products (client)
	PRODUCT_SEARCH_LIMIT,
	PRODUCT_REVIEW_LIMIT,
	REVIEW_LOAD_MORE_LIMIT,
	PRODUCT_COOKIE_ACTION_LIMIT,
	PRODUCT_LIMITS,
	// Wishlist
	WISHLIST_TOGGLE_LIMIT,
	WISHLIST_MERGE_LIMIT,
	WISHLIST_LIMITS,
	// User account
	USER_DELETE_ACCOUNT_LIMIT,
	USER_EXPORT_DATA_LIMIT,
	USER_EMAIL_CHANGE_LIMIT,
	USER_UPDATE_PROFILE_LIMIT,
	USER_CANCEL_DELETION_LIMIT,
	USER_LIMITS,
	// Return
	RETURN_REQUEST_LIMIT,
	// Address
	ADDRESS_MUTATE_LIMIT,
	ADDRESS_SEARCH_LIMIT,
	ADDRESS_LIMITS,
	// Refunds
	REFUND_CREATE_LIMIT,
	REFUND_PROCESS_LIMIT,
	REFUND_SINGLE_OPERATION_LIMIT,
	REFUND_BULK_OPERATION_LIMIT,
	REFUND_REFRESH_LIMIT,
	REFUND_LIMITS,
	// Admin - testimonials
	ADMIN_TESTIMONIAL_CREATE_LIMIT,
	ADMIN_TESTIMONIAL_UPDATE_LIMIT,
	ADMIN_TESTIMONIAL_DELETE_LIMIT,
	ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT,
	ADMIN_LIMITS,
	// Admin - orders
	ADMIN_ORDER_RESEND_EMAIL_LIMIT,
	ADMIN_ORDER_MARK_AS_PAID_LIMIT,
	ADMIN_ORDER_BULK_OPERATIONS_LIMIT,
	ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT,
	ADMIN_ORDER_REFRESH_LIMIT,
	ADMIN_ORDER_LIMITS,
	// Admin - users
	ADMIN_USER_BULK_OPERATIONS_LIMIT,
	ADMIN_USER_SINGLE_OPERATIONS_LIMIT,
	ADMIN_USER_DELETE_LIMIT,
	ADMIN_USER_EXPORT_DATA_LIMIT,
	ADMIN_USER_SEND_RESET_LIMIT,
	ADMIN_USER_INVALIDATE_SESSIONS_LIMIT,
	ADMIN_USER_REFRESH_LIMIT,
	ADMIN_USER_LIMITS,
	// Admin - products
	ADMIN_PRODUCT_CREATE_LIMIT,
	ADMIN_PRODUCT_UPDATE_LIMIT,
	ADMIN_PRODUCT_DELETE_LIMIT,
	ADMIN_PRODUCT_BULK_DELETE_LIMIT,
	ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT,
	ADMIN_PRODUCT_BULK_STATUS_LIMIT,
	ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT,
	ADMIN_PRODUCT_DUPLICATE_LIMIT,
	ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT,
	ADMIN_PRODUCT_REFRESH_LIMIT,
	ADMIN_PRODUCT_LIMITS,
	// Admin - collections
	ADMIN_COLLECTION_CREATE_LIMIT,
	ADMIN_COLLECTION_UPDATE_LIMIT,
	ADMIN_COLLECTION_DELETE_LIMIT,
	ADMIN_COLLECTION_BULK_DELETE_LIMIT,
	ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT,
	ADMIN_COLLECTION_REFRESH_LIMIT,
	ADMIN_COLLECTION_LIMITS,
	// Admin - materials
	ADMIN_MATERIAL_CREATE_LIMIT,
	ADMIN_MATERIAL_UPDATE_LIMIT,
	ADMIN_MATERIAL_DELETE_LIMIT,
	ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT,
	ADMIN_MATERIAL_DUPLICATE_LIMIT,
	ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT,
	ADMIN_MATERIAL_REFRESH_LIMIT,
	ADMIN_MATERIAL_LIMITS,
	// Admin - colors
	ADMIN_COLOR_CREATE_LIMIT,
	ADMIN_COLOR_UPDATE_LIMIT,
	ADMIN_COLOR_DELETE_LIMIT,
	ADMIN_COLOR_TOGGLE_STATUS_LIMIT,
	ADMIN_COLOR_DUPLICATE_LIMIT,
	ADMIN_COLOR_BULK_OPERATIONS_LIMIT,
	ADMIN_COLOR_REFRESH_LIMIT,
	ADMIN_COLOR_LIMITS,
	// Admin - product types
	ADMIN_PRODUCT_TYPE_CREATE_LIMIT,
	ADMIN_PRODUCT_TYPE_UPDATE_LIMIT,
	ADMIN_PRODUCT_TYPE_DELETE_LIMIT,
	ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT,
	ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT,
	ADMIN_PRODUCT_TYPE_REFRESH_LIMIT,
	ADMIN_PRODUCT_TYPE_LIMITS,
	// Admin - SKUs
	ADMIN_SKU_ADJUST_STOCK_LIMIT,
	ADMIN_SKU_UPDATE_PRICE_LIMIT,
	ADMIN_SKU_CREATE_LIMIT,
	ADMIN_SKU_UPDATE_LIMIT,
	ADMIN_SKU_DELETE_LIMIT,
	ADMIN_SKU_DUPLICATE_LIMIT,
	ADMIN_SKU_TOGGLE_STATUS_LIMIT,
	ADMIN_SKU_BULK_OPERATIONS_LIMIT,
	ADMIN_SKU_LIMITS,
	// Admin - discounts
	ADMIN_DISCOUNT_CREATE_LIMIT,
	ADMIN_DISCOUNT_UPDATE_LIMIT,
	ADMIN_DISCOUNT_DELETE_LIMIT,
	ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT,
	ADMIN_DISCOUNT_DUPLICATE_LIMIT,
	ADMIN_DISCOUNT_BULK_OPERATIONS_LIMIT,
	ADMIN_DISCOUNT_REFRESH_LIMIT,
	ADMIN_DISCOUNT_LIMITS,
	// Admin - reviews
	ADMIN_REVIEW_SEND_EMAIL_LIMIT,
	ADMIN_REVIEW_BULK_OPERATIONS_LIMIT,
	ADMIN_REVIEW_RESPONSE_LIMIT,
	ADMIN_REVIEW_MODERATE_LIMIT,
	ADMIN_REVIEW_LIMITS,
	// Admin - newsletter
	ADMIN_NEWSLETTER_REFRESH_LIMIT,
	ADMIN_NEWSLETTER_LIMITS,
	// Admin - customization
	ADMIN_CUSTOMIZATION_UPDATE_LIMIT,
	ADMIN_CUSTOMIZATION_BULK_UPDATE_LIMIT,
	ADMIN_CUSTOMIZATION_LIMITS,
	// Admin - announcements
	ADMIN_ANNOUNCEMENT_CREATE_LIMIT,
	ADMIN_ANNOUNCEMENT_UPDATE_LIMIT,
	ADMIN_ANNOUNCEMENT_DELETE_LIMIT,
	ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT,
	ADMIN_ANNOUNCEMENT_LIMITS,
	// Admin - FAQ
	ADMIN_FAQ_CREATE_LIMIT,
	ADMIN_FAQ_UPDATE_LIMIT,
	ADMIN_FAQ_DELETE_LIMIT,
	ADMIN_FAQ_REORDER_LIMIT,
	ADMIN_FAQ_LIMITS,
	// Admin - store settings
	ADMIN_STORE_SETTINGS_LIMITS,
} from "@/shared/lib/rate-limit-config";

// ============================================================================
// HELPERS
// ============================================================================

function isValidConfig(config: RateLimitConfig): boolean {
	return (
		typeof config.limit === "number" &&
		config.limit > 0 &&
		typeof config.windowMs === "number" &&
		config.windowMs > 0
	);
}

// ============================================================================
// INDIVIDUAL CONFIGS - valid shape
// ============================================================================

describe("individual rate limit configs - valid shape", () => {
	const configs: [string, RateLimitConfig][] = [
		// Cart
		["CART_ADD_LIMIT", CART_ADD_LIMIT],
		["CART_UPDATE_LIMIT", CART_UPDATE_LIMIT],
		["CART_REMOVE_LIMIT", CART_REMOVE_LIMIT],
		["CART_VALIDATE_LIMIT", CART_VALIDATE_LIMIT],
		["CART_MERGE_LIMIT", CART_MERGE_LIMIT],
		// Payment
		["CHECKOUT_CREATE_SESSION_LIMIT", CHECKOUT_CREATE_SESSION_LIMIT],
		["DISCOUNT_CODE_VALIDATE_LIMIT", DISCOUNT_CODE_VALIDATE_LIMIT],
		["PAYMENT_UPDATE_AMOUNT_LIMIT", PAYMENT_UPDATE_AMOUNT_LIMIT],
		// Auth
		["AUTH_LOGIN_LIMIT", AUTH_LOGIN_LIMIT],
		["AUTH_SIGNUP_LIMIT", AUTH_SIGNUP_LIMIT],
		["AUTH_PASSWORD_RESET_LIMIT", AUTH_PASSWORD_RESET_LIMIT],
		["AUTH_EMAIL_VERIFICATION_LIMIT", AUTH_EMAIL_VERIFICATION_LIMIT],
		["AUTH_PASSWORD_CHANGE_LIMIT", AUTH_PASSWORD_CHANGE_LIMIT],
		// Sessions
		["SESSION_REVOKE_LIMIT", SESSION_REVOKE_LIMIT],
		// Communication
		["CONTACT_SEND_MESSAGE_LIMIT", CONTACT_SEND_MESSAGE_LIMIT],
		["NEWSLETTER_SUBSCRIBE_LIMIT", NEWSLETTER_SUBSCRIBE_LIMIT],
		// Customization
		["CUSTOMIZATION_QUOTE_REQUEST_LIMIT", CUSTOMIZATION_QUOTE_REQUEST_LIMIT],
		["CUSTOMIZATION_IMAGE_UPLOAD_LIMIT", CUSTOMIZATION_IMAGE_UPLOAD_LIMIT],
		// Orders
		["ORDER_CREATE_LIMIT", ORDER_CREATE_LIMIT],
		["ORDER_CANCEL_LIMIT", ORDER_CANCEL_LIMIT],
		["ORDER_INVOICE_DOWNLOAD_LIMIT", ORDER_INVOICE_DOWNLOAD_LIMIT],
		// Products
		["PRODUCT_SEARCH_LIMIT", PRODUCT_SEARCH_LIMIT],
		["PRODUCT_REVIEW_LIMIT", PRODUCT_REVIEW_LIMIT],
		["REVIEW_LOAD_MORE_LIMIT", REVIEW_LOAD_MORE_LIMIT],
		["PRODUCT_COOKIE_ACTION_LIMIT", PRODUCT_COOKIE_ACTION_LIMIT],
		// Wishlist
		["WISHLIST_TOGGLE_LIMIT", WISHLIST_TOGGLE_LIMIT],
		["WISHLIST_MERGE_LIMIT", WISHLIST_MERGE_LIMIT],
		// User
		["USER_DELETE_ACCOUNT_LIMIT", USER_DELETE_ACCOUNT_LIMIT],
		["USER_EXPORT_DATA_LIMIT", USER_EXPORT_DATA_LIMIT],
		["USER_EMAIL_CHANGE_LIMIT", USER_EMAIL_CHANGE_LIMIT],
		["USER_UPDATE_PROFILE_LIMIT", USER_UPDATE_PROFILE_LIMIT],
		["USER_CANCEL_DELETION_LIMIT", USER_CANCEL_DELETION_LIMIT],
		// Return
		["RETURN_REQUEST_LIMIT", RETURN_REQUEST_LIMIT],
		// Address
		["ADDRESS_MUTATE_LIMIT", ADDRESS_MUTATE_LIMIT],
		["ADDRESS_SEARCH_LIMIT", ADDRESS_SEARCH_LIMIT],
		// Refunds
		["REFUND_CREATE_LIMIT", REFUND_CREATE_LIMIT],
		["REFUND_PROCESS_LIMIT", REFUND_PROCESS_LIMIT],
		["REFUND_SINGLE_OPERATION_LIMIT", REFUND_SINGLE_OPERATION_LIMIT],
		["REFUND_BULK_OPERATION_LIMIT", REFUND_BULK_OPERATION_LIMIT],
		["REFUND_REFRESH_LIMIT", REFUND_REFRESH_LIMIT],
		// Admin - testimonials
		["ADMIN_TESTIMONIAL_CREATE_LIMIT", ADMIN_TESTIMONIAL_CREATE_LIMIT],
		["ADMIN_TESTIMONIAL_UPDATE_LIMIT", ADMIN_TESTIMONIAL_UPDATE_LIMIT],
		["ADMIN_TESTIMONIAL_DELETE_LIMIT", ADMIN_TESTIMONIAL_DELETE_LIMIT],
		["ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT", ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT],
		// Admin - orders
		["ADMIN_ORDER_RESEND_EMAIL_LIMIT", ADMIN_ORDER_RESEND_EMAIL_LIMIT],
		["ADMIN_ORDER_MARK_AS_PAID_LIMIT", ADMIN_ORDER_MARK_AS_PAID_LIMIT],
		["ADMIN_ORDER_BULK_OPERATIONS_LIMIT", ADMIN_ORDER_BULK_OPERATIONS_LIMIT],
		["ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT", ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT],
		["ADMIN_ORDER_REFRESH_LIMIT", ADMIN_ORDER_REFRESH_LIMIT],
		// Admin - users
		["ADMIN_USER_BULK_OPERATIONS_LIMIT", ADMIN_USER_BULK_OPERATIONS_LIMIT],
		["ADMIN_USER_SINGLE_OPERATIONS_LIMIT", ADMIN_USER_SINGLE_OPERATIONS_LIMIT],
		["ADMIN_USER_DELETE_LIMIT", ADMIN_USER_DELETE_LIMIT],
		["ADMIN_USER_EXPORT_DATA_LIMIT", ADMIN_USER_EXPORT_DATA_LIMIT],
		["ADMIN_USER_SEND_RESET_LIMIT", ADMIN_USER_SEND_RESET_LIMIT],
		["ADMIN_USER_INVALIDATE_SESSIONS_LIMIT", ADMIN_USER_INVALIDATE_SESSIONS_LIMIT],
		["ADMIN_USER_REFRESH_LIMIT", ADMIN_USER_REFRESH_LIMIT],
		// Admin - products
		["ADMIN_PRODUCT_CREATE_LIMIT", ADMIN_PRODUCT_CREATE_LIMIT],
		["ADMIN_PRODUCT_UPDATE_LIMIT", ADMIN_PRODUCT_UPDATE_LIMIT],
		["ADMIN_PRODUCT_DELETE_LIMIT", ADMIN_PRODUCT_DELETE_LIMIT],
		["ADMIN_PRODUCT_BULK_DELETE_LIMIT", ADMIN_PRODUCT_BULK_DELETE_LIMIT],
		["ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT", ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT],
		["ADMIN_PRODUCT_BULK_STATUS_LIMIT", ADMIN_PRODUCT_BULK_STATUS_LIMIT],
		["ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT", ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT],
		["ADMIN_PRODUCT_DUPLICATE_LIMIT", ADMIN_PRODUCT_DUPLICATE_LIMIT],
		["ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT", ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT],
		["ADMIN_PRODUCT_REFRESH_LIMIT", ADMIN_PRODUCT_REFRESH_LIMIT],
		// Admin - collections
		["ADMIN_COLLECTION_CREATE_LIMIT", ADMIN_COLLECTION_CREATE_LIMIT],
		["ADMIN_COLLECTION_UPDATE_LIMIT", ADMIN_COLLECTION_UPDATE_LIMIT],
		["ADMIN_COLLECTION_DELETE_LIMIT", ADMIN_COLLECTION_DELETE_LIMIT],
		["ADMIN_COLLECTION_BULK_DELETE_LIMIT", ADMIN_COLLECTION_BULK_DELETE_LIMIT],
		["ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT", ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT],
		["ADMIN_COLLECTION_REFRESH_LIMIT", ADMIN_COLLECTION_REFRESH_LIMIT],
		// Admin - materials
		["ADMIN_MATERIAL_CREATE_LIMIT", ADMIN_MATERIAL_CREATE_LIMIT],
		["ADMIN_MATERIAL_UPDATE_LIMIT", ADMIN_MATERIAL_UPDATE_LIMIT],
		["ADMIN_MATERIAL_DELETE_LIMIT", ADMIN_MATERIAL_DELETE_LIMIT],
		["ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT", ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT],
		["ADMIN_MATERIAL_DUPLICATE_LIMIT", ADMIN_MATERIAL_DUPLICATE_LIMIT],
		["ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT", ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT],
		["ADMIN_MATERIAL_REFRESH_LIMIT", ADMIN_MATERIAL_REFRESH_LIMIT],
		// Admin - colors
		["ADMIN_COLOR_CREATE_LIMIT", ADMIN_COLOR_CREATE_LIMIT],
		["ADMIN_COLOR_UPDATE_LIMIT", ADMIN_COLOR_UPDATE_LIMIT],
		["ADMIN_COLOR_DELETE_LIMIT", ADMIN_COLOR_DELETE_LIMIT],
		["ADMIN_COLOR_TOGGLE_STATUS_LIMIT", ADMIN_COLOR_TOGGLE_STATUS_LIMIT],
		["ADMIN_COLOR_DUPLICATE_LIMIT", ADMIN_COLOR_DUPLICATE_LIMIT],
		["ADMIN_COLOR_BULK_OPERATIONS_LIMIT", ADMIN_COLOR_BULK_OPERATIONS_LIMIT],
		["ADMIN_COLOR_REFRESH_LIMIT", ADMIN_COLOR_REFRESH_LIMIT],
		// Admin - product types
		["ADMIN_PRODUCT_TYPE_CREATE_LIMIT", ADMIN_PRODUCT_TYPE_CREATE_LIMIT],
		["ADMIN_PRODUCT_TYPE_UPDATE_LIMIT", ADMIN_PRODUCT_TYPE_UPDATE_LIMIT],
		["ADMIN_PRODUCT_TYPE_DELETE_LIMIT", ADMIN_PRODUCT_TYPE_DELETE_LIMIT],
		["ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT", ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT],
		["ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT", ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT],
		["ADMIN_PRODUCT_TYPE_REFRESH_LIMIT", ADMIN_PRODUCT_TYPE_REFRESH_LIMIT],
		// Admin - SKUs
		["ADMIN_SKU_ADJUST_STOCK_LIMIT", ADMIN_SKU_ADJUST_STOCK_LIMIT],
		["ADMIN_SKU_UPDATE_PRICE_LIMIT", ADMIN_SKU_UPDATE_PRICE_LIMIT],
		["ADMIN_SKU_CREATE_LIMIT", ADMIN_SKU_CREATE_LIMIT],
		["ADMIN_SKU_UPDATE_LIMIT", ADMIN_SKU_UPDATE_LIMIT],
		["ADMIN_SKU_DELETE_LIMIT", ADMIN_SKU_DELETE_LIMIT],
		["ADMIN_SKU_DUPLICATE_LIMIT", ADMIN_SKU_DUPLICATE_LIMIT],
		["ADMIN_SKU_TOGGLE_STATUS_LIMIT", ADMIN_SKU_TOGGLE_STATUS_LIMIT],
		["ADMIN_SKU_BULK_OPERATIONS_LIMIT", ADMIN_SKU_BULK_OPERATIONS_LIMIT],
		// Admin - discounts
		["ADMIN_DISCOUNT_CREATE_LIMIT", ADMIN_DISCOUNT_CREATE_LIMIT],
		["ADMIN_DISCOUNT_UPDATE_LIMIT", ADMIN_DISCOUNT_UPDATE_LIMIT],
		["ADMIN_DISCOUNT_DELETE_LIMIT", ADMIN_DISCOUNT_DELETE_LIMIT],
		["ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT", ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT],
		["ADMIN_DISCOUNT_DUPLICATE_LIMIT", ADMIN_DISCOUNT_DUPLICATE_LIMIT],
		["ADMIN_DISCOUNT_BULK_OPERATIONS_LIMIT", ADMIN_DISCOUNT_BULK_OPERATIONS_LIMIT],
		["ADMIN_DISCOUNT_REFRESH_LIMIT", ADMIN_DISCOUNT_REFRESH_LIMIT],
		// Admin - reviews
		["ADMIN_REVIEW_SEND_EMAIL_LIMIT", ADMIN_REVIEW_SEND_EMAIL_LIMIT],
		["ADMIN_REVIEW_BULK_OPERATIONS_LIMIT", ADMIN_REVIEW_BULK_OPERATIONS_LIMIT],
		["ADMIN_REVIEW_RESPONSE_LIMIT", ADMIN_REVIEW_RESPONSE_LIMIT],
		["ADMIN_REVIEW_MODERATE_LIMIT", ADMIN_REVIEW_MODERATE_LIMIT],
		// Admin - newsletter
		["ADMIN_NEWSLETTER_REFRESH_LIMIT", ADMIN_NEWSLETTER_REFRESH_LIMIT],
		// Admin - customization
		["ADMIN_CUSTOMIZATION_UPDATE_LIMIT", ADMIN_CUSTOMIZATION_UPDATE_LIMIT],
		["ADMIN_CUSTOMIZATION_BULK_UPDATE_LIMIT", ADMIN_CUSTOMIZATION_BULK_UPDATE_LIMIT],
		// Admin - announcements
		["ADMIN_ANNOUNCEMENT_CREATE_LIMIT", ADMIN_ANNOUNCEMENT_CREATE_LIMIT],
		["ADMIN_ANNOUNCEMENT_UPDATE_LIMIT", ADMIN_ANNOUNCEMENT_UPDATE_LIMIT],
		["ADMIN_ANNOUNCEMENT_DELETE_LIMIT", ADMIN_ANNOUNCEMENT_DELETE_LIMIT],
		["ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT", ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT],
		// Admin - FAQ
		["ADMIN_FAQ_CREATE_LIMIT", ADMIN_FAQ_CREATE_LIMIT],
		["ADMIN_FAQ_UPDATE_LIMIT", ADMIN_FAQ_UPDATE_LIMIT],
		["ADMIN_FAQ_DELETE_LIMIT", ADMIN_FAQ_DELETE_LIMIT],
		["ADMIN_FAQ_REORDER_LIMIT", ADMIN_FAQ_REORDER_LIMIT],
	];

	it.each(configs)("%s has limit > 0 and windowMs > 0", (_name, config) => {
		expect(isValidConfig(config)).toBe(true);
	});
});

// ============================================================================
// CART_LIMITS
// ============================================================================

describe("CART_LIMITS", () => {
	it("contains expected keys", () => {
		expect(CART_LIMITS).toHaveProperty("ADD");
		expect(CART_LIMITS).toHaveProperty("UPDATE");
		expect(CART_LIMITS).toHaveProperty("REMOVE");
		expect(CART_LIMITS).toHaveProperty("VALIDATE");
		expect(CART_LIMITS).toHaveProperty("MERGE");
	});

	it("references the correct individual configs", () => {
		expect(CART_LIMITS.ADD).toBe(CART_ADD_LIMIT);
		expect(CART_LIMITS.UPDATE).toBe(CART_UPDATE_LIMIT);
		expect(CART_LIMITS.REMOVE).toBe(CART_REMOVE_LIMIT);
		expect(CART_LIMITS.VALIDATE).toBe(CART_VALIDATE_LIMIT);
		expect(CART_LIMITS.MERGE).toBe(CART_MERGE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(CART_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// AUTH_LIMITS
// ============================================================================

describe("AUTH_LIMITS", () => {
	it("contains expected keys", () => {
		expect(AUTH_LIMITS).toHaveProperty("LOGIN");
		expect(AUTH_LIMITS).toHaveProperty("SIGNUP");
		expect(AUTH_LIMITS).toHaveProperty("PASSWORD_RESET");
		expect(AUTH_LIMITS).toHaveProperty("PASSWORD_CHANGE");
		expect(AUTH_LIMITS).toHaveProperty("EMAIL_VERIFICATION");
	});

	it("references the correct individual configs", () => {
		expect(AUTH_LIMITS.LOGIN).toBe(AUTH_LOGIN_LIMIT);
		expect(AUTH_LIMITS.SIGNUP).toBe(AUTH_SIGNUP_LIMIT);
		expect(AUTH_LIMITS.PASSWORD_RESET).toBe(AUTH_PASSWORD_RESET_LIMIT);
		expect(AUTH_LIMITS.PASSWORD_CHANGE).toBe(AUTH_PASSWORD_CHANGE_LIMIT);
		expect(AUTH_LIMITS.EMAIL_VERIFICATION).toBe(AUTH_EMAIL_VERIFICATION_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(AUTH_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// PAYMENT_LIMITS
// ============================================================================

describe("PAYMENT_LIMITS", () => {
	it("contains expected keys", () => {
		expect(PAYMENT_LIMITS).toHaveProperty("CREATE_SESSION");
		expect(PAYMENT_LIMITS).toHaveProperty("VALIDATE_DISCOUNT");
		expect(PAYMENT_LIMITS).toHaveProperty("UPDATE_AMOUNT");
	});

	it("references the correct individual configs", () => {
		expect(PAYMENT_LIMITS.CREATE_SESSION).toBe(CHECKOUT_CREATE_SESSION_LIMIT);
		expect(PAYMENT_LIMITS.VALIDATE_DISCOUNT).toBe(DISCOUNT_CODE_VALIDATE_LIMIT);
		expect(PAYMENT_LIMITS.UPDATE_AMOUNT).toBe(PAYMENT_UPDATE_AMOUNT_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(PAYMENT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// COMMUNICATION_LIMITS
// ============================================================================

describe("COMMUNICATION_LIMITS", () => {
	it("contains expected keys", () => {
		expect(COMMUNICATION_LIMITS).toHaveProperty("CONTACT");
		expect(COMMUNICATION_LIMITS).toHaveProperty("NEWSLETTER");
	});

	it("references the correct individual configs", () => {
		expect(COMMUNICATION_LIMITS.CONTACT).toBe(CONTACT_SEND_MESSAGE_LIMIT);
		expect(COMMUNICATION_LIMITS.NEWSLETTER).toBe(NEWSLETTER_SUBSCRIBE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(COMMUNICATION_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// CUSTOMIZATION_LIMITS
// ============================================================================

describe("CUSTOMIZATION_LIMITS", () => {
	it("contains expected keys", () => {
		expect(CUSTOMIZATION_LIMITS).toHaveProperty("QUOTE_REQUEST");
		expect(CUSTOMIZATION_LIMITS).toHaveProperty("IMAGE_UPLOAD");
	});

	it("references the correct individual configs", () => {
		expect(CUSTOMIZATION_LIMITS.QUOTE_REQUEST).toBe(CUSTOMIZATION_QUOTE_REQUEST_LIMIT);
		expect(CUSTOMIZATION_LIMITS.IMAGE_UPLOAD).toBe(CUSTOMIZATION_IMAGE_UPLOAD_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(CUSTOMIZATION_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ORDER_LIMITS
// ============================================================================

describe("ORDER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ORDER_LIMITS).toHaveProperty("CREATE");
		expect(ORDER_LIMITS).toHaveProperty("CANCEL");
		expect(ORDER_LIMITS).toHaveProperty("INVOICE_DOWNLOAD");
	});

	it("references the correct individual configs", () => {
		expect(ORDER_LIMITS.CREATE).toBe(ORDER_CREATE_LIMIT);
		expect(ORDER_LIMITS.CANCEL).toBe(ORDER_CANCEL_LIMIT);
		expect(ORDER_LIMITS.INVOICE_DOWNLOAD).toBe(ORDER_INVOICE_DOWNLOAD_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ORDER_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// PRODUCT_LIMITS
// ============================================================================

describe("PRODUCT_LIMITS", () => {
	it("contains expected keys", () => {
		expect(PRODUCT_LIMITS).toHaveProperty("SEARCH");
		expect(PRODUCT_LIMITS).toHaveProperty("REVIEW");
		expect(PRODUCT_LIMITS).toHaveProperty("COOKIE_ACTION");
	});

	it("references the correct individual configs", () => {
		expect(PRODUCT_LIMITS.SEARCH).toBe(PRODUCT_SEARCH_LIMIT);
		expect(PRODUCT_LIMITS.REVIEW).toBe(PRODUCT_REVIEW_LIMIT);
		expect(PRODUCT_LIMITS.COOKIE_ACTION).toBe(PRODUCT_COOKIE_ACTION_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(PRODUCT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// WISHLIST_LIMITS
// ============================================================================

describe("WISHLIST_LIMITS", () => {
	it("contains expected keys", () => {
		expect(WISHLIST_LIMITS).toHaveProperty("TOGGLE");
		expect(WISHLIST_LIMITS).toHaveProperty("ADD");
		expect(WISHLIST_LIMITS).toHaveProperty("REMOVE");
		expect(WISHLIST_LIMITS).toHaveProperty("MERGE");
	});

	it("ADD and REMOVE share the same reference as TOGGLE", () => {
		expect(WISHLIST_LIMITS.ADD).toBe(WISHLIST_TOGGLE_LIMIT);
		expect(WISHLIST_LIMITS.REMOVE).toBe(WISHLIST_TOGGLE_LIMIT);
		expect(WISHLIST_LIMITS.TOGGLE).toBe(WISHLIST_TOGGLE_LIMIT);
	});

	it("references the correct individual config for MERGE", () => {
		expect(WISHLIST_LIMITS.MERGE).toBe(WISHLIST_MERGE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(WISHLIST_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// USER_LIMITS
// ============================================================================

describe("USER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(USER_LIMITS).toHaveProperty("DELETE_ACCOUNT");
		expect(USER_LIMITS).toHaveProperty("CANCEL_DELETION");
		expect(USER_LIMITS).toHaveProperty("EXPORT_DATA");
		expect(USER_LIMITS).toHaveProperty("UPDATE_PROFILE");
		expect(USER_LIMITS).toHaveProperty("CHANGE_EMAIL");
	});

	it("references the correct individual configs", () => {
		expect(USER_LIMITS.DELETE_ACCOUNT).toBe(USER_DELETE_ACCOUNT_LIMIT);
		expect(USER_LIMITS.CANCEL_DELETION).toBe(USER_CANCEL_DELETION_LIMIT);
		expect(USER_LIMITS.EXPORT_DATA).toBe(USER_EXPORT_DATA_LIMIT);
		expect(USER_LIMITS.UPDATE_PROFILE).toBe(USER_UPDATE_PROFILE_LIMIT);
		expect(USER_LIMITS.CHANGE_EMAIL).toBe(USER_EMAIL_CHANGE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(USER_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADDRESS_LIMITS
// ============================================================================

describe("ADDRESS_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADDRESS_LIMITS).toHaveProperty("MUTATE");
		expect(ADDRESS_LIMITS).toHaveProperty("SEARCH");
	});

	it("references the correct individual configs", () => {
		expect(ADDRESS_LIMITS.MUTATE).toBe(ADDRESS_MUTATE_LIMIT);
		expect(ADDRESS_LIMITS.SEARCH).toBe(ADDRESS_SEARCH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADDRESS_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// REFUND_LIMITS
// ============================================================================

describe("REFUND_LIMITS", () => {
	it("contains expected keys", () => {
		expect(REFUND_LIMITS).toHaveProperty("CREATE");
		expect(REFUND_LIMITS).toHaveProperty("PROCESS");
		expect(REFUND_LIMITS).toHaveProperty("SINGLE_OPERATION");
		expect(REFUND_LIMITS).toHaveProperty("BULK_OPERATION");
		expect(REFUND_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(REFUND_LIMITS.CREATE).toBe(REFUND_CREATE_LIMIT);
		expect(REFUND_LIMITS.PROCESS).toBe(REFUND_PROCESS_LIMIT);
		expect(REFUND_LIMITS.SINGLE_OPERATION).toBe(REFUND_SINGLE_OPERATION_LIMIT);
		expect(REFUND_LIMITS.BULK_OPERATION).toBe(REFUND_BULK_OPERATION_LIMIT);
		expect(REFUND_LIMITS.REFRESH).toBe(REFUND_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(REFUND_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_LIMITS
// ============================================================================

describe("ADMIN_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_LIMITS).toHaveProperty("TESTIMONIAL_CREATE");
		expect(ADMIN_LIMITS).toHaveProperty("TESTIMONIAL_UPDATE");
		expect(ADMIN_LIMITS).toHaveProperty("TESTIMONIAL_DELETE");
		expect(ADMIN_LIMITS).toHaveProperty("TESTIMONIAL_BULK_DELETE");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_LIMITS.TESTIMONIAL_CREATE).toBe(ADMIN_TESTIMONIAL_CREATE_LIMIT);
		expect(ADMIN_LIMITS.TESTIMONIAL_UPDATE).toBe(ADMIN_TESTIMONIAL_UPDATE_LIMIT);
		expect(ADMIN_LIMITS.TESTIMONIAL_DELETE).toBe(ADMIN_TESTIMONIAL_DELETE_LIMIT);
		expect(ADMIN_LIMITS.TESTIMONIAL_BULK_DELETE).toBe(ADMIN_TESTIMONIAL_BULK_DELETE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_ORDER_LIMITS
// ============================================================================

describe("ADMIN_ORDER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_ORDER_LIMITS).toHaveProperty("RESEND_EMAIL");
		expect(ADMIN_ORDER_LIMITS).toHaveProperty("MARK_AS_PAID");
		expect(ADMIN_ORDER_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_ORDER_LIMITS).toHaveProperty("SINGLE_OPERATIONS");
		expect(ADMIN_ORDER_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_ORDER_LIMITS.RESEND_EMAIL).toBe(ADMIN_ORDER_RESEND_EMAIL_LIMIT);
		expect(ADMIN_ORDER_LIMITS.MARK_AS_PAID).toBe(ADMIN_ORDER_MARK_AS_PAID_LIMIT);
		expect(ADMIN_ORDER_LIMITS.BULK_OPERATIONS).toBe(ADMIN_ORDER_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS).toBe(ADMIN_ORDER_SINGLE_OPERATIONS_LIMIT);
		expect(ADMIN_ORDER_LIMITS.REFRESH).toBe(ADMIN_ORDER_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_ORDER_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_USER_LIMITS
// ============================================================================

describe("ADMIN_USER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_USER_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_USER_LIMITS).toHaveProperty("SINGLE_OPERATIONS");
		expect(ADMIN_USER_LIMITS).toHaveProperty("DELETE_USER");
		expect(ADMIN_USER_LIMITS).toHaveProperty("EXPORT_DATA");
		expect(ADMIN_USER_LIMITS).toHaveProperty("SEND_RESET");
		expect(ADMIN_USER_LIMITS).toHaveProperty("INVALIDATE_SESSIONS");
		expect(ADMIN_USER_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_USER_LIMITS.BULK_OPERATIONS).toBe(ADMIN_USER_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_USER_LIMITS.SINGLE_OPERATIONS).toBe(ADMIN_USER_SINGLE_OPERATIONS_LIMIT);
		expect(ADMIN_USER_LIMITS.DELETE_USER).toBe(ADMIN_USER_DELETE_LIMIT);
		expect(ADMIN_USER_LIMITS.EXPORT_DATA).toBe(ADMIN_USER_EXPORT_DATA_LIMIT);
		expect(ADMIN_USER_LIMITS.SEND_RESET).toBe(ADMIN_USER_SEND_RESET_LIMIT);
		expect(ADMIN_USER_LIMITS.INVALIDATE_SESSIONS).toBe(ADMIN_USER_INVALIDATE_SESSIONS_LIMIT);
		expect(ADMIN_USER_LIMITS.REFRESH).toBe(ADMIN_USER_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_USER_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_PRODUCT_LIMITS
// ============================================================================

describe("ADMIN_PRODUCT_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("BULK_DELETE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("BULK_ARCHIVE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("BULK_STATUS");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("DUPLICATE");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("UPDATE_COLLECTIONS");
		expect(ADMIN_PRODUCT_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_PRODUCT_LIMITS.CREATE).toBe(ADMIN_PRODUCT_CREATE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.UPDATE).toBe(ADMIN_PRODUCT_UPDATE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.DELETE).toBe(ADMIN_PRODUCT_DELETE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.BULK_DELETE).toBe(ADMIN_PRODUCT_BULK_DELETE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.BULK_ARCHIVE).toBe(ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.BULK_STATUS).toBe(ADMIN_PRODUCT_BULK_STATUS_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.TOGGLE_STATUS).toBe(ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.DUPLICATE).toBe(ADMIN_PRODUCT_DUPLICATE_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.UPDATE_COLLECTIONS).toBe(ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT);
		expect(ADMIN_PRODUCT_LIMITS.REFRESH).toBe(ADMIN_PRODUCT_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_PRODUCT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_COLLECTION_LIMITS
// ============================================================================

describe("ADMIN_COLLECTION_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("BULK_DELETE");
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("BULK_ARCHIVE");
		expect(ADMIN_COLLECTION_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_COLLECTION_LIMITS.CREATE).toBe(ADMIN_COLLECTION_CREATE_LIMIT);
		expect(ADMIN_COLLECTION_LIMITS.UPDATE).toBe(ADMIN_COLLECTION_UPDATE_LIMIT);
		expect(ADMIN_COLLECTION_LIMITS.DELETE).toBe(ADMIN_COLLECTION_DELETE_LIMIT);
		expect(ADMIN_COLLECTION_LIMITS.BULK_DELETE).toBe(ADMIN_COLLECTION_BULK_DELETE_LIMIT);
		expect(ADMIN_COLLECTION_LIMITS.BULK_ARCHIVE).toBe(ADMIN_COLLECTION_BULK_ARCHIVE_LIMIT);
		expect(ADMIN_COLLECTION_LIMITS.REFRESH).toBe(ADMIN_COLLECTION_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_COLLECTION_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_MATERIAL_LIMITS
// ============================================================================

describe("ADMIN_MATERIAL_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("DUPLICATE");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_MATERIAL_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_MATERIAL_LIMITS.CREATE).toBe(ADMIN_MATERIAL_CREATE_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.UPDATE).toBe(ADMIN_MATERIAL_UPDATE_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.DELETE).toBe(ADMIN_MATERIAL_DELETE_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.TOGGLE_STATUS).toBe(ADMIN_MATERIAL_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.DUPLICATE).toBe(ADMIN_MATERIAL_DUPLICATE_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.BULK_OPERATIONS).toBe(ADMIN_MATERIAL_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_MATERIAL_LIMITS.REFRESH).toBe(ADMIN_MATERIAL_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_MATERIAL_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_COLOR_LIMITS
// ============================================================================

describe("ADMIN_COLOR_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("DUPLICATE");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_COLOR_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_COLOR_LIMITS.CREATE).toBe(ADMIN_COLOR_CREATE_LIMIT);
		expect(ADMIN_COLOR_LIMITS.UPDATE).toBe(ADMIN_COLOR_UPDATE_LIMIT);
		expect(ADMIN_COLOR_LIMITS.DELETE).toBe(ADMIN_COLOR_DELETE_LIMIT);
		expect(ADMIN_COLOR_LIMITS.TOGGLE_STATUS).toBe(ADMIN_COLOR_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_COLOR_LIMITS.DUPLICATE).toBe(ADMIN_COLOR_DUPLICATE_LIMIT);
		expect(ADMIN_COLOR_LIMITS.BULK_OPERATIONS).toBe(ADMIN_COLOR_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_COLOR_LIMITS.REFRESH).toBe(ADMIN_COLOR_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_COLOR_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_PRODUCT_TYPE_LIMITS
// ============================================================================

describe("ADMIN_PRODUCT_TYPE_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_PRODUCT_TYPE_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_PRODUCT_TYPE_LIMITS.CREATE).toBe(ADMIN_PRODUCT_TYPE_CREATE_LIMIT);
		expect(ADMIN_PRODUCT_TYPE_LIMITS.UPDATE).toBe(ADMIN_PRODUCT_TYPE_UPDATE_LIMIT);
		expect(ADMIN_PRODUCT_TYPE_LIMITS.DELETE).toBe(ADMIN_PRODUCT_TYPE_DELETE_LIMIT);
		expect(ADMIN_PRODUCT_TYPE_LIMITS.TOGGLE_STATUS).toBe(ADMIN_PRODUCT_TYPE_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_PRODUCT_TYPE_LIMITS.BULK_OPERATIONS).toBe(
			ADMIN_PRODUCT_TYPE_BULK_OPERATIONS_LIMIT,
		);
		expect(ADMIN_PRODUCT_TYPE_LIMITS.REFRESH).toBe(ADMIN_PRODUCT_TYPE_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_PRODUCT_TYPE_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_SKU_LIMITS
// ============================================================================

describe("ADMIN_SKU_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_SKU_LIMITS).toHaveProperty("ADJUST_STOCK");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("UPDATE_PRICE");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("DUPLICATE");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_SKU_LIMITS).toHaveProperty("BULK_OPERATIONS");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_SKU_LIMITS.ADJUST_STOCK).toBe(ADMIN_SKU_ADJUST_STOCK_LIMIT);
		expect(ADMIN_SKU_LIMITS.UPDATE_PRICE).toBe(ADMIN_SKU_UPDATE_PRICE_LIMIT);
		expect(ADMIN_SKU_LIMITS.CREATE).toBe(ADMIN_SKU_CREATE_LIMIT);
		expect(ADMIN_SKU_LIMITS.UPDATE).toBe(ADMIN_SKU_UPDATE_LIMIT);
		expect(ADMIN_SKU_LIMITS.DELETE).toBe(ADMIN_SKU_DELETE_LIMIT);
		expect(ADMIN_SKU_LIMITS.DUPLICATE).toBe(ADMIN_SKU_DUPLICATE_LIMIT);
		expect(ADMIN_SKU_LIMITS.TOGGLE_STATUS).toBe(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_SKU_LIMITS.BULK_OPERATIONS).toBe(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_SKU_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_DISCOUNT_LIMITS
// ============================================================================

describe("ADMIN_DISCOUNT_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("TOGGLE_STATUS");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("DUPLICATE");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_DISCOUNT_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_DISCOUNT_LIMITS.CREATE).toBe(ADMIN_DISCOUNT_CREATE_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.UPDATE).toBe(ADMIN_DISCOUNT_UPDATE_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.DELETE).toBe(ADMIN_DISCOUNT_DELETE_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.TOGGLE_STATUS).toBe(ADMIN_DISCOUNT_TOGGLE_STATUS_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.DUPLICATE).toBe(ADMIN_DISCOUNT_DUPLICATE_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.BULK_OPERATIONS).toBe(ADMIN_DISCOUNT_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_DISCOUNT_LIMITS.REFRESH).toBe(ADMIN_DISCOUNT_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_DISCOUNT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_REVIEW_LIMITS
// ============================================================================

describe("ADMIN_REVIEW_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_REVIEW_LIMITS).toHaveProperty("SEND_EMAIL");
		expect(ADMIN_REVIEW_LIMITS).toHaveProperty("BULK_OPERATIONS");
		expect(ADMIN_REVIEW_LIMITS).toHaveProperty("RESPONSE");
		expect(ADMIN_REVIEW_LIMITS).toHaveProperty("MODERATE");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_REVIEW_LIMITS.SEND_EMAIL).toBe(ADMIN_REVIEW_SEND_EMAIL_LIMIT);
		expect(ADMIN_REVIEW_LIMITS.BULK_OPERATIONS).toBe(ADMIN_REVIEW_BULK_OPERATIONS_LIMIT);
		expect(ADMIN_REVIEW_LIMITS.RESPONSE).toBe(ADMIN_REVIEW_RESPONSE_LIMIT);
		expect(ADMIN_REVIEW_LIMITS.MODERATE).toBe(ADMIN_REVIEW_MODERATE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_REVIEW_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_NEWSLETTER_LIMITS
// ============================================================================

describe("ADMIN_NEWSLETTER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_NEWSLETTER_LIMITS).toHaveProperty("REFRESH");
	});

	it("references the correct individual config", () => {
		expect(ADMIN_NEWSLETTER_LIMITS.REFRESH).toBe(ADMIN_NEWSLETTER_REFRESH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_NEWSLETTER_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_CUSTOMIZATION_LIMITS
// ============================================================================

describe("ADMIN_CUSTOMIZATION_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_CUSTOMIZATION_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_CUSTOMIZATION_LIMITS).toHaveProperty("BULK_UPDATE");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_CUSTOMIZATION_LIMITS.UPDATE).toBe(ADMIN_CUSTOMIZATION_UPDATE_LIMIT);
		expect(ADMIN_CUSTOMIZATION_LIMITS.BULK_UPDATE).toBe(ADMIN_CUSTOMIZATION_BULK_UPDATE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_CUSTOMIZATION_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_ANNOUNCEMENT_LIMITS
// ============================================================================

describe("ADMIN_ANNOUNCEMENT_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_ANNOUNCEMENT_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_ANNOUNCEMENT_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_ANNOUNCEMENT_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_ANNOUNCEMENT_LIMITS).toHaveProperty("TOGGLE_STATUS");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_ANNOUNCEMENT_LIMITS.CREATE).toBe(ADMIN_ANNOUNCEMENT_CREATE_LIMIT);
		expect(ADMIN_ANNOUNCEMENT_LIMITS.UPDATE).toBe(ADMIN_ANNOUNCEMENT_UPDATE_LIMIT);
		expect(ADMIN_ANNOUNCEMENT_LIMITS.DELETE).toBe(ADMIN_ANNOUNCEMENT_DELETE_LIMIT);
		expect(ADMIN_ANNOUNCEMENT_LIMITS.TOGGLE_STATUS).toBe(ADMIN_ANNOUNCEMENT_TOGGLE_STATUS_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_ANNOUNCEMENT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_FAQ_LIMITS
// ============================================================================

describe("ADMIN_FAQ_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_FAQ_LIMITS).toHaveProperty("CREATE");
		expect(ADMIN_FAQ_LIMITS).toHaveProperty("UPDATE");
		expect(ADMIN_FAQ_LIMITS).toHaveProperty("DELETE");
		expect(ADMIN_FAQ_LIMITS).toHaveProperty("REORDER");
	});

	it("references the correct individual configs", () => {
		expect(ADMIN_FAQ_LIMITS.CREATE).toBe(ADMIN_FAQ_CREATE_LIMIT);
		expect(ADMIN_FAQ_LIMITS.UPDATE).toBe(ADMIN_FAQ_UPDATE_LIMIT);
		expect(ADMIN_FAQ_LIMITS.DELETE).toBe(ADMIN_FAQ_DELETE_LIMIT);
		expect(ADMIN_FAQ_LIMITS.REORDER).toBe(ADMIN_FAQ_REORDER_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_FAQ_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN_STORE_SETTINGS_LIMITS
// ============================================================================

describe("ADMIN_STORE_SETTINGS_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADMIN_STORE_SETTINGS_LIMITS).toHaveProperty("CLOSE_STORE");
		expect(ADMIN_STORE_SETTINGS_LIMITS).toHaveProperty("REOPEN_STORE");
		expect(ADMIN_STORE_SETTINGS_LIMITS).toHaveProperty("UPDATE_CLOSURE_MESSAGE");
		expect(ADMIN_STORE_SETTINGS_LIMITS).toHaveProperty("UPDATE_REOPENS_AT");
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADMIN_STORE_SETTINGS_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// SPECIFIC LIMIT VALUES - security-sensitive configs
// ============================================================================

describe("security-sensitive limit values", () => {
	it("AUTH_LOGIN_LIMIT has a strict limit (<=10)", () => {
		expect(AUTH_LOGIN_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("AUTH_SIGNUP_LIMIT has a strict limit (<=5)", () => {
		expect(AUTH_SIGNUP_LIMIT.limit).toBeLessThanOrEqual(5);
	});

	it("AUTH_PASSWORD_RESET_LIMIT has a strict limit (<=5)", () => {
		expect(AUTH_PASSWORD_RESET_LIMIT.limit).toBeLessThanOrEqual(5);
	});

	it("AUTH_PASSWORD_CHANGE_LIMIT has a strict limit (<=5)", () => {
		expect(AUTH_PASSWORD_CHANGE_LIMIT.limit).toBeLessThanOrEqual(5);
	});

	it("RETURN_REQUEST_LIMIT has a strict limit (<=10)", () => {
		expect(RETURN_REQUEST_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("REFUND_BULK_OPERATION_LIMIT has a strict limit (<=10)", () => {
		expect(REFUND_BULK_OPERATION_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("ADMIN_ORDER_BULK_OPERATIONS_LIMIT has a strict limit (<=10)", () => {
		expect(ADMIN_ORDER_BULK_OPERATIONS_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("ADMIN_USER_BULK_OPERATIONS_LIMIT has a strict limit (<=10)", () => {
		expect(ADMIN_USER_BULK_OPERATIONS_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("USER_DELETE_ACCOUNT_LIMIT has a strict limit (<=5)", () => {
		expect(USER_DELETE_ACCOUNT_LIMIT.limit).toBeLessThanOrEqual(5);
	});

	it("CONTACT_SEND_MESSAGE_LIMIT has a strict limit (<=10)", () => {
		expect(CONTACT_SEND_MESSAGE_LIMIT.limit).toBeLessThanOrEqual(10);
	});
});

// ============================================================================
// WINDOW DURATIONS - sanity checks
// ============================================================================

describe("windowMs sanity checks", () => {
	it("CHECKOUT_CREATE_SESSION_LIMIT uses at least a 1-minute window", () => {
		expect(CHECKOUT_CREATE_SESSION_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});

	it("PRODUCT_REVIEW_LIMIT uses at least a 1-hour window", () => {
		expect(PRODUCT_REVIEW_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
	});

	it("RETURN_REQUEST_LIMIT uses at least a 1-hour window", () => {
		expect(RETURN_REQUEST_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
	});

	it("AUTH_LOGIN_LIMIT uses at least a 1-minute window", () => {
		expect(AUTH_LOGIN_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});

	it("AUTH_SIGNUP_LIMIT uses at least a 1-minute window", () => {
		expect(AUTH_SIGNUP_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});
});
