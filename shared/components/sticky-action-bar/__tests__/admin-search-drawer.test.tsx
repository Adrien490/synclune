import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// LOCAL STORAGE MOCK (jsdom 29 doesn't ship a working impl)
// ============================================================================

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

vi.stubGlobal("localStorage", localStorageMock);

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockReplace, mockSearchParams, mockHaptic, mockToastSuccess } = vi.hoisted(
	() => ({
		mockPush: vi.fn(),
		mockReplace: vi.fn(),
		mockSearchParams: { value: new URLSearchParams() },
		mockHaptic: vi.fn(),
		mockToastSuccess: vi.fn(),
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace }),
	useSearchParams: () => mockSearchParams.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
	},
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open ? <div data-testid="drawer">{children}</div> : null,
	DrawerContent: ({
		children,
		onOverlayClick,
		...rest
	}: {
		children: React.ReactNode;
		onOverlayClick?: () => void;
		[key: string]: unknown;
	}) => (
		<div data-testid="drawer-content" {...rest}>
			<button
				type="button"
				data-testid="drawer-overlay"
				onClick={onOverlayClick}
				aria-label="overlay"
			/>
			{children}
		</div>
	),
	DrawerHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<header data-testid="drawer-header" className={className}>
			{children}
		</header>
	),
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerBody: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
		<div data-testid="drawer-body" style={style}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		type = "button",
		className,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		type?: "button" | "submit" | "reset";
		className?: string;
	}) => (
		<button type={type} onClick={onClick} aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
}));

// ============================================================================
// TESTS
// ============================================================================

import { AdminSearchDrawer } from "../admin-search-drawer";

const STORAGE_KEY = "synclune:admin-recent-searches:products";

function defaultProps(overrides: Partial<React.ComponentProps<typeof AdminSearchDrawer>> = {}) {
	return {
		open: true,
		onOpenChange: vi.fn(),
		placeholder: "Rechercher par titre, type...",
		ariaLabel: "Rechercher un produit",
		scope: "products",
		...overrides,
	};
}

