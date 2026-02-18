// contactsapp/app/[locale]/layout.tsx

import "./globals.css";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import SetTimezoneCookie from "@/hooks/set-timezone";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/config/env-config";
import { ThemeProvider } from "../providers/theme-provider";
import { ToastProvider } from "../providers/toast-provider";

export default async function RootLayout(props: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const params = await props.params;

	const { locale } = params;

	const { children } = props;

	// Ensure that the incoming `locale` is valid
	if (!routing.locales.includes(locale as any)) {
		notFound();
	}

	// Providing all messages to the client
	// side is the easiest way to get started
	const messages = await getMessages();
	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<SetTimezoneCookie />
				<ToastProvider test_run={env.TEST_RUN} />
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<NextIntlClientProvider messages={messages}>
						{/* @ts-ignore */}
						{children}
					</NextIntlClientProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
