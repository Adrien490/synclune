import { describe, it, expect } from "vitest";
import {
	announcementMessageSchema,
	announcementLinkSchema,
	dismissDurationHoursSchema,
	createAnnouncementSchema,
	updateAnnouncementSchema,
	deleteAnnouncementSchema,
	toggleAnnouncementStatusSchema,
	bulkDeleteAnnouncementsSchema,
	duplicateAnnouncementSchema,
} from "../announcement.schemas";

const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// announcementMessageSchema
// ============================================================================

describe("announcementMessageSchema", () => {
	it("accepts a valid message", () => {
		expect(announcementMessageSchema.safeParse("Livraison offerte ce week-end").success).toBe(true);
	});

	it("rejects an empty string", () => {
		expect(announcementMessageSchema.safeParse("").success).toBe(false);
	});

	it("rejects a message exceeding 200 characters", () => {
		expect(announcementMessageSchema.safeParse("A".repeat(201)).success).toBe(false);
	});

	it("accepts a message of exactly 200 characters", () => {
		expect(announcementMessageSchema.safeParse("A".repeat(200)).success).toBe(true);
	});

	it("trims whitespace", () => {
		const result = announcementMessageSchema.safeParse("  hello  ");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("hello");
		}
	});
});

// ============================================================================
// announcementLinkSchema
// ============================================================================

describe("announcementLinkSchema", () => {
	it("accepts a relative link starting with /", () => {
		expect(announcementLinkSchema.safeParse("/boutique/soldes").success).toBe(true);
	});

	it("accepts an absolute https link", () => {
		expect(announcementLinkSchema.safeParse("https://example.com/promo").success).toBe(true);
	});

	it("transforms an empty string to null", () => {
		const result = announcementLinkSchema.safeParse("");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeNull();
		}
	});

	it("rejects a link not starting with / or https://", () => {
		expect(announcementLinkSchema.safeParse("http://example.com").success).toBe(false);
	});

	it("rejects a link exceeding 2048 characters", () => {
		expect(
			announcementLinkSchema.safeParse("https://example.com/" + "a".repeat(2040)).success,
		).toBe(false);
	});

	it("accepts null", () => {
		expect(announcementLinkSchema.safeParse(null).success).toBe(true);
	});
});

// ============================================================================
// dismissDurationHoursSchema
// ============================================================================

describe("dismissDurationHoursSchema", () => {
	it("accepts 1 (minimum)", () => {
		expect(dismissDurationHoursSchema.safeParse(1).success).toBe(true);
	});

	it("accepts 720 (maximum)", () => {
		expect(dismissDurationHoursSchema.safeParse(720).success).toBe(true);
	});

	it("rejects 0", () => {
		expect(dismissDurationHoursSchema.safeParse(0).success).toBe(false);
	});

	it("rejects 721", () => {
		expect(dismissDurationHoursSchema.safeParse(721).success).toBe(false);
	});

	it("rejects a float", () => {
		expect(dismissDurationHoursSchema.safeParse(12.5).success).toBe(false);
	});
});

// ============================================================================
// createAnnouncementSchema
// ============================================================================

