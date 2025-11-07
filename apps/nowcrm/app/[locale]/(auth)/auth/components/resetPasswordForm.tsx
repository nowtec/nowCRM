"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMessages } from "next-intl";
import { useForm } from "react-hook-form";
import { FaLock } from "react-icons/fa";
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
import { onSubmitResetPassword } from "@/lib/actions/user/reset-password";
import { RouteConfig } from "@/lib/config/RoutesConfig";

export function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const code = searchParams.get("code");
	const t = useMessages();

	// Make sure these translation keys exist in your messages
	const newPasswordLabel = t.common?.labels?.newPassword || "New Password";
	const confirmPasswordLabel =
		t.common?.labels?.confirmPassword || "Confirm Password";
	const passwordError =
		t.Auth?.Register?.form?.passwordError ||
		"Password must be at least 6 characters";
	const passwordMatchError =
		t.Auth?.Register?.form?.passwordMatchError || "Passwords do not match";
	const resetPasswordText =
		t.Auth?.ResetPassword?.actions?.resetPassword || "Reset Password";
	const missingCodeText =
		t.Auth?.ResetPassword?.errors?.missingCode || "Reset code is missing";
	const requestNewLinkText =
		t.Auth?.ResetPassword?.actions?.requestNewLink ||
		"Request a new reset link";

	const formSchema = z
		.object({
			password: z.string().min(6, passwordError),
			passwordConfirmation: z.string().min(6),
		})
		.refine((data) => data.password === data.passwordConfirmation, {
			message: passwordMatchError,
			path: ["passwordConfirmation"],
		});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			passwordConfirmation: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		if (!code) {
			router.push(
				`${RouteConfig.action_result}?type=error&title=Missing Reset Code&description=${encodeURIComponent("The password reset code is missing. Please use the link from your email.")}&returnUrl=${RouteConfig.auth.forgot_password}&returnText=Request New Link`,
			);
			return;
		}

		try {
			const result = await onSubmitResetPassword({
				code,
				password: values.password,
				passwordConfirmation: values.passwordConfirmation,
			});

			if (result?.error) {
				console.error(`Reset password failed: ${result.error}`);

				// Redirect to action result page with error
				router.push(
					`${RouteConfig.action_result}?type=error&title=Password Reset Failed&description=${encodeURIComponent(result.error)}&returnUrl=${RouteConfig.auth.forgot_password}&returnText=Try Again`,
				);
			} else {
				// Redirect to action result page with success
				router.push(
					`${RouteConfig.action_result}?type=success&title=Password Reset Successful&description=${encodeURIComponent("Your password has been reset successfully. You can now log in with your new password.")}&returnUrl=${RouteConfig.auth.login}&returnText=Go to Login`,
				);
			}
		} catch (error: any) {
			console.error(`Error: ${error.message}`);

			// Redirect to action result page with error
			router.push(
				`${RouteConfig.action_result}?type=error&title=Something Went Wrong&description=${encodeURIComponent(error.message)}&returnUrl=${RouteConfig.auth.forgot_password}&returnText=Try Again`,
			);
		}
	}

	if (!code) {
		return (
			<div className="text-center">
				<p className="mb-4 text-red-500">{missingCodeText}</p>
				<Link
					href={RouteConfig.auth.forgot_password}
					className="font-medium text-primary hover:underline"
				>
					{requestNewLinkText}
				</Link>
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel className="flex items-center">
								<FaLock className="mr-2 text-primary" /> {newPasswordLabel}
							</FormLabel>
							<FormControl>
								<Input
									className="input-autofill-fix"
									type="password"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="passwordConfirmation"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel className="flex items-center">
								<FaLock className="mr-2 text-primary" /> {confirmPasswordLabel}
							</FormLabel>
							<FormControl>
								<Input
									className="input-autofill-fix"
									type="password"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" className="w-full">
					{resetPasswordText}
				</Button>
			</form>
		</Form>
	);
}
