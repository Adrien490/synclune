import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface RevertShippingNotificationEmailProps {
	orderNumber: string;
	customerName: string;
	reason: string;
	orderDetailsUrl: string;
}

export const RevertShippingNotificationEmail = ({
	orderNumber,
	customerName,
	reason,
	orderDetailsUrl,
}: RevertShippingNotificationEmailProps) => {
	return (
		<EmailLayout preview={`Mise à jour de l'expédition - ${orderNumber}`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Expédition mise à jour</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, le précédent numéro de suivi de votre commande {orderNumber} n'est
					plus valide. Votre commande est de nouveau en préparation.
				</Text>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailCard>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, fontWeight: "600" }}
					>
						Motif
					</Text>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{
							margin: 0,
							marginTop: "4px",
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{reason}
					</Text>
				</EmailCard>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Vous recevrez un nouvel email avec les informations de suivi dès que le colis sera
					réexpédié.
				</Text>
			</EmailCard>

			<EmailCTA href={orderDetailsUrl}>Suivre ma commande</EmailCTA>
		</EmailLayout>
	);
};

RevertShippingNotificationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	reason: "Erreur d'étiquetage du transporteur",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RevertShippingNotificationEmailProps;

export default RevertShippingNotificationEmail;
