"use client";

import { useRouter } from "next/navigation";
import { useMessages } from "next-intl";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { createComposition } from "@/lib/actions/composer/create-composition";
import { createCompositionFull } from "@/lib/actions/composer/createCompositionFull";
import { RouteConfig } from "@/lib/config/RoutesConfig";
import type { CompositionModelKeys } from "@/lib/static/compoisitonModels";
import type { LanguageKeys } from "@/lib/static/languages";
import type { ReferenceComposition } from "@/lib/types/new_type/composition";
import ChannelAdditions from "./steps/channel-additions";
import InitialForm from "./steps/initial-form";
import ProcessingScreen from "./steps/processing-screen";
import TextEditor from "./steps/text-editor";

export type ChannelCustomization = {
	channel: string;
	additional_prompt: string;
	selected: boolean;
};

interface Props {
	channels: { value: string; label: string }[];
}

export default function CreateCompositionCard({ channels }: Props) {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [compositionData, setCompositionData] =
		useState<ReferenceComposition | null>(null);
	const [generatedHtml, setGeneratedHtml] = useState<string>("");
	const [channelCustomizations, setChannelCustomizations] = useState<
		ChannelCustomization[]
	>([]);
	const [includeUnsubscribe, setIncludeUnsubscribe] = useState<boolean>(false);
	const t = useMessages().Composer;

	const totalSteps = 4;
	const progressWidth = `calc((100% / ${totalSteps - 1}) * ${step - 1})`;

	// Update the handleStepChange function to properly handle navigation between steps
	const handleStepChange = (newStep: number) => {
		// Allow going to any previous step without data validation
		// This ensures we can always navigate back
		if (newStep < step) {
			setStep(newStep);
			return;
		}

		// For forward navigation, validate required data
		if (newStep > 1 && !compositionData) {
			toast.error(t.errors.step1Required);
			return; // Can't go past step 1 without composition data
		}

		if (newStep > 2 && !generatedHtml) {
			toast.error(t.errors.step2Required);
			return; // Can't go past step 2 without generated HTML
		}

		// Allow going to the next step only
		if (newStep === step + 1) {
			setStep(newStep);
		}
	};

	// Update the handleInitialSubmit function to preserve existing HTML when going back to step 1
	const handleInitialSubmit = async (data: ReferenceComposition) => {
		const { createReference } = await import(
			"@/lib/actions/composer/create-reference"
		);
		// Store the form data
		setCompositionData(data);
		// Move to step 2 immediately
		setStep(2);

		// Only generate new HTML if we don't already have it or if the prompt has changed
		const shouldRegenerateContent =
			!generatedHtml ||
			(compositionData && compositionData.prompt !== data.prompt);

		if (shouldRegenerateContent) {
			setGeneratedHtml("");
			try {
				const result = await createReference({
					model: data.model,
					prompt: data.prompt,
				});

				if (!result.data || !result.success) {
					toast.error(result.errorMessage as string);
					setGeneratedHtml(result.errorMessage as string);
					return;
				}
				setGeneratedHtml(result.data.result);
			} catch (error) {
				console.error("Error generating content:", error);
				toast.error(t.errors.generateFailed);
			}
		}
	};

	const handleRegenerate = async (data: ReferenceComposition) => {
		if (!compositionData) return;
		const { createReference } = await import(
			"@/lib/actions/composer/create-reference"
		);
		try {
			const result = await createReference(data);
			if (!result.data || !result.success) {
				return;
			}
			setGeneratedHtml(result.data.result);
		} catch (error) {
			console.error("Error regenerating content:", error);
		}
	};

	const handleChannelCustomizationsSubmit = (
		customizations: ChannelCustomization[],
	) => {
		// Store the customizations (can be empty array if user skipped)
		setChannelCustomizations(customizations);
		setStep(4);
	};

	const handleSubmitComposition = async (): Promise<string | null> => {
		try {
			const submitObject = {
				name: compositionData?.title as string,
				subject: compositionData?.subject as string,
				category: compositionData?.category as string,
				language: compositionData?.language as LanguageKeys,
				mainChannel: compositionData?.mainChannel as number,
				persona: compositionData?.persona as string,
				model: compositionData?.model as CompositionModelKeys,
				add_unsubscribe: includeUnsubscribe,
				reference_prompt: compositionData?.prompt as string,
				reference_result: generatedHtml as string,
				composition_items: channelCustomizations.map((item) => ({
					channel: Number.parseInt(item.channel),
					additional_prompt: item.additional_prompt,
				})),
			};
			const res = await createCompositionFull(submitObject);
			if (!res.success || !res.data) {
				toast.error(t.errors.submitFailed);
				return null;
			}
			return res.data;
		} catch (error) {
			console.error("Error submitting composition:", error);
			toast.error(t.errors.submitFailed);
			return null;
		}
	};

	const handleCreateFromScratch = async () => {
		// This function would handle any logic needed before redirecting
		try {
			const res = await createComposition({
				name: t.scratch.name,
				subject: t.scratch.name,
				status: "Finished",
				publishedAt: new Date(),
			});
			if (!res.data || !res.success) {
				toast.error(res.errorMessage as string);
			} else {
				router.push(RouteConfig.composer.single(res.data.id));
			}
		} catch (error) {
			console.error("Error creating from scratch:", error);
			toast.error(t.errors.createScratchFailed);
		}
	};

	return (
		<main className=" py-4">
			<Card className="mx-auto max-w-6xl p-6">
				<div className="mx-auto mb-6 w-full max-w-5xl space-y-4">
					<div className="grid grid-cols-4 text-center">
						{[1, 2, 3, 4].map((stepNumber) => (
							<button
								type="button"
								key={stepNumber}
								onClick={() => handleStepChange(stepNumber)}
								className={`flex flex-col items-center ${step === stepNumber ? "text-primary" : "text-muted-foreground"}`}
							>
								<div
									className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full ${step === stepNumber ? "bg-primary text-primary-foreground" : "bg-muted"}`}
								>
									{stepNumber}
								</div>
								<span className="text-xs">
									{t.steps.label} {stepNumber}{" "}
								</span>
							</button>
						))}
					</div>

					<div className="relative h-2 rounded-full bg-muted">
						<div
							className="absolute top-0 left-0 h-2 rounded-full bg-primary transition-all duration-300"
							style={{ width: progressWidth }}
						/>
					</div>
				</div>

				{step === 1 && (
					<InitialForm
						onSubmit={handleInitialSubmit}
						channels={channels}
						initialData={compositionData}
						onCreateFromScratch={handleCreateFromScratch}
					/>
				)}

				{step === 2 && (
					<TextEditor
						html={generatedHtml}
						onChange={setGeneratedHtml}
						onRegenerate={handleRegenerate}
						composition={compositionData as ReferenceComposition}
						onNext={() => setStep(3)}
						onBack={() => setStep(1)}
						includeUnsubscribe={includeUnsubscribe}
						setIncludeUnsubscribe={setIncludeUnsubscribe}
					/>
				)}

				{step === 3 && (
					<ChannelAdditions
						onSubmit={handleChannelCustomizationsSubmit}
						onBack={() => setStep(2)}
						channels={channels}
						initialChannelCustomizations={channelCustomizations}
						mainChannel={compositionData?.mainChannel}
					/>
				)}

				{step === 4 && (
					<ProcessingScreen
						onSubmit={handleSubmitComposition}
						onBack={() => setStep(3)}
					/>
				)}
			</Card>
		</main>
	);
}