describe("AdminSearchDrawer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.value = new URLSearchParams();
		localStorageMock.clear();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the drawer header with a close button and the search input", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		expect(screen.getByRole("heading", { name: "Rechercher" })).toBeInTheDocument();
		expect(screen.getByLabelText("Rechercher un produit")).toBeInTheDocument();
		expect(screen.getByLabelText("Fermer la recherche")).toBeInTheDocument();
	});

	it("close button triggers haptic 'selection' and onOpenChange(false)", () => {
		const onOpenChange = vi.fn();
		render(<AdminSearchDrawer {...defaultProps({ onOpenChange })} />);

		fireEvent.click(screen.getByLabelText("Fermer la recherche"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("input has native 2026 attributes (autoCorrect/autoCapitalize/spellCheck off, vaul-no-drag)", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;

		expect(input.type).toBe("search");
		expect(input.getAttribute("inputmode")).toBe("search");
		expect(input.getAttribute("enterkeyhint")).toBe("search");
		expect(input.getAttribute("autocorrect")).toBe("off");
		expect(input.getAttribute("autocapitalize")).toBe("off");
		expect(input.getAttribute("spellcheck")).toBe("false");
		expect(input.hasAttribute("data-vaul-no-drag")).toBe(true);
	});

	it("submit triggers haptic 'medium', pushes URL and closes drawer", async () => {
		const onOpenChange = vi.fn();
		render(<AdminSearchDrawer {...defaultProps({ onOpenChange })} />);

		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "bague" } });
		fireEvent.submit(input.closest("form")!);

		await waitFor(() => {
			expect(mockHaptic).toHaveBeenCalledWith("medium");
		});
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("search=bague"), {
			scroll: false,
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("submit persists the term to localStorage (recent searches)", async () => {
		render(<AdminSearchDrawer {...defaultProps()} />);

		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "bague" } });
		fireEvent.submit(input.closest("form")!);

		await waitFor(() => {
			const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) ?? "[]");
			expect(stored).toContain("bague");
		});
	});

	it("clear button triggers haptic 'light', empties the input, keeps drawer open", async () => {
		const onOpenChange = vi.fn();
		mockSearchParams.value = new URLSearchParams("search=bague");
		render(<AdminSearchDrawer {...defaultProps({ onOpenChange })} />);

		// Clear button only renders when input has value
		const clearBtn = await screen.findByLabelText("Effacer la recherche");
		fireEvent.click(clearBtn);

		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(mockReplace).toHaveBeenCalled();
		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;
		expect(input.value).toBe("");
	});

	it("typing debounces a URL replace 300ms later", async () => {
		vi.useFakeTimers();
		render(<AdminSearchDrawer {...defaultProps()} />);

		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;
		act(() => {
			fireEvent.change(input, { target: { value: "b" } });
		});
		act(() => {
			fireEvent.change(input, { target: { value: "ba" } });
		});
		expect(mockReplace).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(mockReplace).toHaveBeenCalledTimes(1);
		expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("search=ba"), {
			scroll: false,
		});
	});

	it("renders recent searches section when input is empty and storage has entries", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague", "collier"]));
		render(<AdminSearchDrawer {...defaultProps()} />);

		await waitFor(() => {
			expect(screen.getByRole("region", { name: "Recherches récentes" })).toBeInTheDocument();
		});
		expect(screen.getByText("bague")).toBeInTheDocument();
		expect(screen.getByText("collier")).toBeInTheDocument();
	});

	it("tapping a recent search triggers haptic 'selection' and pushes URL", async () => {
		const onOpenChange = vi.fn();
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague"]));
		render(<AdminSearchDrawer {...defaultProps({ onOpenChange })} />);

		const recentBtn = await screen.findByRole("button", { name: /^bague$/i });
		fireEvent.click(recentBtn);

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("search=bague"), {
			scroll: false,
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("removing a recent search triggers haptic 'light' and removes from storage", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague", "collier"]));
		render(<AdminSearchDrawer {...defaultProps()} />);

		const removeBtn = await screen.findByLabelText(/Retirer « bague »/);
		fireEvent.click(removeBtn);

		expect(mockHaptic).toHaveBeenCalledWith("light");
		await waitFor(() => {
			const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) ?? "[]");
			expect(stored).not.toContain("bague");
			expect(stored).toContain("collier");
		});
	});

	it("'Effacer tout' clears the list and shows an undo toast", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["a", "b", "c"]));
		render(<AdminSearchDrawer {...defaultProps()} />);

		const clearAll = await screen.findByRole("button", { name: "Effacer tout" });
		fireEvent.click(clearAll);

		await waitFor(() => {
			expect(localStorageMock.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
		});
		expect(mockToastSuccess).toHaveBeenCalled();
		const callArgs = mockToastSuccess.mock.calls[0] as [string, { action?: { label: string } }];
		expect(callArgs[1].action?.label).toBe("Annuler");
	});

	it("'Effacer tout' is hidden when only one recent exists", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague"]));
		render(<AdminSearchDrawer {...defaultProps()} />);

		await screen.findByText("bague");
		expect(screen.queryByRole("button", { name: "Effacer tout" })).not.toBeInTheDocument();
	});

	it("tapping the overlay fires haptic 'selection'", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);

		fireEvent.click(screen.getByTestId("drawer-overlay"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("form has role=search and no aria-busy when idle", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		const form = screen.getByRole("search");
		expect(form.getAttribute("aria-busy")).toBeNull();
	});

	it("submit button is labelled 'Rechercher'", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		expect(screen.getByRole("button", { name: "Rechercher" })).toBeInTheDocument();
	});

	it("DrawerBody is capped on --vvh to handle the mobile keyboard", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		const body = screen.getByTestId("drawer-body");
		expect(body.style.maxHeight).toBe("calc(var(--vvh, 100dvh) - 8rem)");
	});

	it("empty state is visible when there are no recent searches and the input is empty", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		expect(screen.getByTestId("admin-search-empty-state")).toBeInTheDocument();
		expect(screen.getByText("Tapez pour rechercher.")).toBeInTheDocument();
	});

	it("empty state hides as soon as the user types a character", () => {
		render(<AdminSearchDrawer {...defaultProps()} />);
		const input = screen.getByLabelText("Rechercher un produit") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "b" } });
		expect(screen.queryByTestId("admin-search-empty-state")).not.toBeInTheDocument();
	});

	it("empty state hides when recent searches exist", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague"]));
		render(<AdminSearchDrawer {...defaultProps()} />);
		await screen.findByText("bague");
		expect(screen.queryByTestId("admin-search-empty-state")).not.toBeInTheDocument();
	});
});
