import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDrawerClose,
	mockDeleteOpen,
	mockChangeStatusOpen,
	mockArchiveOpen,
	mockDuplicateOpen,
	mockCollectionsOpen,
	mockHaptic,
} = vi.hoisted(() => ({
	mockDrawerClose: vi.fn(),
	mockDeleteOpen: vi.fn(),
	mockChangeStatusOpen: vi.fn(),
	mockArchiveOpen: vi.fn(),
	mockDuplicateOpen: vi.fn(),
	mockCollectionsOpen: vi.fn(),
	mockHaptic: vi.fn(),
}));

let drawerData: unknown = null;
let drawerOpen = true;

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "product-item-drawer") {
			return { isOpen: drawerOpen, data: drawerData, close: mockDrawerClose };
		}
		return { open: mockCollectionsOpen };
	},
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: (id: string) => {
		if (id === "delete-product") return { open: mockDeleteOpen };
		if (id === "change-product-status") return { open: mockChangeStatusOpen };
		if (id === "archive-product") return { open: mockArchiveOpen };
		if (id === "duplicate-product") return { open: mockDuplicateOpen };
		return { open: vi.fn() };
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("../archive-product-alert-dialog", () => ({
	ARCHIVE_PRODUCT_DIALOG_ID: "archive-product",
}));
vi.mock("../change-product-status-alert-dialog", () => ({
	CHANGE_PRODUCT_STATUS_DIALOG_ID: "change-product-status",
}));
vi.mock("../delete-product-alert-dialog", () => ({
	DELETE_PRODUCT_DIALOG_ID: "delete-product",
}));
vi.mock("../duplicate-product-alert-dialog", () => ({
	DUPLICATE_PRODUCT_DIALOG_ID: "duplicate-product",
}));
vi.mock("../manage-collections-dialog", () => ({
	MANAGE_COLLECTIONS_DIALOG_ID: "manage-product-collections",
}));

vi.mock("@/shared/components/admin-item-drawer", () => ({
	AdminItemDrawer: ({
		open,
		title,
		description,
		children,
	}: {
		open: boolean;
		title: string;
		description?: React.ReactNode;
		children: React.ReactNode;
	}) =>
		open ? (
			<div role="dialog" aria-label={title}>
				<h2>{title}</h2>
				{description ? <p>{description}</p> : null}
				{children}
			</div>
		) : null,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<a href={href} target={target} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="hero-image" {...rest} />
	),
}));

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	ChevronRight: () => <svg data-testid="icon-chevron" />,
	Copy: () => <svg data-testid="icon-copy" />,
	Eye: () => <svg data-testid="icon-eye" />,
	FolderPlus: () => <svg data-testid="icon-folder-plus" />,
	LayoutList: () => <svg data-testid="icon-layout-list" />,
	Package: () => <svg data-testid="icon-package" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { ProductItemDrawer } from "../product-item-drawer";

// ============================================================================
// FIXTURES
// ============================================================================

type ProductFixture = {
	id: string;
	slug: string;
	title: string;
	status: "DRAFT" | "PUBLIC" | "ARCHIVED";
	priceDisplay: string;
	stock: number;
	variantsCount: number;
	typeLabel: string | null;
	primaryImage: {
		url: string;
		thumbnailUrl: string | null;
		blurDataUrl: string | null;
	} | null;
};

const baseProduct: ProductFixture = {
	id: "p-1",
	slug: "anneau",
	title: "Anneau doré",
	status: "PUBLIC",
	priceDisplay: "45,00 €",
	stock: 10,
	variantsCount: 3,
	typeLabel: "Bagues",
	primaryImage: {
		url: "https://cdn/img.jpg",
		thumbnailUrl: "https://cdn/thumb.jpg",
		blurDataUrl: null,
	},
};

const setData = (overrides: Partial<ProductFixture> = {}) => {
	drawerData = { product: { ...baseProduct, ...overrides } };
	drawerOpen = true;
};

// ============================================================================
// TESTS
// ============================================================================