describe("createAnnouncementSchema", () => {
	const validData = {
		message: "Soldes d'été jusqu'à -50%",
		dismissDurationHours: 24,
	};

	it("accepts valid minimal input", () => {
		expect(createAnnouncementSchema.safeParse(validData).success).toBe(true);
	});

	it("defaults dismissDurationHours to 24 when omitted", () => {
		const result = createAnnouncementSchema.safeParse({ message: "Hello" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dismissDurationHours).toBe(24);
		}
	});

	it("rejects when link is set but linkText is missing", () => {
		const result = createAnnouncementSchema.safeParse({
			...validData,
			link: "/boutique/soldes",
		});
		expect(result.success).toBe(false);
	});

	it("accepts when both link and linkText are set", () => {
		const result = createAnnouncementSchema.safeParse({
			...validData,
			link: "/boutique/soldes",
			linkText: "Voir les soldes",
		});
		expect(result.success).toBe(true);
	});

	it("rejects when endsAt is before startsAt", () => {
		const result = createAnnouncementSchema.safeParse({
			...validData,
			startsAt: new Date("2026-06-10"),
			endsAt: new Date("2026-06-09"),
		});
		expect(result.success).toBe(false);
	});

	it("accepts when endsAt is after startsAt", () => {
		const result = createAnnouncementSchema.safeParse({
			...validData,
			startsAt: new Date("2026-06-10"),
			endsAt: new Date("2026-06-20"),
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing message", () => {
		const result = createAnnouncementSchema.safeParse({ dismissDurationHours: 24 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateAnnouncementSchema
// ============================================================================

describe("updateAnnouncementSchema", () => {
	const validData = {
		id: VALID_CUID,
		message: "Nouvelle annonce",
		startsAt: new Date("2026-06-01"),
		dismissDurationHours: 48,
	};

	it("accepts valid input with id", () => {
		expect(updateAnnouncementSchema.safeParse(validData).success).toBe(true);
	});

	it("rejects missing id", () => {
		const { id: _id, ...withoutId } = validData;
		expect(updateAnnouncementSchema.safeParse(withoutId).success).toBe(false);
	});

	it("rejects invalid id format", () => {
		expect(updateAnnouncementSchema.safeParse({ ...validData, id: "not-a-cuid2" }).success).toBe(
			false,
		);
	});

	it("rejects when link is set but linkText is missing", () => {
		const result = updateAnnouncementSchema.safeParse({
			...validData,
			link: "/boutique",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// deleteAnnouncementSchema
// ============================================================================

describe("deleteAnnouncementSchema", () => {
	it("accepts a valid cuid2", () => {
		expect(deleteAnnouncementSchema.safeParse({ id: VALID_CUID }).success).toBe(true);
	});

	it("rejects missing id", () => {
		expect(deleteAnnouncementSchema.safeParse({}).success).toBe(false);
	});

	it("rejects invalid id format", () => {
		expect(deleteAnnouncementSchema.safeParse({ id: "not-a-cuid2" }).success).toBe(false);
	});
});

// ============================================================================
// toggleAnnouncementStatusSchema
// ============================================================================

describe("toggleAnnouncementStatusSchema", () => {
	it("accepts valid id with isActive true", () => {
		expect(
			toggleAnnouncementStatusSchema.safeParse({ id: VALID_CUID, isActive: true }).success,
		).toBe(true);
	});

	it("accepts valid id with isActive false", () => {
		expect(
			toggleAnnouncementStatusSchema.safeParse({ id: VALID_CUID, isActive: false }).success,
		).toBe(true);
	});

	it("rejects missing isActive", () => {
		expect(toggleAnnouncementStatusSchema.safeParse({ id: VALID_CUID }).success).toBe(false);
	});

	it("rejects invalid id", () => {
		expect(toggleAnnouncementStatusSchema.safeParse({ id: "bad-id", isActive: true }).success).toBe(
			false,
		);
	});
});

// ============================================================================
// bulkDeleteAnnouncementsSchema
// ============================================================================

describe("bulkDeleteAnnouncementsSchema", () => {
	it("accepts a non-empty array of valid ids", () => {
		expect(bulkDeleteAnnouncementsSchema.safeParse({ ids: [VALID_CUID] }).success).toBe(true);
	});

	it("rejects an empty array", () => {
		expect(bulkDeleteAnnouncementsSchema.safeParse({ ids: [] }).success).toBe(false);
	});

	it("rejects more than 50 ids", () => {
		const ids = Array.from({ length: 51 }, () => VALID_CUID);
		expect(bulkDeleteAnnouncementsSchema.safeParse({ ids }).success).toBe(false);
	});

	it("accepts exactly 50 ids", () => {
		const ids = Array.from({ length: 50 }, () => VALID_CUID);
		expect(bulkDeleteAnnouncementsSchema.safeParse({ ids }).success).toBe(true);
	});

	it("rejects when ids contains an invalid cuid2", () => {
		expect(bulkDeleteAnnouncementsSchema.safeParse({ ids: ["not-a-cuid"] }).success).toBe(false);
	});

	it("rejects when ids is missing", () => {
		expect(bulkDeleteAnnouncementsSchema.safeParse({}).success).toBe(false);
	});
});

// ============================================================================
// duplicateAnnouncementSchema
// ============================================================================

describe("duplicateAnnouncementSchema", () => {
	it("accepts a valid cuid2", () => {
		expect(duplicateAnnouncementSchema.safeParse({ id: VALID_CUID }).success).toBe(true);
	});

	it("rejects missing id", () => {
		expect(duplicateAnnouncementSchema.safeParse({}).success).toBe(false);
	});

	it("rejects invalid id format", () => {
		expect(duplicateAnnouncementSchema.safeParse({ id: "not-a-cuid2" }).success).toBe(false);
	});
});
