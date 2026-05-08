import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { useEscapeKey } from "../use-escape-key";

function Probe({ onEscape, enabled = true }: { onEscape: () => void; enabled?: boolean }) {
	useEscapeKey(onEscape, enabled);
	return <div data-testid="probe" />;
}

afterEach(cleanup);

describe("useEscapeKey", () => {
	it("calls the callback on Escape keydown when enabled", () => {
		const onEscape = vi.fn();
		render(<Probe onEscape={onEscape} />);

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onEscape).toHaveBeenCalledTimes(1);
	});

	it("does not call the callback for non-Escape keys", () => {
		const onEscape = vi.fn();
		render(<Probe onEscape={onEscape} />);

		fireEvent.keyDown(document, { key: "Enter" });
		fireEvent.keyDown(document, { key: "ArrowUp" });
		fireEvent.keyDown(document, { key: "a" });

		expect(onEscape).not.toHaveBeenCalled();
	});

	it("ignores Escape when enabled is false", () => {
		const onEscape = vi.fn();
		render(<Probe onEscape={onEscape} enabled={false} />);

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onEscape).not.toHaveBeenCalled();
	});

	it("removes the listener on unmount", () => {
		const onEscape = vi.fn();
		const { unmount } = render(<Probe onEscape={onEscape} />);

		unmount();
		fireEvent.keyDown(document, { key: "Escape" });

		expect(onEscape).not.toHaveBeenCalled();
	});

	it("uses latest callback without re-binding the listener", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(<Probe onEscape={first} />);

		rerender(<Probe onEscape={second} />);
		fireEvent.keyDown(document, { key: "Escape" });

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});
});
