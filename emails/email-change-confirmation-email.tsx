import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface EmailChangeConfirmationEmailProps {
	confirmationUrl: string;
	newEmail: string;
}

export const EmailChangeConfirmationEmail = ({
	confirmationUrl,
	newEmail,
}: EmailChangeConfirmationEmailProps) => (
	<EmailLayout preview="Confirmez votre nouvelle adresse email">
		<Section style={{ marginBottom: "24px" }}>
			<Text style={EMAIL_STYLES.heading.h2}>Changement d&apos;adresse email</Text>
			<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
				Vous avez demandé à changer votre adresse email pour <strong>{newEmail}</strong>. Cliquez
				sur le bouton ci-dessous pour confirmer ce changement.
			</Text>
		</Section>

		<Section style={{ marginBottom: "24px", textAlign: "center" }}>
			<Button href={confirmationUrl} style={EMAIL_STYLES.button.primary}>
				Confirmer mon nouvel email
			</Button>
		</Section>

		<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
			<Text style={EMAIL_STYLES.text.small}>
				Si vous n&apos;avez pas demandé ce changement, ignorez cet email. Votre adresse actuelle
				reste inchangée.
			</Text>
		</Section>
	</EmailLayout>
);

EmailChangeConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/api/auth/change-email?token=abc123",
	newEmail: "nouvelle@adresse.com",
} as EmailChangeConfirmationEmailProps;

export default EmailChangeConfirmationEmail;
