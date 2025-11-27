import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface PasswordChangedEmailProps {
	userName: string;
	changeDate: string;
	ipAddress?: string;
	resetUrl: string;
}

export const PasswordChangedEmail = ({
	userName,
	changeDate,
	ipAddress,
	resetUrl,
}: PasswordChangedEmailProps) => (
	<Html>
		<Head />
		<Preview>Votre mot de passe a été modifié</Preview>
		<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
			<Container style={EMAIL_STYLES.container}>
				{/* Header */}
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Text
						style={{
							margin: 0,
							fontSize: "28px",
							fontWeight: "bold",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Mot de passe modifié
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
						Notification de sécurité
					</Text>
				</Section>

				<Text style={{ ...EMAIL_STYLES.text.body, marginBottom: "16px" }}>
					Bonjour {userName},
				</Text>

				{/* Success */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Changement confirmé
					</Text>
					<Text
						style={{
							margin: "8px 0 0 0",
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Votre mot de passe a été modifié avec succès le {changeDate}.
					</Text>
				</Section>

				{/* Warning */}
				<Section
					style={{
						...EMAIL_STYLES.section.card,
						marginBottom: "24px",
						border: `2px solid ${EMAIL_COLORS.states.error}40`,
						backgroundColor: `${EMAIL_COLORS.states.error}0D`,
					}}
				>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Vous n'êtes pas à l'origine de ce changement ?
					</Text>
					<Text
						style={{
							margin: "12px 0",
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Si vous n'avez pas modifié votre mot de passe, réinitialisez-le
						immédiatement et contactez moi !
					</Text>

					{/* CTA */}
					<Section style={{ textAlign: "center" }}>
						<Button
							href={resetUrl}
							style={{
								...EMAIL_STYLES.button.primary,
								backgroundColor: EMAIL_COLORS.states.error,
							}}
						>
							Réinitialiser immédiatement
						</Button>
					</Section>
				</Section>

				{/* Info */}
				<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "32px" }}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							lineHeight: "1.6",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Si vous avez modifié votre mot de passe vous-même, vous pouvez
						ignorer cet email. Cette notification est envoyée automatiquement
						pour protéger votre compte.
					</Text>
				</Section>

				{/* Signature */}
				<Section
					style={{
						marginTop: "32px",
						paddingTop: "24px",
						borderTop: `1px solid ${EMAIL_COLORS.border}`,
						textAlign: "center",
					}}
				>
					<Text
						style={{
							margin: 0,
							fontSize: "16px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						Synclune
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "4px" }}>
						Créations artisanales
					</Text>
				</Section>
			</Container>
		</Body>
	</Html>
);

PasswordChangedEmail.PreviewProps = {
	userName: "Marie Dupont",
	changeDate: "15 janvier 2025 à 14:30",
	ipAddress: "192.168.1.1",
	resetUrl: "https://synclune.com/mot-de-passe-oublie",
} as PasswordChangedEmailProps;

export default PasswordChangedEmail;
