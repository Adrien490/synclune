import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";
import { FAQ_DATE_MODIFIED, FAQ_ITEMS } from "@/shared/constants/faq-items";
import { SITE_URL } from "@/shared/constants/seo-config";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

import { AideSearchContent } from "./_components/aide-search-content";

export const metadata: Metadata = {
	title: "Aide et FAQ — Synclune",
	description:
		"Toutes les réponses sur la livraison, les retours, l'entretien des bijoux et la personnalisation. Une question reste sans réponse ? Écrivez-moi.",
	alternates: { canonical: `${SITE_URL}/aide` },
	openGraph: {
		title: "Aide et FAQ — Synclune",
		description:
			"Toutes les réponses sur la livraison, les retours, l'entretien des bijoux et la personnalisation.",
		url: `${SITE_URL}/aide`,
		type: "website",
	},
};

const faqPageSchema = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	"@id": `${SITE_URL}/aide#faq`,
	inLanguage: "fr-FR",
	dateModified: FAQ_DATE_MODIFIED,
	mainEntity: FAQ_ITEMS.map((item) => ({
		"@type": "Question",
		name: item.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: item.answerText,
		},
	})),
};

export default function AidePage() {
	const lastUpdated = new Date(FAQ_DATE_MODIFIED).toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<>
			{/* SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				id="aide-faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageSchema) }}
			/>
			<PageHeader
				title="Aide et FAQ"
				description="Trouvez rapidement les réponses aux questions les plus fréquentes. Si vous ne trouvez pas ce que vous cherchez, écrivez-moi directement."
				breadcrumbs={[{ label: "Aide", href: "/aide" }]}
				accent="underline"
				noStructuredData
			/>
			<section className={`bg-background ${SECTION_SPACING.section}`}>
				<div className={CONTAINER_CLASS}>
					<AideSearchContent items={FAQ_ITEMS} />
					<p className="text-muted-foreground mt-10 text-center text-xs">
						Dernière mise à jour : <time dateTime={FAQ_DATE_MODIFIED}>{lastUpdated}</time>
					</p>
				</div>
			</section>
		</>
	);
}
