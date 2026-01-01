export async function CopyrightYear() {
	"use cache"
	return <>{new Date().getFullYear()}</>
}
