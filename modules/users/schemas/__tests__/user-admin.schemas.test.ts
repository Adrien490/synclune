import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any module under test is imported.
// ---------------------------------------------------------------------------

vi.mock("@/app/generated/prisma/client", () => ({
	Role: { USER: "USER", ADMIN: "ADMIN" },
}));

import {
	deleteUserSchema,
	bulkDeleteUsersSchema,
	suspendUserSchema,
	restoreUserSchema,
	changeUserRoleSchema,
	bulkChangeUserRoleSchema,
	adminUserIdSchema,
} from "../user-admin.schemas";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// Generate an array of `count` distinct valid cuid2 strings.
function makeCuids(count: number): string[] {
	return Array.from({ length: count }, (_, i) => {
		const suffix = String(i).padStart(10, "0");
		return `clh${suffix}abcdefghijklm`;
	});
}

// ============================================================================
// deleteUserSchema
// ============================================================================

describe("deleteUserSchema", () => {
	it("accepts a valid cuid2 id", () => {
		const result = deleteUserSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid id format", () => {
		const result = deleteUserSchema.safeParse({ id: "not-a-cuid2" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty id string", () => {
		const result = deleteUserSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when id is missing", () => {
		const result = deleteUserSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkDeleteUsersSchema
// ============================================================================

describe("bulkDeleteUsersSchema", () => {
	it("accepts an array with a single valid cuid2", () => {
		const result = bulkDeleteUsersSchema.safeParse({ ids: [VALID_CUID] });
		expect(result.success).toBe(true);
	});

	it("accepts an array of multiple valid cuid2s", () => {
		const result = bulkDeleteUsersSchema.safeParse({ ids: makeCuids(5) });
		expect(result.success).toBe(true);
	});

	it("rejects an empty ids array", () => {
		const result = bulkDeleteUsersSchema.safeParse({ ids: [] });
		expect(result.success).toBe(false);
	});

	it("rejects when any id is not a valid cuid2", () => {
		const result = bulkDeleteUsersSchema.safeParse({
			ids: [VALID_CUID, "not-a-cuid2"],
		});
		expect(result.success).toBe(false);
	});

	it("rejects when ids field is missing", () => {
		const result = bulkDeleteUsersSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// suspendUserSchema
// ============================================================================

describe("suspendUserSchema", () => {
	it("accepts a valid cuid2 id", () => {
		const result = suspendUserSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid id format", () => {
		const result = suspendUserSchema.safeParse({ id: "bad-id" });
		expect(result.success).toBe(false);
	});

	it("rejects when id is missing", () => {
		const result = suspendUserSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// restoreUserSchema
// ============================================================================

describe("restoreUserSchema", () => {
	it("accepts a valid cuid2 id", () => {
		const result = restoreUserSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid id format", () => {
		const result = restoreUserSchema.safeParse({ id: "bad-id" });
		expect(result.success).toBe(false);
	});

	it("rejects when id is missing", () => {
		const result = restoreUserSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// changeUserRoleSchema
// ============================================================================

describe("changeUserRoleSchema", () => {
	it('accepts role "USER"', () => {
		const result = changeUserRoleSchema.safeParse({
			id: VALID_CUID,
			role: "USER",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe("USER");
		}
	});

	it('accepts role "ADMIN"', () => {
		const result = changeUserRoleSchema.safeParse({
			id: VALID_CUID,
			role: "ADMIN",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBe("ADMIN");
		}
	});

	it("rejects an invalid role value", () => {
		const result = changeUserRoleSchema.safeParse({
			id: VALID_CUID,
			role: "SUPERADMIN",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when role is missing", () => {
		const result = changeUserRoleSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(false);
	});

	it("rejects an invalid id", () => {
		const result = changeUserRoleSchema.safeParse({
			id: "not-a-cuid2",
			role: "USER",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkChangeUserRoleSchema
// ============================================================================

describe("bulkChangeUserRoleSchema", () => {
	const validInput = {
		ids: [VALID_CUID],
		role: "USER" as const,
	};

	it("accepts valid bulk input with USER role", () => {
		const result = bulkChangeUserRoleSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("accepts valid bulk input with ADMIN role", () => {
		const result = bulkChangeUserRoleSchema.safeParse({
			...validInput,
			role: "ADMIN",
		});
		expect(result.success).toBe(true);
	});

	it("accepts multiple valid cuid2 ids", () => {
		const result = bulkChangeUserRoleSchema.safeParse({
			ids: makeCuids(10),
			role: "USER",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty ids array", () => {
		const result = bulkChangeUserRoleSchema.safeParse({
			...validInput,
			ids: [],
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid role", () => {
		const result = bulkChangeUserRoleSchema.safeParse({
			...validInput,
			role: "MODERATOR",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when any id is not a valid cuid2", () => {
		const result = bulkChangeUserRoleSchema.safeParse({
			ids: [VALID_CUID, "invalid-id"],
			role: "USER",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when ids field is missing", () => {
		const result = bulkChangeUserRoleSchema.safeParse({ role: "USER" });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// adminUserIdSchema
// ============================================================================

describe("adminUserIdSchema", () => {
	it("accepts a valid userId (cuid2)", () => {
		const result = adminUserIdSchema.safeParse({ userId: VALID_CUID });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.userId).toBe(VALID_CUID);
		}
	});

	it("rejects an invalid userId format", () => {
		const result = adminUserIdSchema.safeParse({ userId: "not-a-cuid2" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty userId string", () => {
		const result = adminUserIdSchema.safeParse({ userId: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when userId is missing", () => {
		const result = adminUserIdSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
