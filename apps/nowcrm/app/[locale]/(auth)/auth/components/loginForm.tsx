"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaEnvelope, FaLock, FaSignInAlt } from "react-icons/fa";
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
import { RouteConfig } from "@/lib/config/RoutesConfig";

export function LoginForm() {
	const router = useRouter();
	const t = useMessages();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const formSchema = z.object({
		email: z.string().email(t.Auth.Login.form.emailError),
		password: z.string().min(1, "Password is required"),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSubmitting(true);

		try {
			const { default: toast } = await import("react-hot-toast");
			const { onSubmitLogin } = await import(
				"../../../../../lib/actions/user/sign-in-action"
			);

			const result = await onSubmitLogin(values);

			if (result?.error) {
				console.error(`${t.Auth.Login.form.loginFailed} ${result.error}`);
				toast.error(`${t.Auth.Login.form.loginFailed} ${result.error}`);
			} else if (result?.redirectTo) {
				// 2FA redirect case
				router.push(result.redirectTo);
			} else if (result?.success) {
				// Normal login success (no 2FA)
				toast.success("Login successful!");
				router.push(result.redirectTo);
			} else {
				console.error("Unknown login result", result);
				toast.error("Unexpected login response");
			}
		} catch (error: any) {
			console.error(
				"[ACTION] 3d. FAILED: The signIn() call threw an error:",
				error,
			); // 👈 ADD THIS
			const { default: toast } = await import("react-hot-toast");
			toast.error(`${t.Auth.Login.form.loginFailed} ${error.message}`);
		} finally {
			setIsSubmitting(false);
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
								<FaEnvelope className="mr-2 text-primary" />{" "}
								{t.common.labels.email}
							</FormLabel>
							<FormControl>
								<Input
									className="input-autofill-fix"
									placeholder="name@example.com"
									{...field}
									disabled={isSubmitting}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<div className="flex items-center justify-between">
								<FormLabel className="flex items-center">
									<FaLock className="mr-2 text-primary" />{" "}
									{t.common.labels.password}
								</FormLabel>
								<Link
									href={RouteConfig.auth.forgot_password}
									className="text-muted-foreground text-sm hover:text-primary"
								>
									{t.Auth.Login.form.forgotPassword}
								</Link>
							</div>
							<FormControl>
								<Input
									className="input-autofill-fix"
									type="password"
									placeholder={t.Auth.Login.form.placeholderPassword}
									{...field}
									disabled={isSubmitting}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" className="w-full" disabled={isSubmitting}>
					<FaSignInAlt className="mr-2 h-4 w-4" />
					{isSubmitting ? "Signing in..." : t.Auth.common.signIn}
				</Button>
			</form>
		</Form>
	);
}
