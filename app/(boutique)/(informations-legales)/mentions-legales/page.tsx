import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mentions Légales | Synclune",
	description:
		"Mentions légales du site Synclune - Bijouterie artisanale en ligne. Informations légales et identification de l'éditeur",
	keywords: [
		"mentions légales",
		"éditeur",
		"hébergeur",
		"informations légales",
		"Synclune",
	],
	alternates: {
		canonical: "/mentions-legales",
	},
	openGraph: {
		title: "Mentions Légales - Synclune",
		description:
			"Mentions légales du site Synclune - Informations légales et identification de l'éditeur",
		url: "https://synclune.fr/mentions-legales",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Mentions Légales | Synclune",
		description: "Informations légales et identification de l'éditeur",
	},
};

export default async function MentionsLegalesPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
  cacheTag("legal-notice");

  // Récupérer l'URL du site et l'email depuis les variables d'environnement
  const siteUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "https://synclune.fr";
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
        title="Mentions Légales"
        description="Informations légales et identification de l'éditeur du site Synclune"
        breadcrumbs={[{ label: "Mentions légales", href: "/mentions-legales" }]}
      />

      <section className={`bg-background ${SECTION_SPACING.default} relative z-10`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Éditeur du site</h2>
              <p>
                <strong>Raison sociale :</strong> TADDEI LEANE
                <br />
                <strong>Nom commercial :</strong> Synclune
                <br />
                <strong>Forme juridique :</strong> Entrepreneur individuel
                (Micro-entreprise)
              </p>
              <p>
                <strong>Adresse du siège social :</strong>
                <br />
                77 Boulevard du Tertre
                <br />
                44100 Nantes
                <br />
                France
              </p>
              <p>
                <strong>SIREN :</strong> 839 183 027
                <br />
                <strong>SIRET :</strong> 839 183 027 00037
                <br />
                <strong>Code APE/NAF :</strong> 47.91B (Vente à distance sur
                catalogue spécialisé)
                <br />
                <strong>Numéro de TVA intracommunautaire :</strong>{" "}
                FR35839183027
              </p>
              <p>
                <strong>Activité :</strong> Artisanat de bijoux fantaisie
                proposés à la vente en ligne
                <br />
                <strong>Inscription :</strong> Inscrite au Répertoire National
                des Entreprises (RNE)
              </p>
              <p>
                <strong>Email :</strong>{" "}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>
                <br />
                <strong>Site internet :</strong>{" "}
                <a href={siteUrl} className="underline">
                  {siteUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                2. Directeur de la publication
              </h2>
              <p>
                <strong>Léane Taddei</strong>
                <br />
                Chef d'entreprise - Synclune
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Hébergement</h2>
              <h3 className="text-xl font-medium">3.1 Site internet</h3>
              <p>
                <strong>Vercel Inc.</strong>
                <br />
                340 S Lemon Ave #4133
                <br />
                Walnut, CA 91789
                <br />
                États-Unis
                <br />
                Site web :{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  vercel.com
                </a>
              </p>

              <h3 className="text-xl font-medium">3.2 Base de données</h3>
              <p>
                <strong>Neon (Neon Postgres)</strong>
                <br />
                Site web :{" "}
                <a
                  href="https://neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  neon.tech
                </a>
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                4. Propriété intellectuelle
              </h2>
              <p>
                L'ensemble du contenu du site{" "}
                <strong>{siteUrl.replace(/^https?:\/\//, "")}</strong> (textes,
                images, photographies, logo, graphismes, design) est la
                propriété exclusive de Synclune ou de ses partenaires, et est
                protégé par le Code de la Propriété Intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication,
                adaptation de tout ou partie des éléments du site, quel que soit
                le moyen ou le procédé utilisé, est interdite, sauf autorisation
                écrite préalable de Synclune.
              </p>
              <p>
                Toute exploitation non autorisée du site ou de l'un quelconque
                des éléments qu'il contient sera considérée comme constitutive
                d'une contrefaçon et poursuivie conformément aux dispositions
                des articles L.335-2 et suivants du Code de Propriété
                Intellectuelle.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                5. Données personnelles
              </h2>
              <p>
                Synclune s'engage à respecter la vie privée de ses utilisateurs
                et à protéger leurs données personnelles conformément au RGPD.
              </p>
              <p>
                Pour en savoir plus sur la collecte et le traitement de vos
                données, consultez notre{" "}
                <a href="/confidentialite" className="underline">
                  Politique de Confidentialité
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Cookies</h2>
              <p>
                Le site utilise des cookies techniques nécessaires à son
                fonctionnement (gestion du panier, session utilisateur). Ces
                cookies ne collectent pas de données personnelles à des fins
                publicitaires.
              </p>
              <p>
                Pour plus d'informations, consultez notre{" "}
                <a href="/cookies" className="underline">
                  Politique de gestion des cookies
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Responsabilité</h2>
              <p>
                Synclune s'efforce d'assurer l'exactitude et la mise à jour des
                informations diffusées sur ce site, dont elle se réserve le
                droit de corriger, à tout moment et sans préavis, le contenu.
              </p>
              <p>
                Toutefois, Synclune ne peut garantir l'exactitude, la précision
                ou l'exhaustivité des informations mises à disposition sur ce
                site.
              </p>
              <p>
                En conséquence, Synclune décline toute responsabilité pour toute
                imprécision, inexactitude ou omission portant sur des
                informations disponibles sur le site.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Liens hypertextes</h2>
              <p>
                Le site peut contenir des liens hypertextes vers d'autres sites.
                Synclune n'exerce aucun contrôle sur ces sites et décline toute
                responsabilité quant à leur contenu.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Droit applicable</h2>
              <p>
                Les présentes mentions légales sont régies par le droit
                français. En cas de litige et à défaut d'accord amiable, le
                litige sera porté devant les tribunaux français conformément aux
                règles de compétence en vigueur.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Contact</h2>
              <p>
                Pour toute question relative aux mentions légales, vous pouvez
                nous contacter :
                <br />
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
