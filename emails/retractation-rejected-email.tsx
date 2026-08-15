import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface RetractationRejectedEmailProps {
	orderNumber: string;
	customerName: string;
	/** Motif du rejet, rédigé par l'admin — toujours présent (champ requis). */
	rejectionReason: string;
}

/**
 * Information de rejet d'une demande de rétractation (hors délai, bijou
 * personnalisé/sur-mesure — art. L221-28 3°…). Le motif est humain, jamais
 * automatique.
 */
export const RetractationRejectedEmail = ({
	orderNumber,
	customerName,
	rejectionReason,
}: RetractationRejectedEmailProps) => {
	return (
		<EmailLayout preview={`Votre demande de rétractation — commande ${orderNumber}`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Votre demande de rétractation</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, après examen, votre demande de rétractation pour la commande{" "}
					{orderNumber} ne peut pas être acceptée.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.body} style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
					{rejectionReason}
				</Text>
			</EmailCard>

			<Section>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, ou pour toute question, répondez
					simplement à cet email — nous trouverons une solution ensemble.
				</Text>
			</Section>
		</EmailLayout>
	);
};

RetractationRejectedEmail.PreviewProps = {
	orderNumber: "n° 12",
	customerName: "Marie",
	rejectionReason:
		"La demande a été faite plus de 14 jours après la réception de la commande (article L221-18 du Code de la consommation).",
} as RetractationRejectedEmailProps;

export default RetractationRejectedEmail;
