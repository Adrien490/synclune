/**
 * @regression dropdown-menu-highlight-not-focus-2026-08-04
 *
 * À la migration Radix → Base UI, la traduction évidente de `focus:bg-accent`
 * aurait été de le laisser tel quel (c'est d'ailleurs ce que fait le registry
 * shadcn `base-vega`). Mais `Menu.Item` de Base UI ne prend PAS le focus DOM :
 * le popup le conserve et désigne l'item courant par `aria-activedescendant`
 * (focus virtuel), en posant `data-highlighted` sur l'élément.
 *
 * Un `focus:` sur l'item ne se déclenche donc jamais — l'item parcouru au
 * clavier resterait sans fond, sans erreur ni test rouge. Ce test verrouille le
 * mécanisme réel : il MONTE le vrai composant et navigue au clavier.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../dropdown-menu";

afterEach(cleanup);

function renderMenu() {
	return render(
		<DropdownMenu>
			<DropdownMenuTrigger>Ouvrir</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Premier</DropdownMenuItem>
				<DropdownMenuItem>Second</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
}

describe("DropdownMenuItem — surlignage clavier", () => {
	it("marque l'item parcouru au clavier avec `data-highlighted`", async () => {
		const user = userEvent.setup();
		renderMenu();

		await user.click(screen.getByRole("button", { name: "Ouvrir" }));
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "Premier" })).toBeVisible());

		await user.keyboard("{ArrowDown}");

		await waitFor(() =>
			expect(screen.getByRole("menuitem", { name: "Premier" })).toHaveAttribute("data-highlighted"),
		);
	});

	it("porte le variant `data-highlighted:` et non `focus:` dans ses classes", async () => {
		const user = userEvent.setup();
		renderMenu();

		await user.click(screen.getByRole("button", { name: "Ouvrir" }));
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "Premier" })).toBeVisible());

		// L'attribut ne suffit pas : c'est la règle CSS qui peint le fond.
		const tokens = screen.getByRole("menuitem", { name: "Premier" }).className.split(/\s+/);
		expect(tokens).toContain("data-highlighted:bg-accent");
		expect(tokens.filter((t) => t.startsWith("focus:"))).toEqual([]);
	});
});
