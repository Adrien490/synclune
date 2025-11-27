import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * MDX Components Configuration
 * Définit les composants personnalisés utilisés dans les fichiers MDX
 * Ces composants remplacent les éléments HTML par défaut dans le contenu MDX
 * @see https://nextjs.org/docs/app/building-your-application/configuring/mdx
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
		// Permet aux composants personnalisés de l'appelant de prendre priorité
		...components,

		// Titres avec styles personnalisés
		h1: ({ children }) => (
			<h1 className="text-3xl font-bold tracking-tight text-foreground mt-8 mb-4 first:mt-0">
				{children}
			</h1>
		),
		h2: ({ children }) => (
			<h2 className="text-2xl font-semibold text-foreground mt-6 mb-3 first:mt-0">
				{children}
			</h2>
		),
		h3: ({ children }) => (
			<h3 className="text-xl font-semibold text-foreground mt-5 mb-2">
				{children}
			</h3>
		),
		h4: ({ children }) => (
			<h4 className="text-lg font-medium text-foreground mt-4 mb-2">
				{children}
			</h4>
		),

		// Paragraphes avec espacement
		p: ({ children }) => (
			<p className="text-foreground/80 leading-relaxed mb-4">{children}</p>
		),

		// Liens avec Next.js Link pour navigation optimisée
		a: ({ href, children, ...props }) => {
			// Liens externes
			if (href?.startsWith("http")) {
				return (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="text-foreground underline decoration-dashed underline-offset-4 transition-colors decoration-[0.5px]"
						{...props}
					>
						{children}
					</a>
				);
			}

			// Liens internes avec Next.js Link
			return (
				<Link
					href={href || "#"}
					className="text-foreground underline decoration-dashed underline-offset-4 transition-colors decoration-[0.5px]"
					{...props}
				>
					{children}
				</Link>
			);
		},

		// Listes non-ordonnées
		ul: ({ children }) => (
			<ul className="list-disc list-inside space-y-2 mb-4 text-foreground/80">
				{children}
			</ul>
		),

		// Listes ordonnées
		ol: ({ children }) => (
			<ol className="list-decimal list-inside space-y-2 mb-4 text-foreground/80">
				{children}
			</ol>
		),

		// Items de liste
		li: ({ children }) => <li className="leading-relaxed">{children}</li>,

		// Code inline
		code: ({ children }) => (
			<code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
				{children}
			</code>
		),

		// Blocs de code
		pre: ({ children }) => (
			<pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm">
				{children}
			</pre>
		),

		// Citations
		blockquote: ({ children }) => (
			<blockquote className="border-l-4 border-primary/30 pl-4 italic text-foreground/70 my-4">
				{children}
			</blockquote>
		),

		// Séparateurs horizontaux
		hr: () => <hr className="border-border my-8" />,

		// Tableaux
		table: ({ children }) => (
			<div className="overflow-x-auto mb-4">
				<table className="w-full border-collapse border border-border">
					{children}
				</table>
			</div>
		),
		thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
		tbody: ({ children }) => <tbody>{children}</tbody>,
		tr: ({ children }) => (
			<tr className="border-b border-border">{children}</tr>
		),
		th: ({ children }) => (
			<th className="px-4 py-2 text-left font-semibold text-foreground">
				{children}
			</th>
		),
		td: ({ children }) => (
			<td className="px-4 py-2 text-foreground/80">{children}</td>
		),

		// Images avec dimensions responsives
		img: ({ src, alt, ...props }) => (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={src}
				alt={alt || ""}
				className="rounded-lg max-w-full h-auto my-4"
				{...props}
			/>
		),

		// Strong et emphasis
		strong: ({ children }) => (
			<strong className="font-semibold text-foreground">{children}</strong>
		),
		em: ({ children }) => (
			<em className="italic text-foreground/90">{children}</em>
		),
	};
}
