import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/data-table", () => ({
	DataTableSkeleton: ({ className }: { className?: string }) => (
		<div data-testid="data-table-skeleton" className={className} />
	),
}));

import { CustomizationsDataTableSkeleton } from "../customizations-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsDataTableSkeleton", () => {
	it("renders without error", () => {
		render(<CustomizationsDataTableSkeleton />);
	});
});
