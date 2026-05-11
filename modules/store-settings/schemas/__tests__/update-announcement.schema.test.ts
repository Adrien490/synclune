import { describe, it, expect } from "vitest";

import { updateAnnouncementSchema } from "../store-settings.schemas";

describe("updateAnnouncementSchema", () => {
	it("accepts a minimal inactive announcement with blank fields", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "",
			link: "",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				message: null,
				link: null,
				startsAt: null,
				endsAt: null,
				isActive: false,
			});
		}
	});

	it("accepts a full active announcement with schedule window", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "Livraison offerte",
			link: "/collections/promo",
			startsAt: "2026-04-20T10:00",
			endsAt: "2026-04-25T23:59",
			isActive: "on",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isActive).toBe(true);
			expect(result.data.startsAt).toBeInstanceOf(Date);
			expect(result.data.endsAt).toBeInstanceOf(Date);
		}
	});

	it("rejects active announcement without a message", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "",
			link: "",
			startsAt: "",
			endsAt: "",
			isActive: true,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((e) => e.path.includes("message"))).toBe(true);
		}
	});

	it("rejects endsAt before startsAt", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "",
			startsAt: "2026-05-01T10:00",
			endsAt: "2026-04-01T10:00",
			isActive: false,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((e) => e.path.includes("endsAt"))).toBe(true);
		}
	});

	it("accepts endsAt equal-then-later than startsAt is OK when strictly greater", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "",
			startsAt: "2026-04-01T10:00",
			endsAt: "2026-04-01T10:01",
			isActive: false,
		});
		expect(result.success).toBe(true);
	});

	it("rejects javascript: links", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "javascript:alert(1)",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(false);
	});

	it("rejects http:// links (only HTTPS allowed)", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "http://example.com",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(false);
	});

	it("rejects protocol-relative URLs (open redirect)", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "//evil.com",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(false);
	});

	it("rejects triple-slash protocol-relative URLs", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "///path",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(false);
	});

	it("accepts relative path link starting with /", () => {
		const result = updateAnnouncementSchema.safeParse({
			message: "X",
			link: "/shop",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(true);
	});

	it("rejects message longer than 200 chars", () => {
		const long = "a".repeat(201);
		const result = updateAnnouncementSchema.safeParse({
			message: long,
			link: "",
			startsAt: "",
			endsAt: "",
			isActive: false,
		});
		expect(result.success).toBe(false);
	});
});
