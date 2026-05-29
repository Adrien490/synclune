import { cleanup, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHaptic, mockRouter } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	mockRouter: { push: vi.fn() },
}));

vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => mockHaptic }));
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

import { useAdminFormKeyboard } from "../use-admin-form-keyboard";

interface HarnessProps {
	isPending?: boolean;
	isMobile?: boolean;
	isDirty?: boolean;
	canSubmit?: boolean;
	withCanSubmit?: boolean;
	allowNavigation?: () => void;
}

function Harness({
	isPending = false,
	isMobile = false,
	isDirty = false,
	canSubmit = true,
	withCanSubmit = false,
	allowNavigation = vi.fn(),
}: HarnessProps) {
	const formRef = useRef<HTMLFormElement>(null);
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: "/admin/catalogue/couleurs",
		allowNavigation,
		getIsDirty: () => isDirty,
		getCanSubmit: withCanSubmit ? () => canSubmit : undefined,
	});
	return <form ref={formRef} aria-label="harness" />;
}

// Dispatch on document.body (a real Element with `.closest`) rather than
// `window`, which has no `.closest` — events still bubble up to the window-level
// listeners the hook registers.
function pressSave() {
	fireEvent.keyDown(document.body, { key: "s", metaKey: true });
}
function pressEscape(target?: Element) {
	fireEvent.keyDown(target ?? document.body, { key: "Escape" });
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("useAdminFormKeyboard", () => {
	describe("⌘S / Ctrl+S submit", () => {
		it("calls requestSubmit on the form and fires medium haptic", () => {
			const submit = vi.fn();
			HTMLFormElement.prototype.requestSubmit = submit;
			render(<Harness />);
			pressSave();
			expect(submit).toHaveBeenCalledTimes(1);
			expect(mockHaptic).toHaveBeenCalledWith("medium");
		});

		it("does nothing while pending", () => {
			const submit = vi.fn();
			HTMLFormElement.prototype.requestSubmit = submit;
			render(<Harness isPending />);
			pressSave();
			expect(submit).not.toHaveBeenCalled();
		});

		it("does nothing on mobile (shortcuts disabled)", () => {
			const submit = vi.fn();
			HTMLFormElement.prototype.requestSubmit = submit;
			render(<Harness isMobile />);
			pressSave();
			expect(submit).not.toHaveBeenCalled();
		});

		it("skips submit when getCanSubmit returns false", () => {
			const submit = vi.fn();
			HTMLFormElement.prototype.requestSubmit = submit;
			render(<Harness withCanSubmit canSubmit={false} />);
			pressSave();
			expect(submit).not.toHaveBeenCalled();
		});

		it("submits when getCanSubmit returns true", () => {
			const submit = vi.fn();
			HTMLFormElement.prototype.requestSubmit = submit;
			render(<Harness withCanSubmit canSubmit />);
			pressSave();
			expect(submit).toHaveBeenCalledTimes(1);
		});
	});

	describe("Escape navigation", () => {
		it("allows navigation and pushes the list path when not dirty", () => {
			const allowNavigation = vi.fn();
			render(<Harness allowNavigation={allowNavigation} />);
			pressEscape();
			expect(allowNavigation).toHaveBeenCalledTimes(1);
			expect(mockRouter.push).toHaveBeenCalledWith("/admin/catalogue/couleurs");
		});

		it("confirms before leaving when dirty and navigates when confirmed", () => {
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
			render(<Harness isDirty />);
			pressEscape();
			expect(confirmSpy).toHaveBeenCalled();
			expect(mockRouter.push).toHaveBeenCalledWith("/admin/catalogue/couleurs");
		});

		it("does not navigate when dirty and the confirm is dismissed", () => {
			vi.spyOn(window, "confirm").mockReturnValue(false);
			render(<Harness isDirty />);
			pressEscape();
			expect(mockRouter.push).not.toHaveBeenCalled();
		});

		it("ignores Escape originating from an open dialog/sheet/popover", () => {
			render(
				<>
					<Harness />
					<div data-slot="dialog-content">
						<button type="button" data-testid="in-dialog">
							x
						</button>
					</div>
				</>,
			);
			pressEscape(document.querySelector('[data-testid="in-dialog"]')!);
			expect(mockRouter.push).not.toHaveBeenCalled();
		});

		it("does nothing on mobile", () => {
			render(<Harness isMobile />);
			pressEscape();
			expect(mockRouter.push).not.toHaveBeenCalled();
		});
	});
});
