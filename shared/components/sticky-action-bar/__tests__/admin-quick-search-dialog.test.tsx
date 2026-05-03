import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// LOCAL STORAGE MOCK
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

const { mockPush, mockSearchParams, mockHaptic, mockToastSuccess, mockSearchFn } = vi.hoisted(
	() => ({
		mockPush: vi.fn(),
		mockSearchParams: { value: new URLSearchParams() },
		mockHaptic: vi.fn(),
		mockToastSuccess: vi.fn(),
		mockSearchFn: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, prefetch: vi.fn() }),
	usePathname: () => "/admin/catalogue/produits",
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

vi.mock("@/shared/components/animations/fade", () => ({
	Fade: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/ui/dialog", () => ({
	Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="dialog">{children}</div> : null,
	DialogContent: ({ children, ...rest }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="dialog-content" {...rest}>
			{children}
		</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: () => <div data-testid="skeleton" />,
	SkeletonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SkeletonText: () => <div />,
}));

// next/link
vi.mock("next/link", () => ({
	default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
		<a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>
	),
}));

// ============================================================================
// IMPORTS UNDER TEST
// ============================================================================

import { AdminQuickSearchDialog } from "../admin-quick-search-dialog";
import type { AdminQuickSearchAdapter, AdminQuickSearchResult } from "../admin-quick-search.types";

interface FakeItem {
	id: string;
	label: string;
}

const STORAGE_KEY = "synclune:admin-recent-searches:test-scope";

function createAdapter(
	overrides: Partial<AdminQuickSearchAdapter<FakeItem>> = {},
): AdminQuickSearchAdapter<FakeItem> {
	return {
		scope: "test-scope",
		placeholder: "Tapez pour chercher",
		ariaLabel: "Recherche test",
		minQueryLength: 2,
		search: (q) => mockSearchFn(q),
		getResultId: (i) => `item-${i.id}`,
		getResultHref: (i) => `/admin/test/${i.id}`,
		getResultLabel: (i) => i.label,
		renderResultItem: (i) => <span>{i.label}</span>,
		...overrides,
	};
}

function defaultProps(
	overrides: Partial<React.ComponentProps<typeof AdminQuickSearchDialog>> = {},
) {
	return {
		open: true,
		onOpenChange: vi.fn(),
		adapter: createAdapter(),
		...overrides,
	} as React.ComponentProps<typeof AdminQuickSearchDialog>;
}

function fakeSuccess(items: FakeItem[]): AdminQuickSearchResult<FakeItem> {
	return { kind: "success", items, totalCount: items.length };
}

// ============================================================================
// TESTS
// ============================================================================

describe("AdminQuickSearchDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.value = new URLSearchParams();
		localStorageMock.clear();
		mockSearchFn.mockResolvedValue(fakeSuccess([]));
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the title, close button and the search input", () => {
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		expect(screen.getByRole("heading", { name: "Rechercher" })).toBeInTheDocument();
		expect(screen.getByLabelText("Recherche test")).toBeInTheDocument();
		expect(screen.getAllByLabelText("Fermer la recherche").length).toBeGreaterThan(0);
	});

	it("input has 2026-native attributes (type/inputMode/enterKeyHint, autocorrect off)", () => {
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		const input = screen.getByLabelText("Recherche test") as HTMLInputElement;
		expect(input.type).toBe("search");
		expect(input.getAttribute("inputmode")).toBe("search");
		expect(input.getAttribute("enterkeyhint")).toBe("search");
		expect(input.getAttribute("autocorrect")).toBe("off");
		expect(input.getAttribute("autocapitalize")).toBe("off");
		expect(input.getAttribute("spellcheck")).toBe("false");
		expect(input.getAttribute("role")).toBe("combobox");
	});

	it("close button fires haptic 'selection' and onOpenChange(false)", () => {
		const onOpenChange = vi.fn();
		render(<AdminQuickSearchDialog {...defaultProps({ onOpenChange })} />);
		// Take the first close button (mobile + desktop are both rendered, jsdom doesn't apply md:)
		fireEvent.click(screen.getAllByLabelText("Fermer la recherche")[0]!);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("typing under min-length shows the hint and does not call adapter.search", () => {
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		const input = screen.getByLabelText("Recherche test");
		fireEvent.change(input, { target: { value: "a" } });
		expect(screen.getByText(/Tapez au moins 2 caractères/)).toBeInTheDocument();
		expect(mockSearchFn).not.toHaveBeenCalled();
	});

	it("typing >= min-length triggers a debounced adapter.search after 300ms", async () => {
		vi.useFakeTimers();
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		const input = screen.getByLabelText("Recherche test");
		act(() => {
			fireEvent.change(input, { target: { value: "ba" } });
		});
		expect(mockSearchFn).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mockSearchFn).toHaveBeenCalledTimes(1);
		expect(mockSearchFn).toHaveBeenCalledWith("ba");
	});

	it("submit Enter triggers haptic 'medium', pushes ?search=, persists recent and closes", async () => {
		const onOpenChange = vi.fn();
		render(<AdminQuickSearchDialog {...defaultProps({ onOpenChange })} />);
		const input = screen.getByLabelText("Recherche test") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "bague" } });
		fireEvent.submit(input.closest("form")!);

		await waitFor(() => {
			expect(mockHaptic).toHaveBeenCalledWith("medium");
		});
		expect(mockPush).toHaveBeenCalledWith(
			expect.stringContaining("/admin/catalogue/produits?search=bague"),
			{ scroll: false },
		);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) ?? "[]");
		expect(stored).toContain("bague");
	});

	it("clear button empties the input and keeps the drawer open", () => {
		const onOpenChange = vi.fn();
		render(<AdminQuickSearchDialog {...defaultProps({ onOpenChange })} />);
		const input = screen.getByLabelText("Recherche test") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "foo" } });
		fireEvent.click(screen.getByLabelText("Effacer la recherche"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(input.value).toBe("");
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("renders recent searches when input is empty and storage has entries", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague", "collier"]));
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		await waitFor(() => {
			expect(screen.getByRole("region", { name: "Recherches récentes" })).toBeInTheDocument();
		});
		expect(screen.getByText("bague")).toBeInTheDocument();
		expect(screen.getByText("collier")).toBeInTheDocument();
	});

	it("tap recent re-runs live search (does NOT close the drawer)", async () => {
		const onOpenChange = vi.fn();
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague"]));
		render(<AdminQuickSearchDialog {...defaultProps({ onOpenChange })} />);

		const recentBtn = await screen.findByRole("button", { name: /^bague$/i });
		fireEvent.click(recentBtn);

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(mockSearchFn).toHaveBeenCalledWith("bague");
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("removing a recent fires haptic 'light' and updates localStorage", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague", "collier"]));
		render(<AdminQuickSearchDialog {...defaultProps()} />);

		const removeBtn = await screen.findByLabelText(/Retirer « bague »/);
		fireEvent.click(removeBtn);

		expect(mockHaptic).toHaveBeenCalledWith("light");
		await waitFor(() => {
			const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) ?? "[]");
			expect(stored).not.toContain("bague");
			expect(stored).toContain("collier");
		});
	});

	it("'Effacer tout' clears recents and shows undo toast", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["a", "b", "c"]));
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		const clearAll = await screen.findByRole("button", { name: "Effacer tout" });
		fireEvent.click(clearAll);
		await waitFor(() => {
			expect(localStorageMock.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
		});
		expect(mockToastSuccess).toHaveBeenCalled();
		const callArgs = mockToastSuccess.mock.calls[0] as [string, { action?: { label: string } }];
		expect(callArgs[1].action?.label).toBe("Annuler");
	});

	it("empty state visible when no input and no recents", () => {
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		expect(screen.getByTestId("admin-quick-search-empty-state")).toBeInTheDocument();
	});

	it("renders results from adapter and 'Voir N résultats' when totalCount > items.length", async () => {
		mockSearchFn.mockResolvedValueOnce({
			kind: "success",
			items: [
				{ id: "1", label: "Bague Aurora" },
				{ id: "2", label: "Bracelet Lune" },
			],
			totalCount: 12,
		} satisfies AdminQuickSearchResult<FakeItem>);

		render(<AdminQuickSearchDialog {...defaultProps()} />);
		const input = screen.getByLabelText("Recherche test");
		fireEvent.change(input, { target: { value: "ba" } });

		await waitFor(() => {
			expect(screen.getByText("Bague Aurora")).toBeInTheDocument();
		});
		expect(screen.getByText("Bracelet Lune")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Voir les 12 résultats/i })).toBeInTheDocument();
	});

	it("shows 'Réessayer' when adapter returns an error", async () => {
		mockSearchFn.mockResolvedValueOnce({ kind: "error" });
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		fireEvent.change(screen.getByLabelText("Recherche test"), { target: { value: "ba" } });

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
		});
		expect(screen.getByText(/temporairement indisponible/i)).toBeInTheDocument();
	});

	it("shows rate-limited message when adapter returns rate-limited", async () => {
		mockSearchFn.mockResolvedValueOnce({ kind: "rate-limited" });
		render(<AdminQuickSearchDialog {...defaultProps()} />);
		fireEvent.change(screen.getByLabelText("Recherche test"), { target: { value: "ba" } });

		await waitFor(() => {
			expect(screen.getByText(/Trop de recherches/i)).toBeInTheDocument();
		});
	});
});
