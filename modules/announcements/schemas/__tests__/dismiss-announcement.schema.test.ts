import { describe, it, expect } from "vitest";
import { dismissAnnouncementSchema } from "../dismiss-announcement.schema";

// ============================================================================
// dismissAnnouncementSchema
// ============================================================================

describe("dismissAnnouncementSchema", () => {
	it("accepts valid input with announcementId and positive dismissDurationHours", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "some-announcement-id",
			dismissDurationHours: 24,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.announcementId).toBe("some-announcement-id");
			expect(result.data.dismissDurationHours).toBe(24);
		}
	});

	it("coerces dismissDurationHours from a numeric string to number", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "abc123",
			dismissDurationHours: "48",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dismissDurationHours).toBe(48);
		}
	});

	it("rejects announcementId as an empty string", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "",
			dismissDurationHours: 24,
		});
		expect(result.success).toBe(false);
	});

	it("rejects dismissDurationHours of 0 (must be positive)", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "abc123",
			dismissDurationHours: 0,
		});
		expect(result.success).toBe(false);
	});

	it("rejects negative dismissDurationHours", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "abc123",
			dismissDurationHours: -1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects when announcementId is missing", () => {
		const result = dismissAnnouncementSchema.safeParse({
			dismissDurationHours: 24,
		});
		expect(result.success).toBe(false);
	});

	it("rejects when dismissDurationHours is missing and cannot be coerced", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "abc123",
			dismissDurationHours: "not-a-number",
		});
		// Number("not-a-number") = NaN, z.number().positive() rejects NaN
		expect(result.success).toBe(false);
	});

	it("accepts a large positive duration (e.g. 720 hours = 30 days)", () => {
		const result = dismissAnnouncementSchema.safeParse({
			announcementId: "abc123",
			dismissDurationHours: 720,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dismissDurationHours).toBe(720);
		}
	});
});
