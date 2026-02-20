/**
 * Header de section pour les catégories du menu
 */
export function SectionHeader({ children, id }: { children: React.ReactNode; id?: string }) {
	return (
		<h2
			id={id}
			className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
		>
			{children}
		</h2>
	);
}
