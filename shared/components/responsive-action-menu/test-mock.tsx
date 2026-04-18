/**
 * Shared vitest mock for `@/shared/components/responsive-action-menu`.
 *
 * Flattens the menu so every visible item is rendered as a <button role="menuitem">
 * (or <a role="menuitem"> for href items) regardless of the mobile/desktop split,
 * letting consumer tests assert on labels, data-variant, aria-disabled, etc.
 *
 * Usage (inside a consumer test):
 * ```tsx
 * vi.mock("@/shared/components/responsive-action-menu", async () => {
 *   const { buildResponsiveActionMenuMock } = await import(
 *     "@/shared/components/responsive-action-menu/test-mock"
 *   );
 *   return buildResponsiveActionMenuMock();
 * });
 * ```
 */

import * as React from "react";

type MockActionMenuItem = {
	key: string;
	label: string;
	description?: string;
	icon?: React.ComponentType<{ className?: string }>;
	variant?: "default" | "destructive";
	disabled?: boolean;
	hidden?: boolean;
	onSelect?: () => void;
	href?: string;
	external?: boolean;
};

type MockActionMenuSection = {
	key: string;
	label?: string;
	items: MockActionMenuItem[];
};

export function buildResponsiveActionMenuMock() {
	const ResponsiveActionMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>;
	const ResponsiveActionMenuTrigger = ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	);
	const ResponsiveActionMenuContent = ({
		title,
		sections,
	}: {
		title: string;
		sections: MockActionMenuSection[];
	}) => (
		<div role="menu" aria-label={title}>
			{sections.map((section) => {
				const visible = section.items.filter((it) => !it.hidden);
				if (visible.length === 0) return null;
				return (
					<div key={section.key} data-section={section.key}>
						{section.label ? <p data-testid={`section-${section.key}`}>{section.label}</p> : null}
						{visible.map((item) =>
							item.href ? (
								<a
									key={item.key}
									role="menuitem"
									href={item.href}
									target={item.external ? "_blank" : undefined}
									data-variant={item.variant}
								>
									{item.label}
								</a>
							) : (
								<button
									key={item.key}
									role="menuitem"
									type="button"
									onClick={item.onSelect}
									aria-disabled={item.disabled === true ? true : undefined}
									data-variant={item.variant}
								>
									{item.label}
								</button>
							),
						)}
					</div>
				);
			})}
		</div>
	);

	return { ResponsiveActionMenu, ResponsiveActionMenuTrigger, ResponsiveActionMenuContent };
}
