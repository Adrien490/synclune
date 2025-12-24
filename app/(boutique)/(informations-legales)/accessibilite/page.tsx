import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { Check } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Accessibilité - Synclune | Engagement pour un site accessible à tous",
	description:
		"Synclune s'engage pour un site web accessible à tous. Découvrez nos efforts en matière d'accessibilité numérique et nos conformités WCAG 2.1.",
	keywords: [
		"accessibilité",
		"WCAG",
		"site accessible",
		"navigation clavier",
		"lecteur d'écran",
		"contraste",
		"accessibility",
	],
	alternates: {
		canonical: "/accessibilite",
	},
	openGraph: {
		title: "Accessibilité - Synclune",
		description:
			"Engagement de Synclune pour un site web accessible à tous les utilisateurs.",
		url: "https://synclune.fr/accessibilite",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Accessibilité | Synclune",
		description: "Engagement pour un site web accessible à tous - WCAG 2.1",
	},
};

export default async function AccessibilityPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu change rarement
  cacheTag("accessibility-page");

  const contactEmail =
    process.env.RESEND_CONTACT_EMAIL || "contact@synclune.fr";

  return (
    <div className="relative min-h-screen">
      {/* Background discret - Halo statique pour maintenir l'identité */}
      <DecorativeHalo
        size="xl"
        variant="rose"
        className="top-0 right-0"
        opacity="light"
        blur="xl"
        animate="none"
      />

      <PageHeader
        title="Déclaration d'accessibilité"
        description="Synclune s'engage à rendre son site web accessible à tous les utilisateurs, quelles que soient leurs capacités ou leurs technologies d'assistance."
        breadcrumbs={[{ label: "Accessibilité", href: "/accessibilite" }]}
      />

      <section className={`bg-background ${SECTION_SPACING.default} relative z-10`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">État de conformité</h2>
              <p>
                Ce site web est en <strong>conformité partielle</strong> avec
                les directives <strong>WCAG 2.1 niveau AA</strong> (Web Content
                Accessibility Guidelines). Nous travaillons continuellement pour
                améliorer l'accessibilité de notre site.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Fonctionnalités d'accessibilité implémentées
              </h2>
              <p>Notre site intègre les fonctionnalités suivantes :</p>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Navigation au clavier",
                    description:
                      "Toutes les fonctionnalités du site sont accessibles via le clavier uniquement (Tab, Entrée, Échap).",
                  },
                  {
                    title: "Skip links (liens d'évitement)",
                    description:
                      "Liens invisibles en haut de page permettant de sauter directement au contenu principal.",
                  },
                  {
                    title: "Hiérarchie des titres",
                    description:
                      "Structure sémantique correcte des titres (H1, H2, H3, etc.) pour une navigation aisée.",
                  },
                  {
                    title: "Textes alternatifs",
                    description:
                      "Images accompagnées de descriptions alternatives pour les lecteurs d'écran.",
                  },
                  {
                    title: "Contraste des couleurs",
                    description:
                      "Ratios de contraste conformes aux standards WCAG AA pour une lisibilité optimale.",
                  },
                  {
                    title: "Taille de texte adaptable",
                    description:
                      "Utilisation d'unités relatives permettant le zoom sans perte de contenu.",
                  },
                  {
                    title: "Labels et aria-labels",
                    description:
                      "Formulaires et éléments interactifs correctement étiquetés pour les technologies d'assistance.",
                  },
                  {
                    title: "Focus visible",
                    description:
                      "Indicateurs visuels clairs lors de la navigation au clavier.",
                  },
                  {
                    title: "Responsive design",
                    description:
                      "Site adaptatif fonctionnant sur tous types d'appareils et tailles d'écran.",
                  },
                  {
                    title: "Données structurées",
                    description:
                      "Balisage Schema.org pour une meilleure compréhension du contenu par les assistants vocaux.",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 border rounded-lg bg-muted/20"
                  >
                    <Check className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Raccourcis clavier</h2>
              <p>Les raccourcis clavier suivants sont disponibles :</p>

              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left border-b">Action</th>
                      <th className="px-4 py-2 text-left border-b">
                        Raccourci
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b">
                        Navigation suivante
                      </td>
                      <td className="px-4 py-2 border-b">
                        <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          Tab
                        </kbd>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">
                        Navigation précédente
                      </td>
                      <td className="px-4 py-2 border-b">
                        <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          Shift + Tab
                        </kbd>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">
                        Activer un lien ou bouton
                      </td>
                      <td className="px-4 py-2 border-b">
                        <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          Entrée ou Espace
                        </kbd>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Fermer une modale</td>
                      <td className="px-4 py-2 border-b">
                        <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          Échap
                        </kbd>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        Accéder au contenu principal
                      </td>
                      <td className="px-4 py-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          Tab (depuis le haut de page)
                        </kbd>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Technologies d'assistance compatibles
              </h2>
              <p>
                Notre site a été testé avec les technologies d'assistance
                suivantes :
              </p>

              <ul className="space-y-2">
                {[
                  "NVDA (lecteur d'écran Windows)",
                  "JAWS (lecteur d'écran Windows)",
                  "VoiceOver (lecteur d'écran macOS et iOS)",
                  "TalkBack (lecteur d'écran Android)",
                  "Agrandisseurs d'écran",
                  "Navigation au clavier uniquement",
                ].map((tech, index) => (
                  <li key={index} className="flex gap-2">
                    <Check className="w-5 h-5 text-secondary shrink-0" />
                    <span>{tech}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Limitations connues et améliorations en cours
              </h2>
              <p>Nous travaillons activement sur les points suivants :</p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Amélioration continue de la compatibilité avec tous les
                  lecteurs d'écran
                </li>
                <li>
                  Optimisation des animations pour les utilisateurs préférant un
                  mouvement réduit
                </li>
                <li>Enrichissement des descriptions alternatives des images</li>
                <li>
                  Tests réguliers avec des utilisateurs de technologies
                  d'assistance
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                Signaler un problème d'accessibilité
              </h2>
              <p>
                Si vous rencontrez des difficultés d'accessibilité sur notre
                site, nous vous invitons à nous le signaler. Votre retour nous
                aide à améliorer l'expérience pour tous.
              </p>

              <div className="bg-muted/30 p-6 rounded-lg border">
                <p className="font-medium mb-3">Contactez-nous :</p>
                <ul className="space-y-2">
                  <li>
                    <strong>Email :</strong>{" "}
                    <a href={`mailto:${contactEmail}`} className="underline">
                      {contactEmail}
                    </a>
                  </li>
                  <li>
                    <strong>Formulaire de contact :</strong>{" "}
                    <Link href="/personnalisation" className="underline">
                      Page contact
                    </Link>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground italic mt-4">
                  Nous nous engageons à vous répondre dans les 48 heures ouvrées
                  et à corriger les problèmes signalés dans les meilleurs
                  délais.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Références et normes</h2>
              <p>Ce site respecte les normes suivantes :</p>

              <ul className="space-y-2 ml-4">
                <li>
                  • WCAG 2.1 Niveau AA -{" "}
                  <a
                    href="https://www.w3.org/WAI/WCAG21/quickref/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Directives W3C
                  </a>
                </li>
                <li>
                  • RGAA (Référentiel Général d'Amélioration de l'Accessibilité)
                  -{" "}
                  <a
                    href="https://accessibilite.numerique.gouv.fr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Version française
                  </a>
                </li>
                <li>
                  • ARIA (Accessible Rich Internet Applications) -{" "}
                  <a
                    href="https://www.w3.org/WAI/ARIA/apg/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Spécifications W3C
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
