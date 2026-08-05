interface ProductCareInfoProps {
	primaryMaterial?: string | null;
}

/**
 * ProductCareInfo — le mot de fin, à la première personne.
 *
 * C'est le seul endroit de la fiche où quelqu'un parle. Trois choses l'annulaient :
 *
 * 1. **Il était replié.** L'accordéon ouvrait « Livraison » par défaut
 *    (`defaultValue={["shipping"]}`) et laissait « Entretien » fermé : la page
 *    s'ouvrait sur des frais de port et cachait l'artisane derrière un clic.
 * 2. **Il vouvoyait** (« votre produit », « Évitez », « il vous le rendra »),
 *    alors que `CLAUDE.md` § Voix impose le tutoiement partout — et que le
 *    catalogue, lui, dit déjà « mes créations », « mon atelier ».
 * 3. **Il appelait un bijou fait main « votre produit »**, quatre fois.
 *
 * L'accordéon disparaît donc, et avec lui la section « Livraison » : ses tarifs
 * faisaient DOUBLON avec `ProductReassurance`, qui les affiche déjà au-dessus.
 * Il ne reste que l'entretien, visible, tutoyé, signé.
 */
export function ProductCareInfo({ primaryMaterial }: ProductCareInfoProps) {
	const material = primaryMaterial?.toLowerCase();

	return (
		<section
			aria-labelledby="product-care-title"
			className="bg-muted/40 rounded-xl p-5 text-sm/6 tracking-normal antialiased"
		>
			<h2 id="product-care-title" className="text-foreground mb-2 font-semibold">
				Comment en prendre soin
			</h2>
			<p className="text-muted-foreground">
				J&apos;ai passé des heures sur celui-là (parfois avec quelques galères), alors voici mes
				conseils pour qu&apos;il dure longtemps :
			</p>
			<ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1.5">
				<li>Évite l&apos;eau, les parfums et les produits cosmétiques (ça n&apos;aime pas trop)</li>
				<li>Range-le dans son petit écrin après chaque utilisation</li>
				<li>Un petit coup de chiffon doux de temps en temps, et c&apos;est nickel</li>
				{material?.includes("argent") && (
					<li>Pour l&apos;argent : un chiffon anti-oxydation, c&apos;est la base</li>
				)}
				{material?.includes("or") && (
					<li>Pour l&apos;or : de l&apos;eau tiède avec un peu de savon fait l&apos;affaire</li>
				)}
			</ul>
			{/* ⚠️ Ce mot n'est PLUS paraphé « — Léane » en cursive : le storefront ne
			    signe qu'UNE fois par page, dans le pied de page. Ce qui en fait un mot
			    et pas un encart, c'est la voix — première personne, tutoiement, « j'ai
			    passé des heures sur celui-là » —, pas le paraphe, qui tombait à un
			    écran de celui du pied de page. */}
			<p className="text-muted-foreground mt-3">
				Je l&apos;ai fait avec passion — prends-en soin et il te le rendra.
			</p>
		</section>
	);
}
