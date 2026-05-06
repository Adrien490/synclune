import { SectionTitle } from "@/shared/components/section-title";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { SITE_URL } from "@/shared/constants/seo-config";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

export const HOME_FAQ_ITEMS: ReadonlyArray<{
	id: string;
	question: string;
	answer: string;
}> = [
	{
		id: "fait-main",
		question: "Vos bijoux sont-ils vraiment faits main ?",
		answer:
			"Oui, à 100 %. Chaque pièce est dessinée, peinte, cuite et assemblée dans mon atelier à Pessac. Aucune production en série, aucune sous-traitance — chaque création passe entre mes mains.",
	},
	{
		id: "delai",
		question: "Quel est le délai de livraison en France ?",
		answer:
			"Les commandes sont expédiées sous 1 à 3 jours ouvrés. La livraison France métropolitaine prend ensuite 2 à 4 jours ouvrés via Colissimo (4,99 €). L'Union Européenne est livrée en 5 à 7 jours ouvrés (9,50 €).",
	},
	{
		id: "entretien",
		question: "Comment entretenir mes bijoux faits main ?",
		answer:
			"Évitez le contact prolongé avec l'eau, les parfums et les crèmes. Rangez-les dans un endroit sec, à l'abri de la lumière directe. Un coup de chiffon doux suffit à raviver leur éclat.",
	},
	{
		id: "personnalisation",
		question: "Puis-je personnaliser une création ?",
		answer:
			"Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être adaptés. Rendez-vous sur la page personnalisation ou écrivez-moi directement, on en discute ensemble.",
	},
	{
		id: "retours",
		question: "Quelle est votre politique de retour ?",
		answer:
			"Vous avez 14 jours après réception pour me renvoyer un bijou non porté et dans son emballage d'origine. Échange ou remboursement intégral, frais de retour à la charge de l'acheteur.",
	},
	{
		id: "editions-limitees",
		question: "Pourquoi vos pièces sont-elles si peu nombreuses ?",
		answer:
			"Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart des modèles existent en moins de dix exemplaires. Si une pièce vous plaît, n'attendez pas trop.",
	},
];

const faqPageSchema = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	"@id": `${SITE_URL}/#faq`,
	mainEntity: HOME_FAQ_ITEMS.map((item) => ({
		"@type": "Question",
		name: item.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: item.answer,
		},
	})),
};

export function HomeFaq() {
	return (
		<section
			id="home-faq"
			aria-labelledby="home-faq-title"
			className={`bg-background relative ${SECTION_SPACING.section}`}
		>
			<script
				id="home-faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageSchema) }}
			/>
			<div className={CONTAINER_CLASS}>
				<header className="mb-10 text-center lg:mb-14">
					<SectionTitle id="home-faq-title">Questions fréquentes</SectionTitle>
					<p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal">
						Tout ce qu'il faut savoir avant de craquer.
					</p>
				</header>

				<Accordion
					type="single"
					collapsible
					className="mx-auto max-w-3xl"
					aria-label="Liste des questions fréquentes"
				>
					{HOME_FAQ_ITEMS.map((item) => (
						<AccordionItem key={item.id} value={item.id}>
							<AccordionTrigger headingLevel={3} className="text-base sm:text-lg">
								{item.question}
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground text-base leading-relaxed">
								{item.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
