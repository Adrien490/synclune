import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: (props: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	ItemGroup,
	ItemSeparator,
	Item,
	ItemMedia,
	ItemContent,
	ItemTitle,
	ItemDescription,
	ItemActions,
	ItemHeader,
	ItemFooter,
} from "../item";

// ============================================================================
// ItemGroup
// ============================================================================

describe("ItemGroup", () => {
	afterEach(cleanup);

	it("has role='list' and data-slot='item-group'", () => {
		render(<ItemGroup data-testid="group">content</ItemGroup>);
		const el = screen.getByTestId("group");
		expect(el).toHaveAttribute("role", "list");
		expect(el).toHaveAttribute("data-slot", "item-group");
	});

	it("renders children", () => {
		render(<ItemGroup>Group content</ItemGroup>);
		expect(screen.getByText("Group content")).toBeInTheDocument();
	});
});

// ============================================================================
// ItemSeparator
// ============================================================================

describe("ItemSeparator", () => {
	afterEach(cleanup);

	it("has data-slot='item-separator'", () => {
		render(<ItemSeparator data-testid="sep" />);
		expect(screen.getByTestId("sep")).toHaveAttribute("data-slot", "item-separator");
	});
});

// ============================================================================
// Item
// ============================================================================

describe("Item", () => {
	afterEach(cleanup);

	it("has data-slot='item' with default variant and size", () => {
		render(<Item data-testid="item">content</Item>);
		const el = screen.getByTestId("item");
		expect(el).toHaveAttribute("data-slot", "item");
		expect(el).toHaveAttribute("data-variant", "default");
		expect(el).toHaveAttribute("data-size", "default");
	});

	it("reflects variant prop in data-variant", () => {
		render(
			<Item data-testid="item" variant="outline">
				content
			</Item>,
		);
		expect(screen.getByTestId("item")).toHaveAttribute("data-variant", "outline");
	});

	it("reflects size prop in data-size", () => {
		render(
			<Item data-testid="item" size="sm">
				content
			</Item>,
		);
		expect(screen.getByTestId("item")).toHaveAttribute("data-size", "sm");
	});

	it("renders as div by default", () => {
		render(<Item data-testid="item">content</Item>);
		expect(screen.getByTestId("item").tagName).toBe("DIV");
	});

	// `render` (Base UI) remplace l'élément rendu — l'ancien `asChild` de Radix.
	// Assertion sur le VRAI composant : la version précédente mockait
	// `@radix-ui/react-slot` et ne validait donc que son propre mock.
	it("renders the element passed to `render`, keeping its own props and the item state", () => {
		render(
			<Item
				data-testid="item"
				size="sm"
				render={
					// eslint-disable-next-line jsx-a11y/anchor-has-content -- prop `render` Base UI : le contenu accessible est porté par les enfants de l'Item
					<a href="https://example.com/produits" />
				}
			>
				child
			</Item>,
		);
		const el = screen.getByTestId("item");
		expect(el.tagName).toBe("A");
		expect(el).toHaveAttribute("href", "https://example.com/produits");
		expect(el).toHaveAttribute("data-slot", "item");
		expect(el).toHaveAttribute("data-size", "sm");
	});
});

// ============================================================================
// ItemMedia
// ============================================================================

describe("ItemMedia", () => {
	afterEach(cleanup);

	it("has data-slot='item-media' and default data-variant", () => {
		render(<ItemMedia data-testid="media">icon</ItemMedia>);
		const el = screen.getByTestId("media");
		expect(el).toHaveAttribute("data-slot", "item-media");
		expect(el).toHaveAttribute("data-variant", "default");
	});

	it("reflects variant prop in data-variant", () => {
		render(
			<ItemMedia data-testid="media" variant="icon">
				icon
			</ItemMedia>,
		);
		expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "icon");
	});

	it("reflects image variant in data-variant", () => {
		render(
			<ItemMedia data-testid="media" variant="image">
				img
			</ItemMedia>,
		);
		expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "image");
	});
});

// ============================================================================
// ItemContent
// ============================================================================

describe("ItemContent", () => {
	afterEach(cleanup);

	it("has data-slot='item-content'", () => {
		render(<ItemContent data-testid="content">content</ItemContent>);
		expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "item-content");
	});
});

// ============================================================================
// ItemTitle
// ============================================================================

describe("ItemTitle", () => {
	afterEach(cleanup);

	it("has data-slot='item-title'", () => {
		render(<ItemTitle data-testid="title">Title</ItemTitle>);
		expect(screen.getByTestId("title")).toHaveAttribute("data-slot", "item-title");
	});
});

// ============================================================================
// ItemDescription
// ============================================================================

describe("ItemDescription", () => {
	afterEach(cleanup);

	it("renders as p with data-slot='item-description'", () => {
		render(<ItemDescription data-testid="desc">Description</ItemDescription>);
		const el = screen.getByTestId("desc");
		expect(el.tagName).toBe("P");
		expect(el).toHaveAttribute("data-slot", "item-description");
	});
});

// ============================================================================
// ItemActions
// ============================================================================

describe("ItemActions", () => {
	afterEach(cleanup);

	it("has data-slot='item-actions'", () => {
		render(<ItemActions data-testid="actions">actions</ItemActions>);
		expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "item-actions");
	});
});

// ============================================================================
// ItemHeader
// ============================================================================

describe("ItemHeader", () => {
	afterEach(cleanup);

	it("has data-slot='item-header'", () => {
		render(<ItemHeader data-testid="header">header</ItemHeader>);
		expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "item-header");
	});
});

// ============================================================================
// ItemFooter
// ============================================================================

describe("ItemFooter", () => {
	afterEach(cleanup);

	it("has data-slot='item-footer'", () => {
		render(<ItemFooter data-testid="footer">footer</ItemFooter>);
		expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "item-footer");
	});
});
