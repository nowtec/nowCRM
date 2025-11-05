"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation"; // Import useParams to obtain the current locale
import { useEffect, useLayoutEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as z from "zod";
import EmbedDrawer from "@/components/embedDrawer";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

import { findContactByToken } from "@/lib/actions/contacts/find-contact-by-unsubscribe";
// Import actions from your API
import {
	getChannels,
	getInterests,
	upsertSubscription,
} from "@/lib/actions/signup/dataFetch";

// Types for channel and interest items
interface ItemProps {
	value: number;
	label: string;
}

// Extend the schema to include first and last name
const formSchema = z.object({
	first_name: z.string().min(1, { message: "Please enter your first name" }),
	last_name: z.string().min(1, { message: "Please enter your last name" }),
	email: z.string().email({ message: "Please enter a valid email address" }),
	phone: z
		.string()
		.regex(/^(\+)?\d{1,4}([-.\s]?\d+)*$/i, {
			message: "Please enter a valid phone number",
		})
		.optional(),
	channels: z
		.array(z.number())
		.min(0, { message: "Please select at least one channel" }),
	contact_interests: z
		.array(z.number())
		.min(0, { message: "Please select at least one interest" }),
	unsubscribe_token: z.string().optional(),
	agreement: z.boolean().refine((val) => val === true, {
		message: "You must agree to the terms and conditions",
	}),
});

type FormValues = z.infer<typeof formSchema>;

interface SignUpProps {
	// The unsubscribe_token prop is retained but not processed here.
	unsubscribe_token?: string;
}

export default function SignUp({ unsubscribe_token }: SignUpProps) {
	const router = useRouter();
	const { locale } = useParams(); // Extract current locale from the URL (via the [locale] segment)
	const [loading, setLoading] = useState(false);
	const [channelValues, setChannelValues] = useState<ItemProps[]>([]);
	const [interestValues, setInterestValues] = useState<ItemProps[]>([]);
	const [currentUrl, setCurrentUrl] = useState("");

	function useIsEmbedded() {
		// Explicitly define the state type as boolean | null
		const [isEmbedded, setIsEmbedded] = useState<boolean | null>(null);

		useLayoutEffect(() => {
			let embedded = false;
			try {
				// Check if window.self is not the top window, which means it's embedded.
				embedded = window.self !== window.top;
			} catch (_error) {
				// If an error occurs (e.g., due to cross-origin restrictions), assume it's embedded.
				embedded = true;
			}
			setIsEmbedded(embedded);
		}, []);

		return isEmbedded;
	}

	// Initialize the form with extra fields for first and last name.
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			first_name: "",
			last_name: "",
			email: "",
			phone: "",
			channels: [],
			contact_interests: [],
			agreement: false,
			unsubscribe_token: "",
		},
	});

	const isEmbedded = useIsEmbedded();

	useEffect(() => {
		if (typeof window !== "undefined") {
			setCurrentUrl(window.location.href);
		}
	}, []);

	useEffect(() => {
		async function fetchInitialData() {
			try {
				console.log("Starting to fetch channels and interests...");

				// Fetch channels and interests concurrently.
				const [channels, interests] = await Promise.all([
					getChannels(),
					getInterests(),
				]);

				console.log("Channels fetched:", channels);
				console.log("Interests fetched:", interests);

				// Process channels.
				let allowedChannelIds: number[] = [];
				if (Array.isArray(channels)) {
					setChannelValues(channels);
					allowedChannelIds = channels.map((element) => element.value);
					console.log("Setting form channels with IDs:", allowedChannelIds);
					// Initially, set all allowed channels.
					form.setValue("channels", allowedChannelIds);
				} else {
					console.warn("Channels response is not an array:", channels);
				}

				// Process interests.
				let allowedInterestIds: number[] = [];
				if (Array.isArray(interests)) {
					setInterestValues(interests);
					allowedInterestIds = interests.map((element) => element.value);
					console.log("Setting form interests with IDs:", allowedInterestIds);
					// Initially, set all allowed interests.
					form.setValue("contact_interests", allowedInterestIds);
				} else {
					console.warn("Interests response is not an array:", interests);
				}

				// Check if an unsubscribe token is provided.
				if (unsubscribe_token) {
					console.log("Unsubscribe token provided:", unsubscribe_token);
					const contactData = await findContactByToken(unsubscribe_token);
					console.log("Found contact data:", contactData);

					if (contactData) {
						// Map simple text fields.
						form.setValue("first_name", contactData.first_name || "");
						form.setValue("last_name", contactData.last_name || "");
						form.setValue("email", contactData.email || "");
						form.setValue("phone", contactData.phone || "");

						// Map channels from subscriptions.
						const channelIdsFromSubscriptions = contactData.subscriptions
							? contactData.subscriptions
									.map((sub) => sub?.channel?.id)
									.filter((id): id is number => typeof id === "number")
							: [];
						console.log(
							"Channel IDs from contact subscriptions:",
							channelIdsFromSubscriptions,
						);

						// Only keep channels that exist in the allowed channels.
						const validChannelIds = channelIdsFromSubscriptions.filter((id) =>
							allowedChannelIds.includes(id),
						);
						console.log(
							"Valid channel IDs to set (intersection):",
							validChannelIds,
						);
						form.setValue("channels", validChannelIds);

						// Map interests from contact.
						const interestIdsFromContact: number[] =
							contactData.contact_interests
								? contactData.contact_interests.map((interest) => interest.id)
								: [];
						console.log("Interest IDs from contact:", interestIdsFromContact);

						// Only keep interests that exist in the allowed interests.
						const validInterestIds = interestIdsFromContact.filter((id) =>
							allowedInterestIds.includes(id),
						);
						console.log(
							"Valid interest IDs to set (intersection):",
							validInterestIds,
						);
						form.setValue("contact_interests", validInterestIds);

						form.setValue(
							"unsubscribe_token",
							contactData.unsubscribe_token || unsubscribe_token,
						);
					} else {
						console.warn("No contact data found for token:", unsubscribe_token);
					}
				}
			} catch (error) {
				console.error("Error in fetchInitialData:", error);
			}
		}

		fetchInitialData();
	}, [unsubscribe_token, form]);

	// Form submission handler that takes into account the new fields and current locale
	async function onSubmit(values: z.infer<typeof formSchema>) {
		setLoading(true);
		try {
			// Destructure the new and existing values from the form.
			const { contact_interests, channels, first_name, last_name, ...rest } =
				values;

			// Create a subscription with dynamic fields and locale-based language.
			const result = await upsertSubscription(
				{
					...rest,
					contact_interests: { connect: contact_interests },
					first_name, // Use the entered first name
					last_name, // Use the entered last name
					language: locale ? locale[0] : "en", // Use current locale from URL or default to "en"
					publishedAt: new Date(),
				},
				channels,
			);

			if (result.errorMessage) {
				toast.error(result.errorMessage);
				setLoading(false);
				return;
			}

			setLoading(false);
			toast.success("Subscription successful!");

			// Build the query parameters for redirection
			const queryParams = new URLSearchParams({
				type: "success",
				title: "Subscription Successful",
				description: "Your subscription has been confirmed",
				returnUrl: "/",
				returnText: "Return Home",
			});

			router.push(`/action-result?${queryParams.toString()}`);
		} catch (error) {
			console.error(error);
			toast.error("Error saving subscription");
			setLoading(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-md p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Subscribe now</h1>
				{isEmbedded === false && (
					<div className="flex items-center gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
								>
									<HelpCircle className="h-4 w-4" />
									<span className="sr-only">Info</span>
								</button>
							</PopoverTrigger>
							<PopoverContent className="w-80 p-3" side="top">
								<p className="text-sm">
									Either embed this form on your website or send this link to
									the user to subscribe.
								</p>
							</PopoverContent>
						</Popover>
						<EmbedDrawer pageUrl={currentUrl} />
					</div>
				)}
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{loading && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
							<Spinner size="small" />
						</div>
					)}

					{/* First Name field */}
					<FormField
						control={form.control}
						name="first_name"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-foreground">
									First Name <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										placeholder="First name"
										title="Your first name"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Last Name field */}
					<FormField
						control={form.control}
						name="last_name"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-foreground">
									Last Name <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										placeholder="Last name"
										title="Your last name"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Email field */}
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-foreground">
									Email <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										placeholder="example@gmail.com"
										title="Your email address"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Phone field */}
					<FormField
						control={form.control}
						name="phone"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-foreground">Phone number</FormLabel>
								<FormControl>
									<Input
										type="tel"
										placeholder="+49 78087991"
										title="Your phone number"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* Channels selection */}
						<div>
							<h4 className="mb-2 font-medium text-sm">Channels</h4>
							<FormField
								control={form.control}
								name="channels"
								render={() => (
									<FormItem>
										<div className="space-y-2">
											{channelValues.map((channel) => (
												<FormField
													key={channel.value}
													control={form.control}
													name="channels"
													render={({ field }) => (
														<FormItem className="flex flex-row items-start space-x-3 space-y-0">
															<FormControl>
																<Checkbox
																	checked={field.value?.includes(channel.value)}
																	onCheckedChange={(checked) =>
																		checked
																			? field.onChange([
																					...field.value,
																					channel.value,
																				])
																			: field.onChange(
																					field.value?.filter(
																						(value) => value !== channel.value,
																					),
																				)
																	}
																/>
															</FormControl>
															<FormLabel className="font-normal text-sm">
																{channel.label}
															</FormLabel>
														</FormItem>
													)}
												/>
											))}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Interests selection */}
						<div>
							<h4 className="mb-2 font-medium text-sm">Interest</h4>
							<FormField
								control={form.control}
								name="contact_interests"
								render={() => (
									<FormItem>
										<div className="space-y-2">
											{interestValues.map((interest) => (
												<FormField
													key={interest.value}
													control={form.control}
													name="contact_interests"
													render={({ field }) => (
														<FormItem className="flex flex-row items-start space-x-3 space-y-0">
															<FormControl>
																<Checkbox
																	checked={field.value?.includes(
																		interest.value,
																	)}
																	onCheckedChange={(checked) =>
																		checked
																			? field.onChange([
																					...field.value,
																					interest.value,
																				])
																			: field.onChange(
																					field.value?.filter(
																						(value) => value !== interest.value,
																					),
																				)
																	}
																/>
															</FormControl>
															<FormLabel className="font-normal text-sm">
																{interest.label}
															</FormLabel>
														</FormItem>
													)}
												/>
											))}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					{/* Agreement checkbox */}
					<FormField
						control={form.control}
						name="agreement"
						render={({ field }) => (
							<FormItem className="flex flex-row items-start space-x-3 space-y-0">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel className="font-normal text-sm">
										I agree to the{" "}
										<Link href="/policy" className="underline">
											Privacy Policy
										</Link>
									</FormLabel>
									<FormMessage />
								</div>
							</FormItem>
						)}
					/>

					<div className="flex justify-center">
						<Button type="submit" disabled={loading}>
							Submit
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
