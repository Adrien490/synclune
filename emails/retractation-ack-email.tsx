import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface RetractationAckEmailProps {
	orderNumber: string;
	customerName: string;
	/** Motif fourni par la cliente — null si non renseigné (optionnel). */
	reason: string | null;
	/** Lien de suivi tokenisé — où la cliente verra avancer sa demande. */
	orderTrackingUrl?: string | null;
}

/**
 * Accusé de réception de la demande de rétractation — envoyé SANS DÉLAI
 * (obligation légale de la rétractation en ligne, 19 juin 2026).
 */
export const RetractationAckEmail = ({
	orderNumber,
	customerName,
	reason,
	orderTrackingUrl,
}: RetractationAckEmailProps) => {
	return (
		<EmailLayout preview={`Demande de rétractation reçue — commande ${orderNumber}`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Demande bien reçue</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre demande de rétractation pour la commande {orderNumber} est
					enregistrée — cet email en est l&apos;accusé de réception.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.body} style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
					La marche à suivre : renvoyez votre commande à l&apos;adresse indiquée dans nos conditions
					générales de vente. Le remboursement intervient au plus tard 14 jours après votre demande,
					une fois le retour reçu.
				</Text>
				{reason && (
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "12px" }}
					>
						Motif transmis : « {reason} »
					</Text>
				)}
			</EmailCard>

			{orderTrackingUrl && <EmailCTA href={orderTrackingUrl}>Suivre ma demande</EmailCTA>}

			<Section>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Une question ? Répondez simplement à cet email.
				</Text>
			</Section>
		</EmailLayout>
	);
};

RetractationAckEmail.PreviewProps = {
	orderNumber: "n° 12",
	customerName: "Marie",
	reason: "La bague est trop grande",
	orderTrackingUrl:
		"https://synclune.fr/suivi-commande?commande=k3x9m2p8q1r5s7t0&token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
} as RetractationAckEmailProps;

export default RetractationAckEmail;
