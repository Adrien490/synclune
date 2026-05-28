import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// VISUAL VIEWPORT MOCK
// ============================================================================
//
// `VisualViewportBridge` maintient l'attribut `<html data-keyboard="open">` et la
// CSS var `--vvh` à partir de `window.visualViewport`. C'est ce qui fait
// disparaître le sticky pay button (`[data-hide-on-keyboard]`) quand le clavier
// mobile s'ouvre — comportement conversion-critique du checkout. JSDOM n'expose
// pas `visualViewport`, on le simule avec un objet contrôlable.

type ResizeHandler = () => void;

interface VisualViewportMock {
	height: number;
	offsetTop: number;
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
	_handlers: Record<string, Set<ResizeHandler>>;
}

function makeVisualViewport(height: number, offsetTop = 0): VisualViewportMock {
	const handlers: Record<string, Set<ResizeHandler>> = {
		resize: new Set(),
		scroll: new Set(),
	};
	return {
		height,
		offsetTop,
		_handlers: handlers,
		addEventListener: vi.fn((type: string, cb: ResizeHandler) => handlers[type]?.add(cb)),
		removeEventListener: vi.fn((type: string, cb: ResizeHandler) => handlers[type]?.delete(cb)),
	};
}

function fireResize(vv: VisualViewportMock) {
	act(() => {
		for (const cb of vv._handlers.resize ?? []) cb();
	});
}

function installViewport(vv: VisualViewportMock, innerHeight = 800) {
	window.innerHeight = innerHeight;
	Object.defineProperty(window, "visualViewport", {
		value: vv,
		configurable: true,
		writable: true,
	});
}

const root = () => document.documentElement;

afterEach(() => {
	cleanup();
	root().removeAttribute("data-keyboard");
	root().style.removeProperty("--vvh");
	root().style.removeProperty("--vvh-offset");
	// Module singleton (`installed`, `currentState`) doit repartir de zéro entre tests.
	vi.resetModules();
});

// ============================================================================
// TESTS
// ============================================================================

describe("VisualViewportBridge", () => {
	it("renders nothing (pure side-effect mount)", async () => {
		installViewport(makeVisualViewport(800));
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		const { container } = render(<VisualViewportBridge />);
		expect(container.firstChild).toBeNull();
	});

	it("sets the --vvh CSS var from the current visual viewport height on mount", async () => {
		installViewport(makeVisualViewport(800, 0));
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		render(<VisualViewportBridge />);
		expect(root().style.getPropertyValue("--vvh")).toBe("800px");
		expect(root().hasAttribute("data-keyboard")).toBe(false);
	});

	it('sets data-keyboard="open" when the viewport shrinks past the 100px threshold (soft keyboard)', async () => {
		const vv = makeVisualViewport(800);
		installViewport(vv, 800);
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		render(<VisualViewportBridge />);

		// Clavier mobile : viewport rétréci de 350px (> seuil 100px).
		vv.height = 450;
		fireResize(vv);

		expect(root().getAttribute("data-keyboard")).toBe("open");
	});

	it("removes data-keyboard when the keyboard closes again", async () => {
		const vv = makeVisualViewport(450); // monté clavier déjà ouvert
		installViewport(vv, 800);
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		render(<VisualViewportBridge />);
		expect(root().getAttribute("data-keyboard")).toBe("open");

		vv.height = 800; // clavier fermé
		fireResize(vv);

		expect(root().hasAttribute("data-keyboard")).toBe(false);
	});

	it("ignores a small viewport delta (URL bar collapse) under the threshold", async () => {
		const vv = makeVisualViewport(800);
		installViewport(vv, 800);
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		render(<VisualViewportBridge />);

		// Collapse barre d'URL ~60px < 100px → ne doit PAS être pris pour un clavier.
		vv.height = 740;
		fireResize(vv);

		expect(root().hasAttribute("data-keyboard")).toBe(false);
	});

	it("degrades gracefully when visualViewport is unavailable (older browsers)", async () => {
		window.innerHeight = 800;
		Object.defineProperty(window, "visualViewport", {
			value: undefined,
			configurable: true,
			writable: true,
		});
		const { VisualViewportBridge } = await import("../visual-viewport-bridge");
		expect(() => render(<VisualViewportBridge />)).not.toThrow();
		expect(root().hasAttribute("data-keyboard")).toBe(false);
	});
});
