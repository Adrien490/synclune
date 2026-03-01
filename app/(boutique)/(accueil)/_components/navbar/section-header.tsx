/**
 * Header de section pour les catégories du menu.
 * Accepts `as` prop to control heading level — defaults to h3
 * (appropriate for sub-sections inside a `<nav>` landmark).
 */
export function SectionHeader({
	children,
	id,
	as: Tag = "h3",
}: {
	children: React.ReactNode;
	id?: string;
	as?: "h2" | "h3";
}) {
	return (
		<Tag
			id={id}
			className="text-muted-foreground px-4 py-2 text-xs font-semibold tracking-wider uppercase"
		>
			{children}
		</Tag>
	);
}
