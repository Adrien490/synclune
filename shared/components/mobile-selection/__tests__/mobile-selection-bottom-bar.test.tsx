import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

const useBackButtonCloseMock = vi.fn();
vi.mock("@/shared/hooks/use-back-button-close", () => ({
	useBackButtonClose: (opts: unknown) => useBackButtonCloseMock(opts),
}));

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		"aria-label": ariaLabel,
		height,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		height?: number;
		className?: string;
	}) => (
		<div data-testid="bottom-bar" data-height={height} aria-label={ariaLabel} className={className}>
			{children}
		</div>
	),
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "@/shared/components/data-table";
import { MobileSelectionBottomBar } from "../mobile-selection-bottom-bar";

function EnterModeOnMount() {
	const { enterSelectionMode } = useBulkSelectionContext();
	useEffect(() => {
		enterSelectionMode();
	}, [enterSelectionMode]);
	return null;
}

beforeEach(() => {
	useBackButtonCloseMock.mockClear();
});

afterEach(cleanup);

describe("MobileSelectionBottomBar", () => {
	it("renders nothing when selection mode is OFF", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionBottomBar>
					<button>Supprimer</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		expect(screen.queryByTestId("bottom-bar")).not.toBeInTheDocument();
	});

	it("renders nothing when the page is empty even in selection mode", () => {
		render(
			<BulkSelectionProvider pageItemIds={[]}>
				<EnterModeOnMount />
				<MobileSelectionBottomBar>
					<button>Supprimer</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		expect(screen.queryByTestId("bottom-bar")).not.toBeInTheDocument();
	});

	it("renders children inside the bar when selection mode is ON and the page has items", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<EnterModeOnMount />
				<MobileSelectionBottomBar>
					<button data-testid="bulk-action">Supprimer</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		expect(screen.getByTestId("bottom-bar")).toBeInTheDocument();
		expect(screen.getByTestId("bulk-action")).toBeInTheDocument();
	});

	it("uses 'Actions groupées' as default aria-label and reports height 112", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<EnterModeOnMount />
				<MobileSelectionBottomBar>
					<button>Action</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		const bar = screen.getByTestId("bottom-bar");
		expect(bar).toHaveAttribute("aria-label", "Actions groupées");
		expect(bar).toHaveAttribute("data-height", "112");
	});

	it("forwards a custom aria-label", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<EnterModeOnMount />
				<MobileSelectionBottomBar aria-label="Actions commandes">
					<button>Action</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		expect(screen.getByTestId("bottom-bar")).toHaveAttribute("aria-label", "Actions commandes");
	});

	it("calls useBackButtonClose with isOpen=true and stable id when active", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<EnterModeOnMount />
				<MobileSelectionBottomBar>
					<button>Action</button>
				</MobileSelectionBottomBar>
			</BulkSelectionProvider>,
		);

		const calls = useBackButtonCloseMock.mock.calls;
		const lastCall = calls.at(-1)?.[0] as
			| { isOpen: boolean; id: string; onClose: () => void }
			| undefined;

		expect(lastCall).toBeDefined();
		expect(lastCall?.isOpen).toBe(true);
		expect(lastCall?.id).toBe("mobile-selection-mode");
		expect(typeof lastCall?.onClose).toBe("function");
	});
});
