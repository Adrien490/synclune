import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
			<EmailHeading level="h1">Changement d'adresse email</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Vous avez demandé à changer votre adresse email pour <strong>{newEmail}</strong>. Cliquez
				sur le bouton ci-dessous pour confirmer ce changement.
			</Text>
		</Section>

		<EmailCTA href={confirmationUrl} marginBottom="24px">
			Confirmer mon nouvel email
		</EmailCTA>

		<EmailCard style={{ marginBottom: "32px" }}>
			<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
				Ce lien expire dans 1 heure. Si vous n'avez pas demandé ce changement, ignorez cet email.
				Votre adresse actuelle reste inchangée.
			</Text>
		</EmailCard>
	</EmailLayout>
);

EmailChangeConfirmationEmail.PreviewProps = {
	confirmationUrl: "https://synclune.fr/api/auth/change-email?token=abc123",
	newEmail: "nouvelle@adresse.com",
} as EmailChangeConfirmationEmailProps;

export default EmailChangeConfirmationEmail;
