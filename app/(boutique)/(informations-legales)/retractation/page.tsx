import { PageHeader } from "@/shared/components/page-header";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Info, Mail } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Formulaire de rétractation | Synclune",
	description:
		"Formulaire type de rétractation conforme à l'article L221-5 du Code de la consommation - Exercez votre droit de rétractation dans les 14 jours",
	keywords: [
		"rétractation",
		"droit de rétractation",
		"14 jours",
		"retour commande",
		"remboursement",
		"Synclune",
	],
	alternates: {
		canonical: "/retractation",
	},
	openGraph: {
		title: "Formulaire de rétractation - Synclune",
		description:
			"Formulaire type de rétractation conforme au Code de la consommation - Droit de rétractation de 14 jours",
		url: "https://synclune.fr/retractation",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "Rétractation | Synclune",
		description: "Formulaire de rétractation - Droit de retour 14 jours",
	},
};

export default async function RetractationPage() {
  "use cache";
  cacheLife("reference"); // 24h stale, 30j expire - contenu légal change rarement
  cacheTag("legal-retractation");

  // Récupérer l'email de contact depuis les variables d'environnement
  const contactEmail = process.env.RESEND_CONTACT_EMAIL!;

  return (
    <>
      <PageHeader
        title="Formulaire de rétractation"
        description="Exercez votre droit de rétractation dans les 14 jours"
        breadcrumbs={[
          { label: "Informations légales", href: "/informations-legales" },
          { label: "Formulaire de rétractation", href: "/retractation" },
        ]}
      />

      <section className={`bg-background ${SECTION_SPACING.default}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-prose space-y-8">
            {/* Composant formulaire de rétractation */}
            <section className="space-y-8">
              {/* Information préliminaire */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Votre droit de rétractation</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>
                    Conformément à l'article L221-18 du Code de la consommation,
                    vous disposez d'un délai de{" "}
                    <strong>14 jours calendaires</strong> à compter de la
                    réception de votre commande pour exercer votre droit de
                    rétractation sans avoir à justifier de motifs ni à payer de
                    pénalité.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Le délai court à partir de la date de réception physique du
                    dernier article en cas de commande multiple.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Formulaire type */}
              <div className="bg-muted/30 border rounded-lg p-6 md:p-8 space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold m-0">
                  Formulaire type de rétractation
                </h2>

                <p className="text-sm text-muted-foreground italic">
                  Veuillez compléter et nous renvoyer le présent formulaire
                  uniquement si vous souhaitez vous rétracter du contrat.
                </p>

                <div className="bg-background border rounded-md p-6 space-y-4 text-sm">
                  <p className="font-medium">À l'attention de :</p>
                  <div className="ml-4 space-y-1">
                    <p>
                      <strong>Synclune</strong>
                    </p>
                    <p>TADDEI LEANE</p>
                    <p>77 Boulevard du Tertre</p>
                    <p>44100 Nantes</p>
                    <p>France</p>
                    <p className="flex items-center gap-2 mt-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${contactEmail}`} className="underline">
                        {contactEmail}
                      </a>
                    </p>
                  </div>

                  <div className="pt-4 border-t space-y-6">
                    <p>
                      Je/Nous (*) vous notifie/notifions (*) par la présente
                      ma/notre (*) rétractation du contrat portant sur la vente
                      du bien (*)/pour la prestation de services (*) ci-dessous
                      :
                    </p>

                    <div className="space-y-2">
                      <p>
                        <strong>Commandé le (*) :</strong>{" "}
                        <span className="inline-block min-w-[200px] border-b border-dashed border-muted-foreground/30">
                          &nbsp;
                        </span>
                      </p>
                      <p>
                        <strong>Reçu le (*) :</strong>{" "}
                        <span className="inline-block min-w-[200px] border-b border-dashed border-muted-foreground/30">
                          &nbsp;
                        </span>
                      </p>
                      <p>
                        <strong>Numéro de commande :</strong>{" "}
                        <span className="inline-block min-w-[200px] border-b border-dashed border-muted-foreground/30">
                          &nbsp;
                        </span>
                      </p>
                    </div>

                    <p>
                      <strong>Nom du (des) consommateur(s) :</strong>
                      <br />
                      <span className="inline-block w-full border-b border-dashed border-muted-foreground/30 mt-2">
                        &nbsp;
                      </span>
                    </p>

                    <p>
                      <strong>Adresse du (des) consommateur(s) :</strong>
                      <br />
                      <span className="inline-block w-full border-b border-dashed border-muted-foreground/30 mt-2">
                        &nbsp;
                      </span>
                      <br />
                      <span className="inline-block w-full border-b border-dashed border-muted-foreground/30 mt-2">
                        &nbsp;
                      </span>
                    </p>

                    <p>
                      <strong>Email :</strong>{" "}
                      <span className="inline-block min-w-[250px] border-b border-dashed border-muted-foreground/30">
                        &nbsp;
                      </span>
                    </p>

                    <p>
                      <strong>Téléphone :</strong>{" "}
                      <span className="inline-block min-w-[200px] border-b border-dashed border-muted-foreground/30">
                        &nbsp;
                      </span>
                    </p>

                    <div className="pt-4 space-y-2">
                      <p>
                        <strong>Signature du (des) consommateur(s)</strong>{" "}
                        (uniquement en cas de notification du présent formulaire
                        sur papier) :
                      </p>
                      <div className="h-20 border-b border-dashed border-muted-foreground/30" />
                    </div>

                    <p>
                      <strong>Date :</strong>{" "}
                      <span className="inline-block min-w-[200px] border-b border-dashed border-muted-foreground/30">
                        &nbsp;
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground italic pt-4">
                      (*) Rayez la mention inutile
                    </p>
                  </div>
                </div>
              </div>

              {/* Modalités de retour */}
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Modalités de retour des articles
                </h2>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>
                        <strong>Notification</strong> : Envoyez-nous ce
                        formulaire complété par email à{" "}
                        <a
                          href={`mailto:${contactEmail}`}
                          className="underline"
                        >
                          {contactEmail}
                        </a>{" "}
                        dans les 14 jours suivant la réception.
                      </li>
                      <li>
                        <strong>Confirmation</strong> : Nous vous confirmerons
                        la réception de votre demande et vous fournirons les
                        instructions pour le retour.
                      </li>
                      <li>
                        <strong>Retour des articles</strong> : Vous disposez de
                        14 jours supplémentaires après notification pour nous
                        retourner les articles. Les frais de retour sont à votre
                        charge.
                      </li>
                      <li>
                        <strong>État des articles</strong> : Les bijoux doivent
                        être retournés dans leur emballage d'origine, en parfait
                        état, non portés, avec tous les accessoires éventuels.
                      </li>
                      <li>
                        <strong>Remboursement</strong> : Nous procéderons au
                        remboursement dans un délai de 14 jours suivant la
                        réception des articles retournés, par le même moyen de
                        paiement que celui utilisé lors de l'achat.
                      </li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Exceptions */}
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Exceptions au droit de rétractation
                </h2>
                <p>
                  Conformément à l'article L221-28 du Code de la consommation,
                  le droit de rétractation ne peut être exercé pour :
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>
                    Les bijoux personnalisés ou confectionnés sur mesure selon
                    les spécifications du client
                  </li>
                  <li>
                    Les biens scellés pour des raisons d'hygiène ou de santé qui
                    ont été descellés après livraison
                  </li>
                </ul>
              </div>

              {/* Informations complémentaires */}
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Informations complémentaires
                </h2>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-3">
                  <p className="text-sm">
                    <strong>Adresse de retour :</strong>
                  </p>
                  <div className="text-sm ml-4">
                    <p>Synclune - Service Retours</p>
                    <p>77 Boulevard du Tertre</p>
                    <p>44100 Nantes</p>
                    <p>France</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Pour toute question concernant l'exercice de votre droit de
                  rétractation, n'hésitez pas à nous contacter à{" "}
                  <a href={`mailto:${contactEmail}`} className="underline">
                    {contactEmail}
                  </a>
                  . Nous nous engageons à vous répondre dans les meilleurs
                  délais.
                </p>
              </div>
            </section>

            {/* Liens utiles */}
            <section className="bg-muted/30 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Documents connexes</h3>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/cgv">Conditions Générales de Vente</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/confidentialite">
                    Politique de Confidentialité
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/personnalisation">Nous contacter</Link>
                </Button>
              </div>
            </section>

            {/* Mention légale */}
            <p className="text-xs text-muted-foreground text-center pt-8">
              Formulaire conforme à l'annexe de l'article R221-1 du Code de la
              consommation
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
