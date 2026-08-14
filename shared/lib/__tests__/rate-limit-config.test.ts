import { describe, it, expect } from "vitest";
import type { RateLimitConfig } from "@/shared/types/rate-limit.types";
import {
	// Cart
	CART_ADD_LIMIT,
	CART_UPDATE_LIMIT,
	CART_REMOVE_LIMIT,
	CART_VALIDATE_LIMIT,
	CART_LIMITS,
	// Payment
	CHECKOUT_CREATE_SESSION_LIMIT,
	DISCOUNT_CODE_VALIDATE_LIMIT,
	PAYMENT_UPDATE_AMOUNT_LIMIT,
	PAYMENT_LIMITS,
	// Auth
	AUTH_LOGIN_LIMIT,
	AUTH_LOGOUT_LIMIT,
	CRON_INVOKE_LIMIT,
	AUTH_LIMITS,
	// Orders (client)
	ORDER_INVOICE_DOWNLOAD_LIMIT,
	ORDER_LIMITS,
	// Products (client)
	PRODUCT_SEARCH_LIMIT,
	PRODUCT_COOKIE_ACTION_LIMIT,
	PRODUCT_LIMITS,
	// Wishlist
	WISHLIST_TOGGLE_LIMIT,
	WISHLIST_LIMITS,
	// Address
	ADDRESS_SEARCH_LIMIT,
	ADDRESS_LIMITS,
	// Admin — preset partagé (Lot 4 SIMPLIFICATION.md S3.2)
	ADMIN_LIMIT,
	ADMIN_MAINTENANCE_LIMIT,
	ADMIN_SEARCH_LIMIT,
	ADMIN_ORDER_LIMITS,
	ADMIN_PRODUCT_LIMITS,
	ADMIN_COLLECTION_LIMITS,
	ADMIN_MATERIAL_LIMITS,
	ADMIN_COLOR_LIMITS,
	ADMIN_PRODUCT_TYPE_LIMITS,
	ADMIN_SKU_LIMITS,
	ADMIN_DISCOUNT_LIMITS,
	ADMIN_STORE_SETTINGS_LIMITS,
	ADMIN_DASHBOARD_LIMITS,
	REFUND_LIMITS,
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
		// Payment
		["CHECKOUT_CREATE_SESSION_LIMIT", CHECKOUT_CREATE_SESSION_LIMIT],
		["DISCOUNT_CODE_VALIDATE_LIMIT", DISCOUNT_CODE_VALIDATE_LIMIT],
		["PAYMENT_UPDATE_AMOUNT_LIMIT", PAYMENT_UPDATE_AMOUNT_LIMIT],
		// Auth
		["AUTH_LOGIN_LIMIT", AUTH_LOGIN_LIMIT],
		// Orders
		["ORDER_INVOICE_DOWNLOAD_LIMIT", ORDER_INVOICE_DOWNLOAD_LIMIT],
		// Products
		["PRODUCT_SEARCH_LIMIT", PRODUCT_SEARCH_LIMIT],
		["PRODUCT_COOKIE_ACTION_LIMIT", PRODUCT_COOKIE_ACTION_LIMIT],
		// Wishlist
		["WISHLIST_TOGGLE_LIMIT", WISHLIST_TOGGLE_LIMIT],
		// Address
		["ADDRESS_SEARCH_LIMIT", ADDRESS_SEARCH_LIMIT],
		// Admin
		["ADMIN_LIMIT", ADMIN_LIMIT],
		["ADMIN_MAINTENANCE_LIMIT", ADMIN_MAINTENANCE_LIMIT],
		["ADMIN_SEARCH_LIMIT", ADMIN_SEARCH_LIMIT],
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
	});

	it("references the correct individual configs", () => {
		expect(CART_LIMITS.ADD).toBe(CART_ADD_LIMIT);
		expect(CART_LIMITS.UPDATE).toBe(CART_UPDATE_LIMIT);
		expect(CART_LIMITS.REMOVE).toBe(CART_REMOVE_LIMIT);
		expect(CART_LIMITS.VALIDATE).toBe(CART_VALIDATE_LIMIT);
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
		// Plus de `SIGNUP` : l'inscription est fermée (`disableSignUp`) et la route
		// `/inscription` supprimée — retrait de l'espace client 2026-07-31.
		expect(AUTH_LIMITS).not.toHaveProperty("SIGNUP");
	});

	it("references the correct individual configs", () => {
		expect(AUTH_LIMITS.LOGIN).toBe(AUTH_LOGIN_LIMIT);
	});

	it("l'auth ne se rabat JAMAIS sur le preset admin partagé", () => {
		// Les presets d'auth bornent des attaques (brute force, énumération) :
		// les fondre dans le compteur admin 120/min les rendrait décoratifs.
		for (const config of Object.values(AUTH_LIMITS)) {
			expect(config).not.toBe(ADMIN_LIMIT);
		}
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

	it("le checkout garde des compteurs SÉPARÉS par étape (leçon KI-004)", () => {
		// Init, ajustement de montant et validation de code ne doivent pas
		// partager un budget : l'incident d'origine était précisément un compteur
		// commun qui laissait des opérations anodines bloquer le paiement.
		const names = Object.values(PAYMENT_LIMITS).map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(PAYMENT_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ORDER_LIMITS
// ============================================================================

describe("ORDER_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ORDER_LIMITS).toHaveProperty("INVOICE_DOWNLOAD");
		// USER_REFRESH est parti avec l'espace client (préset sans appelant).
		expect(ORDER_LIMITS).not.toHaveProperty("USER_REFRESH");
	});

	it("references the correct individual configs", () => {
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
		expect(PRODUCT_LIMITS).toHaveProperty("COOKIE_ACTION");
	});

	it("references the correct individual configs", () => {
		expect(PRODUCT_LIMITS.SEARCH).toBe(PRODUCT_SEARCH_LIMIT);
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
	});

	it("ADD and REMOVE share the same reference as TOGGLE", () => {
		expect(WISHLIST_LIMITS.ADD).toBe(WISHLIST_TOGGLE_LIMIT);
		expect(WISHLIST_LIMITS.REMOVE).toBe(WISHLIST_TOGGLE_LIMIT);
		expect(WISHLIST_LIMITS.TOGGLE).toBe(WISHLIST_TOGGLE_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(WISHLIST_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADDRESS_LIMITS
// ============================================================================

describe("ADDRESS_LIMITS", () => {
	it("contains expected keys", () => {
		expect(ADDRESS_LIMITS).toHaveProperty("SEARCH");
	});

	it("references the correct individual configs", () => {
		expect(ADDRESS_LIMITS.SEARCH).toBe(ADDRESS_SEARCH_LIMIT);
	});

	it("all entries have valid config shape", () => {
		for (const config of Object.values(ADDRESS_LIMITS)) {
			expect(isValidConfig(config)).toBe(true);
		}
	});
});

// ============================================================================
// ADMIN — preset PARTAGÉ (Lot 4 SIMPLIFICATION.md S3.2, 2026-08-03)
// ============================================================================

describe("ADMIN_LIMIT — consolidation délibérée", () => {
	it("porte le nom 'admin' et un plafond généreux pour une humaine seule", () => {
		expect(ADMIN_LIMIT.name).toBe("admin");
		// Assez large pour une rafale d'édition (bulk SKU, drag-and-drop médias),
		// assez bas pour borner un script sur cookie volé.
		expect(ADMIN_LIMIT.limit).toBeGreaterThanOrEqual(60);
		expect(ADMIN_LIMIT.limit).toBeLessThanOrEqual(300);
	});

	// Le partage par identité d'objet est le mécanisme (même pattern que
	// WISHLIST_LIMITS, béni par rate-limit-preset-naming) : une clé qui cesse de
	// pointer ADMIN_LIMIT sans preset dédié documenté est une régression.
	const aggregates: [string, Record<string, RateLimitConfig>, string[]][] = [
		["ADMIN_ORDER_LIMITS", ADMIN_ORDER_LIMITS, ["EXPORT"]],
		["ADMIN_PRODUCT_LIMITS", ADMIN_PRODUCT_LIMITS, []],
		["ADMIN_COLLECTION_LIMITS", ADMIN_COLLECTION_LIMITS, []],
		["ADMIN_MATERIAL_LIMITS", ADMIN_MATERIAL_LIMITS, []],
		["ADMIN_COLOR_LIMITS", ADMIN_COLOR_LIMITS, []],
		["ADMIN_PRODUCT_TYPE_LIMITS", ADMIN_PRODUCT_TYPE_LIMITS, []],
		["ADMIN_SKU_LIMITS", ADMIN_SKU_LIMITS, []],
		["ADMIN_DISCOUNT_LIMITS", ADMIN_DISCOUNT_LIMITS, []],
		["ADMIN_STORE_SETTINGS_LIMITS", ADMIN_STORE_SETTINGS_LIMITS, []],
		["ADMIN_DASHBOARD_LIMITS", ADMIN_DASHBOARD_LIMITS, []],
		["REFUND_LIMITS", REFUND_LIMITS, []],
	];

	it.each(aggregates)("%s pointe le preset partagé (hors clés dédiées)", (_n, agg, dedicated) => {
		for (const [key, config] of Object.entries(agg)) {
			if (dedicated.includes(key)) {
				expect(config).not.toBe(ADMIN_LIMIT);
				expect(isValidConfig(config)).toBe(true);
			} else {
				expect(config).toBe(ADMIN_LIMIT);
			}
		}
	});

	it("ADMIN_ORDER_LIMITS.EXPORT reste dédié et serré (CSV lourd)", () => {
		expect(ADMIN_ORDER_LIMITS.EXPORT.name).toBe("admin-order-export");
		expect(ADMIN_ORDER_LIMITS.EXPORT.limit).toBeLessThanOrEqual(10);
	});

	it("les presets à enjeu propre restent dédiés", () => {
		expect(ADMIN_MAINTENANCE_LIMIT).not.toBe(ADMIN_LIMIT);
		expect(ADMIN_SEARCH_LIMIT).not.toBe(ADMIN_LIMIT);
	});

	it("REFUND_LIMITS ne porte plus le workflow in-app (Lot 2 S3.3)", () => {
		expect(REFUND_LIMITS).toHaveProperty("REFRESH");
		expect(REFUND_LIMITS).not.toHaveProperty("CREATE");
		expect(REFUND_LIMITS).not.toHaveProperty("PROCESS");
		expect(REFUND_LIMITS).not.toHaveProperty("SINGLE_OPERATION");
	});
});

// ============================================================================
// SPECIFIC LIMIT VALUES - security-sensitive configs
// ============================================================================

describe("security-sensitive limit values", () => {
	it("AUTH_LOGIN_LIMIT has a strict limit (<=10)", () => {
		expect(AUTH_LOGIN_LIMIT.limit).toBeLessThanOrEqual(10);
	});

	it("AUTH_LOGOUT_LIMIT reste borné (<=20)", () => {
		// Action publique NON authentifiée qui déclenche une écriture DB
		// (`auth.api.signOut()`) : le plafond est la seule protection.
		expect(AUTH_LOGOUT_LIMIT.limit).toBeLessThanOrEqual(20);
	});

	it("CRON_INVOKE_LIMIT reste bien au-dessous d'un usage automatisé (<=60/min)", () => {
		// Le plafond Hobby impose un run quotidien par cron : tout ce qui approche
		// une cadence par minute est un rejeu manuel ou de l'abus.
		expect(CRON_INVOKE_LIMIT.limit).toBeLessThanOrEqual(60);
		expect(CRON_INVOKE_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});
});

// ============================================================================
// WINDOW DURATIONS - sanity checks
// ============================================================================

describe("windowMs sanity checks", () => {
	it("CHECKOUT_CREATE_SESSION_LIMIT uses at least a 1-minute window", () => {
		expect(CHECKOUT_CREATE_SESSION_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});

	it("AUTH_LOGIN_LIMIT uses at least a 1-minute window", () => {
		expect(AUTH_LOGIN_LIMIT.windowMs).toBeGreaterThanOrEqual(60 * 1000);
	});
});
