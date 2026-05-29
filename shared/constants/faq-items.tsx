import Link from "next/link";
import type { ReactNode } from "react";

import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { BRAND } from "@/shared/constants/brand";
import { formatEuro } from "@/shared/utils/format-euro";

/**
 * SSOT des items FAQ, partagés entre la home (`HomeFaq`) et la page d'aide (`/aide`).
 *
 * - `answerText` : version texte brut (utilisée pour le schema JSON-LD FAQPage + recherche)
 * - `answer` : version JSX riche (utilisée par les accordéons UI)
 * - `section` : regroupement thématique (rendu côté `/aide`)
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

export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
	{
		id: "fait-main",
		section: "bijoux",
		question: "Vos bijoux sont-ils vraiment faits main ?",
		answerText:
			"Oui, à 100 %. Chaque pièce est dessinée, peinte, cuite et assemblée dans mon atelier à Nantes. Aucune production en série, aucune sous-traitance — chaque création passe entre mes mains.",
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
			"Évitez le contact prolongé avec l'eau, les parfums et les crèmes. Rangez-les dans un endroit sec, à l'abri de la lumière directe. Un coup de chiffon doux suffit à raviver leur éclat.",
		answer: (
			<>
				Évitez le contact prolongé avec l&apos;eau, les parfums et les crèmes. Rangez-les dans un
				endroit sec, à l&apos;abri de la lumière directe. Un coup de chiffon doux suffit à raviver
				leur éclat.
			</>
		),
	},
	{
		id: "editions-limitees",
		section: "bijoux",
		question: "Pourquoi vos pièces sont-elles si peu nombreuses ?",
		answerText:
			"Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart des modèles existent en moins de dix exemplaires. Si une pièce vous plaît, n'attendez pas trop.",
		answer: (
			<>
				Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart
				des modèles existent en{" "}
				<strong className="text-foreground font-semibold">moins de dix exemplaires</strong>. Si une
				pièce vous plaît, n&apos;attendez pas trop.
			</>
		),
	},
	{
		id: "taille",
		section: "bijoux",
		question: "Comment choisir la bonne taille (bague, bracelet, collier) ?",
		answerText:
			"Mesurez un bijou que vous portez déjà avec un mètre ruban souple, ou indiquez-moi votre tour de doigt / poignet par email. Je vous conseille la taille la plus adaptée et peux ajuster certaines pièces à votre demande.",
		answer: (
			<>
				Mesurez un bijou que vous portez déjà avec un mètre ruban souple, ou indiquez-moi votre tour
				de doigt ou de poignet à{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Aide%20pour%20choisir%20ma%20taille`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					{BRAND.contact.email}
				</a>
				. Je vous conseille la taille adaptée et peux ajuster certaines pièces à votre demande.
			</>
		),
	},
	{
		id: "delai",
		section: "livraison",
		question: "Quel est le délai de livraison en France ?",
		answerText: `Les commandes sont expédiées sous 1 à 3 jours ouvrés. La livraison France métropolitaine prend ensuite ${SHIPPING_RATES.FR.estimatedDays} via Colissimo (${formatEuro(SHIPPING_RATES.FR.amount)}). L'Union Européenne est livrée en ${SHIPPING_RATES.EU.estimatedDays} (${formatEuro(SHIPPING_RATES.EU.amount)}).`,
		answer: (
			<>
				Les commandes sont expédiées sous{" "}
				<strong className="text-foreground font-semibold">1 à 3 jours ouvrés</strong>. La livraison
				France métropolitaine prend ensuite{" "}
				<strong className="text-foreground font-semibold">{SHIPPING_RATES.FR.estimatedDays}</strong>{" "}
				via Colissimo ({formatEuro(SHIPPING_RATES.FR.amount)}). L&apos;Union Européenne est livrée
				en {SHIPPING_RATES.EU.estimatedDays} ({formatEuro(SHIPPING_RATES.EU.amount)}).
			</>
		),
	},
	{
		id: "colis-perdu",
		section: "livraison",
		question: "Que faire si mon colis n'arrive pas ?",
		answerText:
			"Suivez d'abord votre colis avec le numéro Colissimo reçu par email. Au-delà du délai annoncé, contactez-moi : j'ouvre une enquête La Poste et je vous tiens informé(e) jusqu'à la résolution.",
		answer: (
			<>
				Suivez d&apos;abord votre colis avec le numéro Colissimo reçu par email. Au-delà du délai
				annoncé,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Probl%C3%A8me%20de%20livraison`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					contactez-moi
				</a>{" "}
				: j&apos;ouvre une enquête auprès de La Poste et je vous tiens informé(e) jusqu&apos;à la
				résolution.
			</>
		),
	},
	{
		id: "retours",
		section: "retours",
		question: "Quelle est votre politique de retour ?",
		answerText:
			"Vous avez 14 jours après réception pour me renvoyer un bijou non porté et dans son emballage d'origine. Échange ou remboursement intégral, frais de retour à la charge de l'acheteur. Détails complets sur la page rétractation.",
		answer: (
			<>
				Vous avez <strong className="text-foreground font-semibold">14 jours</strong> après
				réception pour me renvoyer un bijou non porté et dans son emballage d&apos;origine. Échange
				ou remboursement intégral, frais de retour à la charge de l&apos;acheteur.{" "}
				<Link
					href="/retractation"
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
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
			"Tant que votre commande n'a pas été expédiée, écrivez-moi rapidement : j'annule et vous remboursez sous 72 h. Après expédition, il faut attendre la réception puis utiliser le droit de rétractation de 14 jours.",
		answer: (
			<>
				Tant que votre commande n&apos;a pas été expédiée,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Annulation%20de%20commande`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					écrivez-moi rapidement
				</a>{" "}
				: j&apos;annule et je vous rembourse sous 72 h. Après expédition, il faut attendre la
				réception puis utiliser le{" "}
				<Link
					href="/retractation"
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
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
			"Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être adaptés. Écrivez-moi directement à contact@synclune.fr, on en discute ensemble.",
		answer: (
			<>
				Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être
				adaptés.{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Demande%20de%20personnalisation`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					Écrivez-moi
				</a>
				, on en discute ensemble.
			</>
		),
	},
	{
		id: "code-promo",
		section: "commandes",
		question: "Mon code promo ne fonctionne pas, pourquoi ?",
		answerText:
			"Plusieurs causes possibles : le code est expiré, le montant minimum n'est pas atteint, le code a déjà été utilisé sur votre compte, ou il ne s'applique pas aux articles du panier. Vérifiez ces points et réessayez ; sinon écrivez-moi.",
		answer: (
			<>
				Plusieurs causes possibles : le code est expiré, le montant minimum d&apos;achat n&apos;est
				pas atteint, le code a déjà été utilisé sur votre compte, ou il ne s&apos;applique pas aux
				articles du panier. Si tout semble correct,{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Probl%C3%A8me%20avec%20mon%20code%20promo`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					écrivez-moi
				</a>{" "}
				avec le code utilisé, je regarde tout de suite.
			</>
		),
	},
];

/**
 * Sous-ensemble affiché sur la home (6 questions les plus fréquentes).
 * Maintient la rétro-compatibilité avec `home-faq.tsx` historique.
 */
export const HOME_FAQ_ITEMS: ReadonlyArray<FaqItem> = FAQ_ITEMS.filter((item) =>
	["fait-main", "delai", "entretien", "personnalisation", "retours", "editions-limitees"].includes(
		item.id,
	),
);
