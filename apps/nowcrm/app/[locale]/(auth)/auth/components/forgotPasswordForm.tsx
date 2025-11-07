"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { useForm } from "react-hook-form";
import { FaEnvelope } from "react-icons/fa";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { onSubmitForgotPassword } from "@/lib/actions/user/forgot-password";
import { RouteConfig } from "@/lib/config/RoutesConfig";

export function ForgotPasswordForm() {
	const router = useRouter();
	const t = useMessages();

	// Make sure these translation keys exist in your messages
	const emailLabel = t.common?.labels?.email || "Email";
	const emailError = t.Auth?.Login?.form?.emailError || "Invalid email address";
	const sendLinkText =
		t.Auth?.ForgotPassword?.actions?.sendLink || "Send Reset Link";
	const rememberMeText =
		t.Auth?.ForgotPassword?.actions?.rememberMe || "Remember your password?";
	const signInText = t.Auth?.common?.signIn || "Sign In";

	const formSchema = z.object({
		email: z.string().email(emailError),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			const result = await onSubmitForgotPassword(values);

			if (result?.error) {
				console.error(`Failed to send reset email: ${result.error}`);

				// Redirect to action result page with error
				router.push(
					`/action-result?type=error&title=Password Reset Failed&description=${encodeURIComponent(result.error)}&returnUrl=${RouteConfig.auth.forgot_password}&returnText=Try Again`,
				);
			} else {
				// Redirect to action result page with success
				router.push(
					`/action-result?type=success&title=Reset Email Sent&description=${encodeURIComponent("Please check your email for a password reset link.")}&returnUrl=${RouteConfig.auth.login}&returnText=Back to Login`,
				);
			}
		} catch (error: any) {
			console.error(`Error: ${error.message}`);

			// Redirect to action result page with error
			router.push(
				`/action-result?type=error&title=Something Went Wrong&description=${encodeURIComponent(error.message)}&returnUrl=${RouteConfig.auth.forgot_password}&returnText=Try Again`,
			);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel className="flex items-center">
								<FaEnvelope className="mr-2 text-primary" /> {emailLabel}
							</FormLabel>
							<FormControl>
								<Input
									className="input-autofill-fix"
									placeholder="name@example.com"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" className="w-full">
					{sendLinkText}
				</Button>
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
				</div>
				<div className="text-center">
					<p className="text-muted-foreground text-sm">
						{rememberMeText}{" "}
						<Link
							href={RouteConfig.auth.login}
							className="font-medium text-primary hover:underline"
						>
							{signInText}
						</Link>
					</p>
				</div>
			</form>
		</Form>
	);
}
