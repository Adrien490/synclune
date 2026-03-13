import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AnnouncementBar } from "../announcement-bar";
import type { AnnouncementBarProps } from "../announcement-bar";

// ─── Mocks ──────────────────────────────────────────────────────────

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			initial: _i,
			animate: _a,
			exit: _e,
			transition: _t,
			style: _s,
			...props
		}: Record<string, unknown> & { children: React.ReactNode }) => <div {...props}>{children}</div>,
	},
	useReducedMotion: () => false,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { bar: { type: "spring" } } },
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn(() => null),
	};
})();

function renderBar(overrides: Partial<AnnouncementBarProps> = {}) {
	const defaultProps: AnnouncementBarProps = {
		message: "Livraison offerte dès 50€ d'achat !",
		storageKey: "test-bar",
		...overrides,
	};
	return render(<AnnouncementBar {...defaultProps} />);
}

beforeEach(() => {
	cleanup();
	Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
	localStorageMock.clear();
	vi.clearAllMocks();
	document.documentElement.style.removeProperty("--announcement-bar-height");
});

// ─── Rendering ──────────────────────────────────────────────────────

describe("AnnouncementBar - rendering", () => {
	it("renders the message", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByText("Livraison offerte dès 50€ d'achat !")).toBeInTheDocument();
		});
	});

	it("has role=region with correct aria-label", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
		expect(screen.getByRole("region")).toHaveAttribute(
			"aria-label",
			"Barre d'annonce promotionnelle",
		);
	});

	it("renders close button with aria-label", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Fermer la barre d'annonce" })).toBeInTheDocument();
		});
	});

	it("renders sparkle decorations as aria-hidden", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
		const sparkles = screen.getAllByText("✦");
		expect(sparkles).toHaveLength(2);
		for (const sparkle of sparkles) {
			expect(sparkle).toHaveAttribute("aria-hidden", "true");
		}
	});
});

// ─── Link rendering ─────────────────────────────────────────────────

describe("AnnouncementBar - link", () => {
	it("renders link and linkText when provided", async () => {
		renderBar({ link: "/collections", linkText: "Découvrir" });
		await waitFor(() => {
			expect(screen.getByRole("link", { name: /Découvrir/ })).toBeInTheDocument();
		});
		expect(screen.getByRole("link", { name: /Découvrir/ })).toHaveAttribute("href", "/collections");
	});

	it("does not render link when only link is provided without linkText", async () => {
		renderBar({ link: "/collections" });
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("does not render link when href is unsafe (javascript:)", async () => {
		renderBar({ link: "javascript:alert(1)", linkText: "Click me" });
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("does not render link when href is unsafe (data:)", async () => {
		renderBar({ link: "data:text/html,<h1>xss</h1>", linkText: "Click" });
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("renders link with combined aria-label", async () => {
		renderBar({
			message: "Promo spéciale",
			link: "/soldes",
			linkText: "En profiter",
		});
		await waitFor(() => {
			expect(screen.getByRole("link")).toBeInTheDocument();
		});
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "En profiter - Promo spéciale");
	});

	it("renders dot separator between message and link", async () => {
		renderBar({ link: "/collections", linkText: "Voir" });
		await waitFor(() => {
			expect(screen.getByText("·")).toBeInTheDocument();
		});
	});
});

// ─── Dismiss ────────────────────────────────────────────────────────

describe("AnnouncementBar - dismiss", () => {
	it("hides bar on close button click", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Fermer la barre d'annonce" }));
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	it("hides bar on Escape key", async () => {
		renderBar();
		await waitFor(() => {
			expect(screen.getByRole("region")).toBeInTheDocument();
		});

		fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});
});