describe("ProductItemDrawer", () => {
	beforeEach(() => {
		mockDrawerClose.mockReset();
		mockDeleteOpen.mockReset();
		mockChangeStatusOpen.mockReset();
		mockArchiveOpen.mockReset();
		mockDuplicateOpen.mockReset();
		mockCollectionsOpen.mockReset();
		mockHaptic.mockReset();
		drawerData = null;
		drawerOpen = false;
	});

	afterEach(cleanup);

	it("retourne un drawer vide si pas de data", () => {
		drawerOpen = true;
		drawerData = null;
		render(<ProductItemDrawer />);
		expect(screen.queryByText("Anneau doré")).not.toBeInTheDocument();
	});

	it("rend le hero (image, prix, statut, stock chips)", () => {
		setData();
		render(<ProductItemDrawer />);

		expect(screen.getByRole("dialog", { name: "Anneau doré" })).toBeInTheDocument();
		expect(screen.getByTestId("hero-image")).toBeInTheDocument();
		expect(screen.getByText("45,00 €")).toBeInTheDocument();
		expect(screen.getByText("Public")).toBeInTheDocument();
		expect(screen.getByText("10 en stock")).toBeInTheDocument();
		expect(screen.getByText("3 variantes")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("rend le placeholder Package si pas d'image", () => {
		setData({ primaryImage: null });
		render(<ProductItemDrawer />);

		expect(screen.queryByTestId("hero-image")).not.toBeInTheDocument();
		// Placeholder + chip "3 variantes" => 2 occurrences icon-package potentiellement
		expect(screen.getAllByTestId("icon-package").length).toBeGreaterThan(0);
	});

	it("affiche stock destructive si rupture", () => {
		setData({ stock: 0 });
		render(<ProductItemDrawer />);
		expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
	});

	it("affiche stock warning si bas (<= 3)", () => {
		setData({ stock: 2 });
		render(<ProductItemDrawer />);
		expect(screen.getByText("Stock faible · 2")).toBeInTheDocument();
	});

	it("rend la section Gérer avec les 5 actions navigables", () => {
		setData();
		render(<ProductItemDrawer />);
		expect(screen.getByText("Voir sur la boutique")).toBeInTheDocument();
		expect(screen.getByText("Modifier")).toBeInTheDocument();
		expect(screen.getByText("Dupliquer")).toBeInTheDocument();
		expect(screen.getByText("Gérer variantes")).toBeInTheDocument();
		expect(screen.getByText("Gérer collections")).toBeInTheDocument();
	});

	it("rend la section Statut quand non archivé", () => {
		setData({ status: "PUBLIC" });
		render(<ProductItemDrawer />);
		expect(screen.getByText("Passer en brouillon")).toBeInTheDocument();
		expect(screen.getByText("Archiver")).toBeInTheDocument();
		expect(screen.queryByText("Passer en public")).not.toBeInTheDocument();
		expect(screen.queryByText("Restaurer")).not.toBeInTheDocument();
	});

	it("rend Passer en public quand status DRAFT", () => {
		setData({ status: "DRAFT" });
		render(<ProductItemDrawer />);
		expect(screen.getByText("Passer en public")).toBeInTheDocument();
		expect(screen.queryByText("Passer en brouillon")).not.toBeInTheDocument();
	});

	it("rend la section Archive (Restaurer + Supprimer) quand archivé", () => {
		setData({ status: "ARCHIVED" });
		render(<ProductItemDrawer />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
		expect(screen.getByText("Supprimer définitivement")).toBeInTheDocument();
		expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
		expect(screen.queryByText("Passer en brouillon")).not.toBeInTheDocument();
	});

	it("Dupliquer déclenche haptic light + ouvre l'alert + ferme le drawer", () => {
		setData();
		render(<ProductItemDrawer />);
		fireEvent.click(screen.getByText("Dupliquer"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(mockDrawerClose).toHaveBeenCalled();
		expect(mockDuplicateOpen).toHaveBeenCalledWith({
			productId: "p-1",
			productTitle: "Anneau doré",
		});
	});

	it("Archiver déclenche haptic medium", () => {
		setData();
		render(<ProductItemDrawer />);
		fireEvent.click(screen.getByText("Archiver"));
		expect(mockHaptic).toHaveBeenCalledWith("medium");
		expect(mockArchiveOpen).toHaveBeenCalled();
	});

	it("Supprimer déclenche haptic heavy", () => {
		setData({ status: "ARCHIVED" });
		render(<ProductItemDrawer />);
		fireEvent.click(screen.getByText("Supprimer définitivement"));
		expect(mockHaptic).toHaveBeenCalledWith("heavy");
		expect(mockDeleteOpen).toHaveBeenCalledWith({
			productId: "p-1",
			productTitle: "Anneau doré",
		});
	});

	it("Passer en brouillon appelle changeStatus avec targetStatus DRAFT", () => {
		setData({ status: "PUBLIC" });
		render(<ProductItemDrawer />);
		fireEvent.click(screen.getByText("Passer en brouillon"));
		expect(mockChangeStatusOpen).toHaveBeenCalledWith({
			productId: "p-1",
			productTitle: "Anneau doré",
			currentStatus: "PUBLIC",
			targetStatus: "DRAFT",
		});
	});

	it("Voir sur la boutique : link target _blank + haptic selection au clic", () => {
		setData();
		render(<ProductItemDrawer />);
		const link = screen.getByText("Voir sur la boutique").closest("a")!;
		expect(link.getAttribute("href")).toBe("/creations/anneau");
		expect(link.getAttribute("target")).toBe("_blank");
		fireEvent.click(link);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(mockDrawerClose).toHaveBeenCalled();
	});
});
