import { describe, expect, it, vi, afterEach } from "vitest";
import {
	isCurrentlyActive,
	computeAnnouncementStatus,
	isValidDateRange,
} from "./announcement-schedule.service";

function makeAnnouncement(overrides: {
	isActive?: boolean;
	startsAt?: Date;
	endsAt?: Date | null;
}) {
	return {
		isActive: overrides.isActive ?? true,
		startsAt: overrides.startsAt ?? new Date("2026-01-01"),
		endsAt: overrides.endsAt ?? null,
	};
}

afterEach(() => {
	vi.useRealTimers();
});

// ─── isCurrentlyActive ──────────────────────────────────────────────

describe("isCurrentlyActive", () => {
	it("returns true when active, started, and no end date", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({ startsAt: new Date("2026-01-01") });
		expect(isCurrentlyActive(a)).toBe(true);
	});

	it("returns true when active, started, and end date is in the future", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({
			startsAt: new Date("2026-01-01"),
			endsAt: new Date("2026-06-01"),
		});
		expect(isCurrentlyActive(a)).toBe(true);
	});

	it("returns false when isActive is false", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({ isActive: false });
		expect(isCurrentlyActive(a)).toBe(false);
	});

	it("returns false when startsAt is in the future", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({ startsAt: new Date("2026-06-01") });
		expect(isCurrentlyActive(a)).toBe(false);
	});

	it("returns false when endsAt is in the past", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({
			startsAt: new Date("2026-01-01"),
			endsAt: new Date("2026-02-01"),
		});
		expect(isCurrentlyActive(a)).toBe(false);
	});

	it("returns false when endsAt equals now (boundary)", () => {
		const now = new Date("2026-03-01");
		vi.useFakeTimers({ now });
		const a = makeAnnouncement({
			startsAt: new Date("2026-01-01"),
			endsAt: now,
		});
		expect(isCurrentlyActive(a)).toBe(false);
	});

	it("returns true when startsAt equals now (boundary)", () => {
		const now = new Date("2026-03-01");
		vi.useFakeTimers({ now });
		const a = makeAnnouncement({ startsAt: now });
		expect(isCurrentlyActive(a)).toBe(true);
	});
});

// ─── computeAnnouncementStatus ──────────────────────────────────────

describe("computeAnnouncementStatus", () => {
	it("returns 'active' when active and currently running", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({ startsAt: new Date("2026-01-01") });
		expect(computeAnnouncementStatus(a)).toBe("active");
	});

	it("returns 'scheduled' when active but start is in the future", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({ startsAt: new Date("2026-06-01") });
		expect(computeAnnouncementStatus(a)).toBe("scheduled");
	});

	it("returns 'expired' when endsAt is in the past", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({
			startsAt: new Date("2026-01-01"),
			endsAt: new Date("2026-02-01"),
		});
		expect(computeAnnouncementStatus(a)).toBe("expired");
	});

	it("returns 'expired' when endsAt equals now", () => {
		const now = new Date("2026-03-01");
		vi.useFakeTimers({ now });
		const a = makeAnnouncement({
			startsAt: new Date("2026-01-01"),
			endsAt: now,
		});
		expect(computeAnnouncementStatus(a)).toBe("expired");
	});

	it("returns 'inactive' when isActive is false and not expired", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({
			isActive: false,
			startsAt: new Date("2026-01-01"),
		});
		expect(computeAnnouncementStatus(a)).toBe("inactive");
	});

	it("returns 'expired' over 'inactive' when both conditions met", () => {
		vi.useFakeTimers({ now: new Date("2026-03-01") });
		const a = makeAnnouncement({
			isActive: false,
			startsAt: new Date("2026-01-01"),
			endsAt: new Date("2026-02-01"),
		});
		expect(computeAnnouncementStatus(a)).toBe("expired");
	});
});

// ─── isValidDateRange ───────────────────────────────────────────────

describe("isValidDateRange", () => {
	it("returns true when endsAt is null", () => {
		expect(isValidDateRange(new Date("2026-01-01"), null)).toBe(true);
	});

	it("returns true when endsAt > startsAt", () => {
		expect(isValidDateRange(new Date("2026-01-01"), new Date("2026-06-01"))).toBe(true);
	});

	it("returns false when endsAt < startsAt", () => {
		expect(isValidDateRange(new Date("2026-06-01"), new Date("2026-01-01"))).toBe(false);
	});

	it("returns false when endsAt equals startsAt", () => {
		const date = new Date("2026-03-01");
		expect(isValidDateRange(date, date)).toBe(false);
	});
});
