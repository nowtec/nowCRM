"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import { AsyncSelectField } from "@/components/autoComplete/asyncSelectField";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createSurveyItem } from "@/lib/actions/surveyItems/create-survey-items";
import { DocumentId } from "@nowcrm/services";

const formSchema = z.object({
	question: z.object({
		label: z.string(),
		value: z.union([z.string(), z.number()]),
	}),
	answer: z
		.string()
		.min(2, { message: "Answer must be at least 2 characters." }),
});

export default function CreateSurveyItemDialog() {
	const router = useRouter();
	const [openDialog, setOpenDialog] = React.useState(false);
	const params = useParams<{ id: DocumentId }>();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			answer: "",
		},
	});

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const finalValues = {
			...values,
			question: values.question.label,
			survey: (params.id),
		};

		const res = await createSurveyItem(finalValues);
		if (!res.success) {
			toast.error(`Error creating survey item: ${res.errorMessage}`);
		} else {
			toast.success("Survey item created");
			router.refresh();
			form.reset();
			setOpenDialog(false);
		}
	};

	return (
		<Dialog open={openDialog} onOpenChange={setOpenDialog}>
			<DialogTrigger asChild>
				<Button size="sm" className="ml-2 hidden h-8 lg:flex">
					<GrAddCircle className="mr-2 h-4 w-4" />
					Add Survey Item
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create Survey Item</DialogTitle>
					<DialogDescription>
						Add a new question and answer to your survey.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<AsyncSelectField
							name="question"
							label="Survey Question"
							serviceName="formItemsService"
							form={form}
							useFormClear={false}
							filter={{ form: Number(params.id) }}
						/>
						<FormField
							control={form.control}
							name="answer"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input placeholder="Answer..." {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full">
							<GrAddCircle className="mr-2 h-4 w-4" />
							Create Item
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
