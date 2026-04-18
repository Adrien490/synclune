import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface PasswordChangedEmailProps {
	userName: string;
	changeDate: string;
	resetUrl: string;
}

export const PasswordChangedEmail = ({
	userName,
	changeDate,
	resetUrl,
}: PasswordChangedEmailProps) => (
	<EmailLayout preview="Mot de passe modifié">
		<Section style={{ marginBottom: "24px" }}>
			<EmailHeading level="h1">Mot de passe modifié</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Bonjour {userName}, votre mot de passe a été modifié le {changeDate}.
			</Text>
		</Section>

		<EmailCard style={{ marginBottom: "24px" }}>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{
					...EMAIL_STYLES.text.body,
					margin: 0,
					fontWeight: "600",
				}}
			>
				Ce n'était pas vous ?
			</Text>
			<Text
				className={EMAIL_CLASSES.text.secondary}
				style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}
			>
				Réinitialisez votre mot de passe immédiatement.
			</Text>
		</EmailCard>

		<EmailCTA href={resetUrl}>Réinitialiser</EmailCTA>
	</EmailLayout>
);

PasswordChangedEmail.PreviewProps = {
	userName: "Marie",
	changeDate: "15 janvier 2025 à 14:30",
	resetUrl: "https://synclune.fr/mot-de-passe-oublie",
} as PasswordChangedEmailProps;

export default PasswordChangedEmail;
