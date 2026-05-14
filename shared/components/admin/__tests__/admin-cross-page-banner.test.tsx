import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";

import { AdminCrossPageBanner } from "../admin-cross-page-banner";

// ============================================================================
// Mocks
// ============================================================================

const mockUseBulkSelectionContext = vi.fn();
const mockExtendSelection = vi.fn();
const mockTriggerHaptic = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/shared/components/data-table", () => ({
	useBulkSelectionContext: () => mockUseBulkSelectionContext(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		success: (msg: string) => mockToastSuccess(msg),
		error: (msg: string) => mockToastError(msg),
	},
}));

vi.mock("lucide-react", () => ({
	ListChecks: (props: Record<string, unknown>) => <svg data-testid="icon-list-checks" {...props} />,
	Loader2: (props: Record<string, unknown>) => <svg data-testid="icon-loader" {...props} />,
}));

// ============================================================================
// Helpers
// ============================================================================

function setBulkContext(overrides: {
	selectionMode?: boolean;
	pageState?: "none" | "some" | "all";
	pageItemIds?: string[];
	selectedCount?: number;
}) {
	mockUseBulkSelectionContext.mockReturnValue({
		selectionMode: overrides.selectionMode ?? true,
		pageState: overrides.pageState ?? "all",
		pageItemIds: overrides.pageItemIds ?? ["a", "b", "c"],
		selectedCount: overrides.selectedCount ?? 3,
		extendSelection: mockExtendSelection,
	});
}

const successAction = (ids: string[]): ActionState => ({
	status: ActionStatus.SUCCESS,
	message: "ok",
	data: { ids, totalCount: ids.length, cappedAt: 100 },
});

const errorAction = (message: string): ActionState => ({
	status: ActionStatus.ERROR,
	message,
});

const baseProps = {
	totalCount: 10,
	filterParams: { search: undefined, sortBy: "default", filters: {} },
	cap: 100,
	itemLabel: { singular: "item", plural: "items" },
};

// ============================================================================
// Tests
// ============================================================================

describe("AdminCrossPageBanner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders when selectionMode + pageState=all + hasMore + !isComplete", () => {
		setBulkContext({});
		render(
			<AdminCrossPageBanner
				{...baseProps}
				getFilteredIds={async () => successAction(["a", "b", "c", "d"])}
			/>,
		);
		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Sélectionner les 10/i })).toBeInTheDocument();
		expect(screen.getByText(/3/i)).toBeInTheDocument();
	});

	it("hides when selectionMode is false", () => {
		setBulkContext({ selectionMode: false });
		render(
			<AdminCrossPageBanner {...baseProps} getFilteredIds={async () => successAction(["a"])} />,
		);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("hides when selectedCount >= totalCount", () => {
		setBulkContext({ selectedCount: 10 });
		render(
			<AdminCrossPageBanner {...baseProps} getFilteredIds={async () => successAction(["a"])} />,
		);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("hides when totalCount <= pageItemIds.length (no other pages)", () => {
		setBulkContext({ pageItemIds: ["a", "b", "c", "d", "e"] });
		render(
			<AdminCrossPageBanner
				{...baseProps}
				totalCount={3}
				getFilteredIds={async () => successAction(["a"])}
			/>,
		);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("shows '(max)' suffix when totalCount > cap", () => {
		setBulkContext({});
		render(
			<AdminCrossPageBanner
				{...baseProps}
				totalCount={250}
				cap={100}
				getFilteredIds={async () => successAction(["a"])}
			/>,
		);
		const button = screen.getByRole("button", { name: /Sélectionner les 100 \(max\)/i });
		expect(button).toBeInTheDocument();
	});

	it("calls extendSelection + toast.success + haptic on click", async () => {
		setBulkContext({});
		const ids = ["a", "b", "c", "d"];
		const action = vi.fn().mockResolvedValue(successAction(ids));
		render(
			<AdminCrossPageBanner
				{...baseProps}
				itemLabel={{ singular: "bijou", plural: "bijoux" }}
				getFilteredIds={action}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Sélectionner les 10/i }));

		await waitFor(() => {
			expect(action).toHaveBeenCalled();
			expect(mockExtendSelection).toHaveBeenCalledWith(ids);
			expect(mockToastSuccess).toHaveBeenCalledWith(
				expect.stringContaining("4 bijoux ajoutés à la sélection"),
			);
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});
	});

	it("shows toast.error when getFilteredIds returns error", async () => {
		setBulkContext({});
		const action = vi.fn().mockResolvedValue(errorAction("Boom"));
		render(<AdminCrossPageBanner {...baseProps} getFilteredIds={action} />);

		fireEvent.click(screen.getByRole("button", { name: /Sélectionner les 10/i }));

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith("Boom");
			expect(mockExtendSelection).not.toHaveBeenCalled();
		});
	});
});
