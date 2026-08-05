import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Socle partagé par tous les contrôles du footer — liens ET le bouton
 * « Modifier mes préférences », qui n'est pas un `FooterLink` mais doit
 * répondre à l'appui comme ses six voisins de la même `<ul>`.
 *
 * ⚠️ **Une seule déclaration de `transition-*` et de `duration-*` dans tout le
 * footer, et c'est celle-ci.** Les constantes de `footer.tsx` déclaraient de leur
 * côté `motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]` :
 * comme la composition ci-dessous est une CONCATÉNATION de chaîne (pas un `cn()`),
 * les deux jeux arrivaient intacts dans le `class`, et c'est l'ordre d'ÉMISSION
 * Tailwind qui tranchait — `transition-transform` étant émis après
 * `transition-colors`, le fond de survol de TOUS les liens claquait sans fondu.
 * Défaut invisible au lint, au typecheck et à jsdom ; vérifié dans le CSS compilé.
 *
 * La liste de propriétés reprend celle de la navbar (`navbar-styles.ts`), qui
 * avait déjà résolu le même problème. `--duration-normal` et non `--duration-fast` :
 * 200 ms est ce qui tournait déjà (la durée gagnante était celle du footer), donc
 * le retour d'appui ne change pas — seul le fondu de couleur, mort jusqu'ici,
 * s'ajoute.
 *
 * Verrouillé par `__tests__/footer-link-single-transition.regression.test.tsx`.
 */
export const BASE_TACTILE_CLASSES =
	"focus-ring touch-manipulation motion-safe:transition-[transform,color,background-color] motion-safe:duration-[var(--duration-normal)] active:scale-[0.98]";

type FooterLinkBaseProps = {
	href: string;
	children: ReactNode;
	className?: string;
	"aria-label"?: string;
};

type FooterLinkProps = FooterLinkBaseProps &
	(
		| { external?: false; target?: never; rel?: never }
		| { external: true; target?: string; rel?: string }
	);

export function FooterLink({
	href,
	children,
	className,
	external,
	target,
	rel,
	...rest
}: FooterLinkProps) {
	const composedClassName = className
		? `${className} ${BASE_TACTILE_CLASSES}`
		: BASE_TACTILE_CLASSES;

	if (external) {
		return (
			<a href={href} target={target} rel={rel} className={composedClassName} {...rest}>
				{children}
			</a>
		);
	}

	return (
		<Link href={href} className={composedClassName} {...rest}>
			{children}
		</Link>
	);
}
