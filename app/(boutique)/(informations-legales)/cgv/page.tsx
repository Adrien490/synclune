import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Conditions Générales de Vente | Synclune",
	description:
		"Conditions générales de vente de Synclune - Bijouterie artisanale en ligne. CGV, livraison, retours et garanties",
	keywords: [
		"CGV",
		"conditions générales de vente",
		"livraison bijoux",
		"retours",
		"garanties",
		"Synclune",
	],
	alternates: {
		canonical: "/cgv",
	},
	openGraph: {
		title: "Conditions Générales de Vente - Synclune",
		description:
			"Conditions générales de vente de Synclune - Bijouterie artisanale en ligne",
		url: "https://synclune.fr/cgv",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "CGV | Synclune",
		description: "Conditions générales de vente - Bijouterie artisanale",
	},
};

export default async function CGVPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
  cacheTag("legal-terms");

  // Récupérer l'URL du site depuis les variables d'environnement
  const siteUrl = process.env.BETTER_AUTH_URL!;
  const contactEmail = process.env.RESEND_CONTACT_EMAIL!;

  return (
    <>
      <PageHeader
        title="Conditions Générales de Vente"
        description="Conditions régissant les ventes de bijoux artisanaux réalisées par Synclune"
        breadcrumbs={[{ label: "CGV", href: "/cgv" }]}
      />

      <section className={`bg-background ${SECTION_SPACING.default}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                1. Objet et champ d'application
              </h2>
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent les
                ventes de bijoux artisanaux réalisées par{" "}
                <strong>Synclune</strong> via le site internet{" "}
                <a href={siteUrl} className="underline">
                  {siteUrl.replace(/^https?:\/\//, "")}
                </a>
                .
              </p>
              <p>
                Toute commande implique l'acceptation sans réserve des présentes
                CGV qui prévalent sur tout autre document.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">2. Produits</h2>
              <h3 className="text-lg sm:text-xl font-medium">2.1 Caractéristiques</h3>
              <p>
                Les produits proposés sont des bijoux artisanaux fabriqués à la
                main. Les caractéristiques essentielles de chaque produit sont
                présentées sur la fiche produit (matériaux, dimensions, poids,
                couleurs).
              </p>
              <p>
                Les photographies sont non contractuelles. Des variations
                mineures peuvent exister entre les photos et le produit final,
                liées à la nature artisanale de la fabrication.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">2.2 Disponibilité</h3>
              <p>
                Nos offres sont valables tant qu'elles sont visibles sur le
                site, dans la limite des stocks disponibles. En cas
                d'indisponibilité d'un produit après passation de la commande,
                le client en sera informé dans les meilleurs délais et pourra
                obtenir le remboursement des sommes versées.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">3. Prix</h2>
              <p>
                Les prix de nos produits sont indiqués en{" "}
                <strong>euros (EUR)</strong>, TVA non applicable (art. 293 B du
                CGI - régime micro-entreprise).
              </p>
              <p>
                Les frais de livraison sont indiqués avant la validation finale
                de la commande. Le montant total à payer, incluant les frais de
                port, est récapitulé dans le panier.
              </p>
              <p>
                Synclune se réserve le droit de modifier ses prix à tout moment,
                étant entendu que le prix figurant au catalogue le jour de la
                commande sera le seul applicable au client.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                4. Commande et paiement
              </h2>
              <h3 className="text-lg sm:text-xl font-medium">4.1 Processus de commande</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Sélection du(des) produit(s) et ajout au panier</li>
                <li>Vérification du panier et validation</li>
                <li>Saisie des informations de livraison</li>
                <li>Choix du mode de paiement</li>
                <li>Vérification et confirmation de la commande</li>
              </ol>

              <h3 className="text-lg sm:text-xl font-medium">4.2 Paiement</h3>
              <p>
                Le paiement est effectué par <strong>carte bancaire</strong> via
                notre prestataire de paiement sécurisé <strong>Stripe</strong>.
                La commande n'est validée qu'après confirmation du paiement.
              </p>
              <p>
                Aucune information bancaire ne transite par nos serveurs. Le
                paiement est entièrement sécurisé (norme PCI-DSS niveau 1).
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                4.3 Confirmation de commande
              </h3>
              <p>
                Un email de confirmation est envoyé automatiquement après
                validation du paiement, récapitulant les détails de la commande.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">5. Livraison</h2>
              <h3 className="text-lg sm:text-xl font-medium">5.1 Zone de livraison</h3>
              <p>
                Les livraisons sont effectuées en{" "}
                <strong>France métropolitaine et Union Européenne</strong>.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                5.2 Transporteur et délais
              </h3>
              <p>
                Les livraisons sont assurées par <strong>Colissimo</strong> (La
                Poste). Les délais de livraison sont communiqués à titre
                indicatif lors de la commande et varient généralement entre{" "}
                <strong>2 à 3 jours ouvrés pour la France</strong> et{" "}
                <strong>4 à 7 jours ouvrés pour l'Union Européenne</strong>{" "}
                après confirmation de paiement.
              </p>
              <p>
                Conformément à l'article L216-1 du Code de la consommation, à
                défaut de délai convenu, le vendeur livre le bien dans un
                délai maximal de <strong>30 jours</strong> suivant la commande.
                En cas de dépassement de ce délai, le client peut annuler sa
                commande et obtenir le remboursement intégral des sommes
                versées.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                5.3 Transfert des risques
              </h3>
              <p>
                Conformément à l'article L216-4 du Code de la consommation, le
                risque de perte ou d'endommagement des biens est transféré au
                client au moment où celui-ci, ou un tiers désigné par lui,
                prend physiquement possession des biens.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">5.4 Modalités</h3>
              <p>
                La livraison est effectuée à l'adresse indiquée lors de la
                commande. Il appartient au client de vérifier l'exactitude de
                l'adresse renseignée.
              </p>
              <p>
                En cas d'absence lors de la livraison, un avis de passage sera
                laissé permettant de récupérer le colis au bureau de poste le
                plus proche ou en point de retrait Colissimo.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                6. Droit de rétractation
              </h2>
              <p>
                Conformément à l'article L221-18 du Code de la consommation, le
                client dispose d'un
                <strong> délai de 14 jours calendaires</strong> à compter de la
                réception du produit pour exercer son droit de rétractation sans
                avoir à justifier de motifs ni à payer de pénalité.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                6.1 Formulaire de rétractation
              </h3>
              <p>
                Vous pouvez utiliser le{" "}
                <Link href="/retractation" className="underline font-medium">
                  formulaire type de rétractation
                </Link>{" "}
                mis à votre disposition, bien que cela ne soit pas obligatoire.
                Vous pouvez également nous notifier votre décision par tout
                autre moyen écrit (email, courrier).
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                6.2 Exercice du droit de rétractation
              </h3>
              <p>
                Pour exercer ce droit, vous devez nous notifier votre décision
                par email à{" "}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>{" "}
                ou par courrier postal à l'adresse :
              </p>
              <div className="ml-4 text-sm">
                <p>Synclune - Service Rétractation</p>
                <p>77 Boulevard du Tertre</p>
                <p>44100 Nantes, France</p>
              </div>

              <h3 className="text-lg sm:text-xl font-medium">6.3 Retour des produits</h3>
              <p>
                Vous disposez d'un délai de <strong>14 jours</strong> à compter
                de la notification de votre décision de rétractation pour nous
                retourner les produits.
              </p>
              <p>
                Les produits doivent être retournés dans leur emballage
                d'origine, en parfait état, non portés, accompagnés de tous les
                accessoires éventuels. Les frais de retour sont à votre charge.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">6.4 Remboursement</h3>
              <p>
                Nous procéderons au remboursement de la totalité des sommes
                versées, <strong>y compris les frais de livraison initiaux</strong>{" "}
                (correspondant au mode de livraison standard), dans un délai
                de <strong>14 jours</strong> suivant la réception du produit
                retourné ou la preuve d'expédition, conformément à l'article
                L221-24 du Code de la consommation. Le remboursement est
                effectué par le même moyen de paiement que celui utilisé lors
                de l'achat, sauf accord exprès de votre part pour un autre
                moyen de paiement.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">6.5 Exceptions</h3>
              <p>
                Conformément à l'article L221-28 du Code de la consommation, le
                droit de rétractation ne s'applique pas aux bijoux personnalisés
                ou confectionnés sur mesure selon vos spécifications.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">7. Garanties légales</h2>

              <h3 className="text-lg sm:text-xl font-medium">
                7.1 Garantie légale de conformité
              </h3>
              <p>
                Conformément aux articles L217-1 à L217-32 du Code de la
                consommation, vous bénéficiez d'une garantie légale de
                conformité de <strong>24 mois</strong> à compter de la
                délivrance du bien.
              </p>
              <p>
                Durant cette période, tout défaut de conformité est présumé
                exister au moment de la délivrance du bien, sauf preuve
                contraire. Le consommateur est dispensé de rapporter cette
                preuve.
              </p>
              <p>
                Le bien est conforme au contrat s'il répond notamment aux
                critères suivants :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Il correspond à la description, au type, à la quantité et à la
                  qualité annoncés
                </li>
                <li>
                  Il est propre à l'usage habituellement attendu d'un bien de
                  même type
                </li>
                <li>
                  Il présente les qualités qu'un acheteur peut légitimement
                  attendre
                </li>
              </ul>
              <p>
                En cas de défaut de conformité, vous bénéficiez du choix entre
                la réparation et le remplacement du bien. Si la mise en
                conformité est impossible ou disproportionnée, vous pouvez
                demander une réduction du prix ou la résolution du contrat avec
                remboursement intégral.
              </p>
              <div className="bg-muted/30 p-4 rounded-lg text-sm border">
                <p className="font-medium mb-2">
                  Extraits du Code de la consommation :
                </p>
                <p className="italic mb-2">
                  <strong>Article L217-3</strong> : "Le vendeur délivre un
                  bien conforme au contrat ainsi qu'aux critères énoncés à
                  l'article L. 217-5. Il répond des défauts de conformité
                  existant au moment de la délivrance du bien [...], ainsi que
                  des défauts de conformité résultant de l'emballage, des
                  instructions de montage, ou de l'installation lorsque
                  celle-ci a été mise à sa charge par le contrat ou a été
                  réalisée sous sa responsabilité."
                </p>
                <p className="italic">
                  <strong>Article L217-5</strong> : "Le bien est conforme au
                  contrat s'il répond notamment, le cas échéant, aux critères
                  suivants : 1° Il correspond à la description, au type, à la
                  quantité et à la qualité, notamment en ce qui concerne la
                  fonctionnalité, la compatibilité, l'interopérabilité, ou
                  toute autre caractéristique prévues au contrat..."
                </p>
              </div>

              <h3 className="text-lg sm:text-xl font-medium mt-6">
                7.2 Garantie légale des vices cachés
              </h3>
              <p>
                Conformément aux articles 1641 à 1649 du Code civil, vous
                bénéficiez également de la garantie légale contre les vices
                cachés. Cette garantie s'applique aux défauts cachés (non
                apparents lors de l'achat), graves (rendant le produit impropre
                à l'usage) et antérieurs à la vente.
              </p>
              <p>
                Vous disposez d'un délai de{" "}
                <strong>2 ans à partir de la découverte du vice</strong> pour
                agir, dans la limite de 20 ans après l'achat. Vous devez
                rapporter la preuve de l'existence du vice caché.
              </p>
              <p>Vous avez le choix entre :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Rendre le produit et se faire rembourser intégralement</li>
                <li>Garder le produit et se faire rembourser partiellement</li>
              </ul>
              <div className="bg-muted/30 p-4 rounded-lg text-sm border">
                <p className="font-medium mb-2">Extraits du Code civil :</p>
                <p className="italic mb-2">
                  <strong>Article 1641</strong> : "Le vendeur est tenu de la
                  garantie à raison des défauts cachés de la chose vendue qui la
                  rendent impropre à l'usage auquel on la destine, ou qui
                  diminuent tellement cet usage que l'acheteur ne l'aurait pas
                  acquise, ou n'en aurait donné qu'un moindre prix, s'il les
                  avait connus."
                </p>
                <p className="italic">
                  <strong>Article 1648 alinéa 1</strong> : "L'action résultant
                  des vices rédhibitoires doit être intentée par l'acquéreur
                  dans un délai de deux ans à compter de la découverte du vice."
                </p>
              </div>

              <h3 className="text-lg sm:text-xl font-medium mt-6">
                7.3 Mise en œuvre des garanties
              </h3>
              <p>
                Pour toute réclamation au titre des garanties légales,
                contactez-nous à{" "}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>{" "}
                en précisant le numéro de commande et la nature du défaut
                constaté.
              </p>
              <p className="text-sm text-muted-foreground">
                Les garanties légales s'appliquent indépendamment de toute
                garantie commerciale éventuellement consentie par le vendeur.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">8. Responsabilité</h2>
              <p>
                Synclune ne saurait être tenue responsable de l'inexécution du
                contrat en cas de :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Rupture de stock ou indisponibilité du produit</li>
                <li>Force majeure (catastrophe naturelle, grève, etc.)</li>
                <li>
                  Erreur dans l'adresse de livraison fournie par le client
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                9. Propriété intellectuelle
              </h2>
              <p>
                Tous les éléments du site {siteUrl.replace(/^https?:\/\//, "")}{" "}
                (photos, textes, logo, design) sont la propriété exclusive de
                Synclune. Toute reproduction, même partielle, est strictement
                interdite sans autorisation préalable.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                10. Données personnelles
              </h2>
              <p>
                Les données collectées sont nécessaires au traitement de votre
                commande. Pour en savoir plus sur la gestion de vos données
                personnelles, consultez notre{" "}
                <Link href="/confidentialite" className="underline">
                  Politique de Confidentialité
                </Link>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">
                11. Règlement des litiges et médiation
              </h2>

              <h3 className="text-lg sm:text-xl font-medium">11.1 Règlement amiable</h3>
              <p>
                En cas de litige, nous nous engageons à rechercher une solution
                amiable avant toute action judiciaire. Vous pouvez nous
                contacter directement à{" "}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>{" "}
                pour toute réclamation.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                11.2 Médiation de la consommation
              </h3>
              <p>
                Conformément à l'article L612-1 du Code de la consommation, en
                cas d'échec de notre tentative de règlement amiable, vous avez
                la possibilité de recourir <strong>gratuitement</strong> à un
                médiateur de la consommation en vue de la résolution amiable du
                litige.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <p className="font-medium mb-3">
                  Coordonnées de notre médiateur :
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>CNPM - MÉDIATION DE LA CONSOMMATION</strong>
                  </p>
                  <p>
                    Centre National de la Médiation des Professions et des
                    Métiers
                  </p>
                  <p>27 avenue de la Libération</p>
                  <p>42400 Saint-Chamond</p>
                  <p>France</p>
                  <p className="mt-2">
                    <strong>Site internet :</strong>{" "}
                    <a
                      href="https://cnpm-mediation-consommation.eu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      cnpm-mediation-consommation.eu
                    </a>
                  </p>
                  <p>
                    <strong>Email :</strong>{" "}
                    <a
                      href="mailto:contact@cnpm-mediation-consommation.eu"
                      className="underline"
                    >
                      contact@cnpm-mediation-consommation.eu
                    </a>
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Le recours à la médiation est gratuit pour le consommateur. Le
                médiateur doit être saisi dans un délai maximum d'un an à
                compter de votre réclamation écrite auprès de Synclune. La
                médiation n'est pas obligatoire mais constitue une alternative
                au recours judiciaire.
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                11.3 Résolution en ligne des litiges
              </h3>
              <p>
                Conformément au Règlement européen n°524/2013, la Commission
                Européenne met à disposition une plateforme de résolution en
                ligne des litiges :{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
                .
              </p>
              <p>
                Notre adresse email pour les réclamations :{" "}
                <a href={`mailto:${contactEmail}`} className="underline">
                  {contactEmail}
                </a>
                .
              </p>

              <h3 className="text-lg sm:text-xl font-medium">
                11.4 Droit applicable et juridiction
              </h3>
              <p>
                Les présentes CGV sont régies par le droit français. À défaut de
                résolution amiable ou par médiation, les tribunaux français
                seront seuls compétents pour connaître de tout litige relatif
                aux présentes conditions générales de vente et à l'exécution du
                contrat de vente.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">12. Contact</h2>
              <p>
                Pour toute question relative aux présentes CGV, vous pouvez nous
                contacter :
              </p>
              <ul className="list-none space-y-2 ml-4">
                <li>
                  <strong>Email :</strong>{" "}
                  <a href={`mailto:${contactEmail}`} className="underline">
                    {contactEmail}
                  </a>
                </li>
                <li>
                  <strong>Site internet :</strong>{" "}
                  <a href={siteUrl} className="underline">
                    {siteUrl.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              </ul>
            </section>

            <p className="text-xs text-muted-foreground text-center pt-8 italic">
              Dernière mise à jour : 13 février 2026
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
