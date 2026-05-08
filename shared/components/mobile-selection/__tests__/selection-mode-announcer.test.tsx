import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "@/shared/components/data-table";
import { SelectionModeAnnouncer } from "../selection-mode-announcer";

function EnterModeOnMount() {
	const { enterSelectionMode } = useBulkSelectionContext();
	useEffect(() => {
		enterSelectionMode();
	}, [enterSelectionMode]);
	return null;
}

afterEach(cleanup);

describe("SelectionModeAnnouncer", () => {
	it("renders an empty assertive live region when mode is OFF", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<SelectionModeAnnouncer />
			</BulkSelectionProvider>,
		);

		const region = screen.getByRole("status");
		expect(region).toHaveAttribute("aria-live", "assertive");
		expect(region).toHaveAttribute("aria-atomic", "true");
		expect(region).toHaveTextContent("");
	});

	it("announces 'Mode sélection activé' when entering selection mode", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<EnterModeOnMount />
				<SelectionModeAnnouncer />
			</BulkSelectionProvider>,
		);

		expect(screen.getByRole("status")).toHaveTextContent("Mode sélection activé");
	});
});
