import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockReplace, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockReplace: vi.fn(),
	mockSearchParams: {
		get: vi.fn().mockReturnValue(null),
		toString: vi.fn().mockReturnValue(""),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		MotionConfig: ({ children }: { children: unknown }) => children,
		m: {
			span: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("span", { ref, ...props }, children);
				},
			),
			div: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: vi.fn(() => false),
	};
});

vi.mock("@/shared/components/loaders/mini-dots-loader", () => ({
	MiniDotsLoader: () => {
		const { createElement } = require("react");
		return createElement("span", { "data-testid": "mini-dots-loader" });
	},
}));

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("@/shared/components/ui/input", () => {
	const { forwardRef, createElement } = require("react");
	const Input = forwardRef(({ ...props }: Record<string, unknown>, ref: unknown) =>
		createElement("input", { ref, ...props }),
	);
	Input.displayName = "Input";
	return { Input };
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		Search: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "search-icon", ...props }),
		X: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "x-icon", ...props }),
	};
});

vi.mock("@/shared/components/forms", () => {
	const { useState } = require("react");

	// A minimal AppForm mock that tracks field state and exposes AppField + Subscribe
	function useAppForm({ defaultValues }: { defaultValues: { search: string } }) {
		const [value, setValue] = useState(defaultValues.search);

		return {
			AppField: ({
				children,
				validators,
				name: _name,
			}: {
				children: (field: {
					state: { value: string };
					handleChange: (v: string) => void;
				}) => unknown;
				validators?: unknown;
				name: string;
			}) => {
				const field = {
					state: { value },
					handleChange: (v: string) => {
						setValue(v);
						// Invoke onChangeAsync if provided (simulate debounce immediately)
						const v2 = validators as
							| {
									onChangeAsync?: (opts: { value: string }) => Promise<undefined>;
							  }
							| undefined;
						void v2?.onChangeAsync?.({ value: v });
					},
				};
				return children(field) as unknown;
			},
			Subscribe: ({
				selector,
				children,
			}: {
				selector: (state: { values: { search: string } }) => string;
				children: (v: string) => unknown;
			}) => {
				const selected = selector({ values: { search: value } });
				return children(selected) as unknown;
			},
			setFieldValue: (_name: string, v: string) => setValue(v),
			getFieldValue: (_name: string) => value,
		};
	}

	return { useAppForm };
});

// Import AFTER mocks
import { SearchInput } from "../search-input";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchParams.get.mockReturnValue(null);
	mockSearchParams.toString.mockReturnValue("");
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SearchInput", () => {
	it("renders a search form", () => {
		render(<SearchInput paramName="q" />);

		expect(screen.getByRole("search")).toBeInTheDocument();
	});

	it("renders with custom placeholder", () => {
		render(<SearchInput paramName="q" placeholder="Trouver un produit" />);

		expect(screen.getByPlaceholderText("Trouver un produit")).toBeInTheDocument();
	});

	it("uses default placeholder when none provided", () => {
		render(<SearchInput paramName="q" />);

		expect(screen.getByPlaceholderText("Rechercher…")).toBeInTheDocument();
	});

	it("shows clear button when input has a value", () => {
		render(<SearchInput paramName="q" />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "bracelet" } });

		expect(screen.getByRole("button", { name: "Effacer la recherche" })).toBeInTheDocument();
	});

	it("clears the input when clear button is clicked", () => {
		const onValueChange = vi.fn();
		render(<SearchInput paramName="q" onValueChange={onValueChange} />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "collier" } });

		const clearButton = screen.getByRole("button", { name: "Effacer la recherche" });
		fireEvent.click(clearButton);

		// onValueChange called with empty string signals input was cleared
		expect(onValueChange).toHaveBeenLastCalledWith("");
	});

	it("calls onValueChange when input value changes", () => {
		const onValueChange = vi.fn();
		render(<SearchInput paramName="q" onValueChange={onValueChange} />);

		const input = screen.getByPlaceholderText("Rechercher…");
		fireEvent.change(input, { target: { value: "bague" } });

		expect(onValueChange).toHaveBeenCalledWith("bague");
	});

	it("announces the pending state in the live region", () => {
		render(<SearchInput paramName="q" isPending />);

		expect(screen.getByRole("status")).toHaveTextContent("Recherche en cours…");
	});

	// Régression P0 (audit 2026-05-20) : `SearchInput` doit consommer l'attribut DOM
	// standard `aria-label`. Un consommateur réflexe écrivant `aria-label="…"` ne doit
	// PAS se retrouver avec un champ sans nom accessible (cf bug QuickSearchDialog).
	it("uses the standard aria-label attribute as the accessible name", () => {
		render(<SearchInput paramName="q" aria-label="Rechercher des bijoux" />);

		expect(screen.getByLabelText("Rechercher des bijoux")).toBeInTheDocument();
	});
});
