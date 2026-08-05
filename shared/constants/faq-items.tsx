import Link from "next/link";
import type { ReactNode } from "react";

import { PREPARATION_DELAY_LABEL, SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { BRAND } from "@/shared/constants/brand";
import { formatEuro } from "@/shared/utils/format-euro";

/**
 * SSOT des items FAQ, consommés par la section « Des questions ? » de la
 * landing (`app/(shop)/(home)/_components/faq/faq-section.tsx`).
 *
 * La page `/aide` a été absorbée par la landing le 2026-08-05 : elle redirige
 * en 308 vers `/#faq` (`next.config.ts`). Il n'y a donc plus de champ de
 * recherche — sur onze questions déjà groupées et toutes présentes dans le DOM,
 * un filtre local n'apportait rien et entrait en concurrence visuelle avec la
 * recherche produits de la barre.
 *
 * - `answerText` : version texte brut, SEUL consommateur restant le JSON-LD
 *   `FAQPage` (`shared/components/structured-data.tsx`). ⚠️ Il doit rester le
 *   décalque de `answer` : Google compare le balisage au contenu visible, et un
 *   `answerText` qui dérive de la copie affichée est une non-conformité muette.
 * - `answer` : version JSX riche, rendue par les accordéons.
 * - `section` : regroupement thématique (les cinq `h3` de la section).
 *
 * ⚠️ **Copie au TUTOIEMENT** (CLAUDE.md, § Voix). Les réponses vouvoyaient tant
 * que la FAQ vivait sur sa propre page ; depuis qu'elles cohabitent avec le
 * chapô de l'étal (« Je peins et j'assemble chaque pièce à la main »), les deux
 * registres sont CO-VISIBLES — le défaut exact corrigé sur `/paiement`
 * (`checkout-voice-tutoiement.regression.test.ts`). Les questions, elles, sont
 * formulées SANS adresse (« Les bijoux sont-ils… », pas « Tes bijoux sont-ils… »)
 * : c'est la voix du visiteur, et la neutraliser évite d'avoir à trancher qui
 * tutoie qui.
 *
 * Last modification date — VERCEL_GIT_COMMIT_AUTHOR_DATE (Vercel) ou build time.
 */
export const FAQ_DATE_MODIFIED: string =
	process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE?.split("T")[0] ??
	new Date().toISOString().split("T")[0]!;

export const FAQ_SECTIONS = {
	bijoux: "Les bijoux",
	livraison: "Livraison",
	retours: "Retours et annulation",
	personnalisation: "Personnalisation",
	commandes: "Commandes et paiement",
} as const;

export type FaqSection = keyof typeof FAQ_SECTIONS;

export interface FaqItem {
	id: string;
	section: FaqSection;
	question: string;
	answerText: string;
	answer: ReactNode;
}

/**
 * Classe partagée par tous les liens de réponse — un seul endroit à changer.
 * Exportée pour le lien « écris-moi » du chapô de la section (même encre que
 * les liens de réponse, un seul endroit à changer là aussi).
 *
 * `text-brand-rose-strong`, jamais `text-primary` : `--primary` est un rose de
 * SURFACE (1,55:1 sur le fond — le lien était illisible, P1 de l'audit FAQ du
 * 2026-08-05), là où `--color-brand-rose-strong` est le rose d'ENCRE (5,15:1),
 * cf. la règle « rose profond » de `app/globals.css`. Le soulignement est
 * permanent : dans une réponse en gris `muted-foreground`, la couleur seule ne
 * suffit pas à distinguer le lien (WCAG 1.4.1). Le hover est gaté `can-hover:`
 * comme partout ailleurs — un tap mobile n'a pas d'état survolé à figer.
 */
export const ANSWER_LINK_CLASS =
	"text-brand-rose-strong underline underline-offset-4 can-hover:hover:text-brand-rose-strong/80 focus-visible:text-brand-rose-strong/80";

export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
	{
		id: "fait-main",
		section: "bijoux",
		question: "Les bijoux sont-ils vraiment faits main ?",
		answerText:
			"Oui, à 100 %. Chaque pièce est dessinée, peinte, cuite et assemblée dans mon atelier à Nantes. Aucune production en série, aucune sous-traitance, chaque création passe entre mes mains.",
		answer: (
			<>
				Oui, à <strong className="text-foreground font-semibold">100 %</strong>. Chaque pièce est
				dessinée, peinte, cuite et assemblée dans mon atelier à Nantes. Aucune production en série,
				aucune sous-traitance, chaque création passe entre mes mains.
			</>
		),
	},
	{
		id: "entretien",
		section: "bijoux",
		question: "Comment entretenir mes bijoux faits main ?",
		answerText:
			"Évite le contact prolongé avec l'eau, les parfums et les crèmes. Range-les dans un endroit sec, à l'abri de la lumière directe. Un coup de chiffon doux suffit à raviver leur éclat.",
		answer: (
			<>
				Évite le contact prolongé avec l&apos;eau, les parfums et les crèmes. Range-les dans un
				endroit sec, à l&apos;abri de la lumière directe. Un coup de chiffon doux suffit à raviver
				leur éclat.
			</>
		),
	},
	{
		id: "editions-limitees",
		section: "bijoux",
		question: "Pourquoi y a-t-il si peu d'exemplaires de chaque pièce ?",
		answerText:
			"Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart des modèles existent en moins de dix exemplaires. Si une pièce te plaît, n'attends pas trop.",
		answer: (
			<>
				Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart
				des modèles existent en{" "}
				<strong className="text-foreground font-semibold">moins de dix exemplaires</strong>. Si une
				pièce te plaît, n&apos;attends pas trop.
			</>
		),
	},
	{
		id: "taille",
		section: "bijoux",
		question: "Comment choisir la bonne taille (bague, bracelet, collier) ?",
		answerText: `Mesure un bijou que tu portes déjà avec un mètre ruban souple, ou indique-moi ton tour de doigt ou de poignet à ${BRAND.contact.email}. Je te conseille la taille adaptée et peux ajuster certaines pièces à ta demande.`,
		answer: (
			<>
				Mesure un bijou que tu portes déjà avec un mètre ruban souple, ou indique-moi ton tour de
				doigt ou de poignet à{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Aide%20pour%20choisir%20ma%20taille`}
					className={ANSWER_LINK_CLASS}
				>
					{BRAND.contact.email}
				</a>
				. Je te conseille la taille adaptée et peux ajuster certaines pièces à ta demande.
			</>
		),
	},
	{
		id: "delai",
		section: "livraison",
		question: "Quel est le délai de livraison en France ?",
		answerText: `Les commandes sont expédiées sous ${PREPARATION_DELAY_LABEL}. La livraison France métropolitaine prend ensuite ${SHIPPING_RATES.FR.estimatedDays} en envoi suivi (${formatEuro(SHIPPING_RATES.FR.amount)}). L'Union Européenne est livrée en ${SHIPPING_RATES.EU.estimatedDays} (${formatEuro(SHIPPING_RATES.EU.amount)}).`,
		answer: (
			<>
				Les commandes sont expédiées sous{" "}
				<strong className="text-foreground font-semibold">{PREPARATION_DELAY_LABEL}</strong>. La
				livraison France métropolitaine prend ensuite{" "}
				<strong className="text-foreground font-semibold">{SHIPPING_RATES.FR.estimatedDays}</strong>{" "}
				en envoi suivi ({formatEuro(SHIPPING_RATES.FR.amount)}). L&apos;Union Européenne est livrée
				en {SHIPPING_RATES.EU.estimatedDays} ({formatEuro(SHIPPING_RATES.EU.amount)}).
			</>
		),
	},
	{
		id: "zones",
		section: "livraison",
		question: "La livraison est-elle possible partout ?",
		answerText:
			"Je livre en France métropolitaine et dans l'Union Européenne. La Corse et les DOM-TOM ne sont pas desservis pour le moment : si c'est ton cas, écris-moi, je cherche une solution au cas par cas.",
		answer: (
			<>
				Je livre en <strong className="text-foreground font-semibold">France métropolitaine</strong>{" "}
				et dans l&apos;<strong className="text-foreground font-semibold">Union Européenne</strong>.
				La <strong className="text-foreground font-semibold">Corse</strong> et les{" "}
				<strong className="text-foreground font-semibold">DOM-TOM</strong> ne sont pas desservis
				pour le moment : si c&apos;est ton cas,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Livraison%20hors%20zone`}
					className={ANSWER_LINK_CLASS}
				>
					écris-moi
				</a>
				, je cherche une solution au cas par cas.
			</>
		),
	},
	{
		id: "colis-perdu",
		section: "livraison",
		question: "Que faire si mon colis n'arrive pas ?",
		answerText:
			"Suis d'abord ton colis avec le numéro de suivi reçu par email. Au-delà du délai annoncé, écris-moi : j'ouvre une enquête auprès du transporteur et je te tiens au courant jusqu'à la résolution.",
		answer: (
			<>
				Suis d&apos;abord ton colis avec le numéro de suivi reçu par email. Au-delà du délai
				annoncé,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Probl%C3%A8me%20de%20livraison`}
					className={ANSWER_LINK_CLASS}
				>
					écris-moi
				</a>{" "}
				: j&apos;ouvre une enquête auprès du transporteur et je te tiens au courant jusqu&apos;à la
				résolution.
			</>
		),
	},
	{
		id: "retours",
		section: "retours",
		question: "Comment fonctionnent les retours ?",
		answerText:
			"Tu as 14 jours après réception pour me renvoyer un bijou non porté et dans son emballage d'origine. Échange ou remboursement intégral, frais de livraison initiaux compris ; seuls les frais de retour restent à ta charge. Détails complets sur la page rétractation.",
		answer: (
			<>
				Tu as <strong className="text-foreground font-semibold">14 jours</strong> après réception
				pour me renvoyer un bijou non porté et dans son emballage d&apos;origine. Échange ou
				remboursement intégral, frais de livraison initiaux compris ; seuls les frais de retour
				restent à ta charge.{" "}
				<Link href="/retractation" className={ANSWER_LINK_CLASS}>
					Détails complets
				</Link>
				.
			</>
		),
	},
	{
		id: "annulation",
		section: "retours",
		question: "Comment annuler ma commande ?",
		answerText:
			"Tant que ta commande n'a pas été expédiée, écris-moi vite : j'annule et je te rembourse sous 72 h. Après expédition, il faut attendre la réception puis utiliser le droit de rétractation de 14 jours.",
		answer: (
			<>
				Tant que ta commande n&apos;a pas été expédiée,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Annulation%20de%20commande`}
					className={ANSWER_LINK_CLASS}
				>
					écris-moi vite
				</a>{" "}
				: j&apos;annule et je te rembourse sous 72 h. Après expédition, il faut attendre la
				réception puis utiliser le{" "}
				<Link href="/retractation" className={ANSWER_LINK_CLASS}>
					droit de rétractation de 14 jours
				</Link>
				.
			</>
		),
	},
	{
		id: "personnalisation",
		section: "personnalisation",
		question: "Puis-je personnaliser une création ?",
		answerText:
			"Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être adaptés. Écris-moi, on en discute ensemble.",
		answer: (
			<>
				Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être
				adaptés.{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Demande%20de%20personnalisation`}
					className={ANSWER_LINK_CLASS}
				>
					Écris-moi
				</a>
				, on en discute ensemble.
			</>
		),
	},
	{
		id: "code-promo",
		section: "commandes",
		// ⚠️ Plus de mention « déjà utilisé sur votre compte » : il n'y a plus de
		// compte client depuis le 2026-07-31, l'achat est intégralement invité.
		question: "Mon code promo ne fonctionne pas, pourquoi ?",
		answerText:
			"Plusieurs causes possibles : le code est expiré, le montant minimum d'achat n'est pas atteint, le code a déjà été utilisé, ou il ne s'applique pas aux articles du panier. Si tout semble correct, écris-moi avec le code utilisé, je regarde tout de suite.",
		answer: (
			<>
				Plusieurs causes possibles : le code est expiré, le montant minimum d&apos;achat n&apos;est
				pas atteint, le code a déjà été utilisé, ou il ne s&apos;applique pas aux articles du
				panier. Si tout semble correct,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Probl%C3%A8me%20avec%20mon%20code%20promo`}
					className={ANSWER_LINK_CLASS}
				>
					écris-moi
				</a>{" "}
				avec le code utilisé, je regarde tout de suite.
			</>
		),
	},
];
