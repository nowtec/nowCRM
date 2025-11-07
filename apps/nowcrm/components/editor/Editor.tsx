"use client";
import "reactjs-tiptap-editor/style.css";
import "react-image-crop/dist/ReactCrop.css";

import RichTextEditor, { BaseKit } from "reactjs-tiptap-editor";
import { Blockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold } from "reactjs-tiptap-editor/bold";
import { BulletList } from "reactjs-tiptap-editor/bulletlist";
import { Clear } from "reactjs-tiptap-editor/clear";
import { Code } from "reactjs-tiptap-editor/code";
import { Color } from "reactjs-tiptap-editor/color";
import { Emoji } from "reactjs-tiptap-editor/emoji";
import { FontFamily } from "reactjs-tiptap-editor/fontfamily";
import { FontSize } from "reactjs-tiptap-editor/fontsize";
import { FormatPainter } from "reactjs-tiptap-editor/formatpainter";
import { Heading } from "reactjs-tiptap-editor/heading";
import { Highlight } from "reactjs-tiptap-editor/highlight";
import { History } from "reactjs-tiptap-editor/history";
import { HorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { Iframe } from "reactjs-tiptap-editor/iframe";
import { Indent } from "reactjs-tiptap-editor/indent";
import { Italic } from "reactjs-tiptap-editor/italic";
import { Katex } from "reactjs-tiptap-editor/katex";
import { LineHeight } from "reactjs-tiptap-editor/lineheight";
import { Mention } from "reactjs-tiptap-editor/mention";
import { MoreMark } from "reactjs-tiptap-editor/moremark";
import { ColumnActionButton } from "reactjs-tiptap-editor/multicolumn";
import { OrderedList } from "reactjs-tiptap-editor/orderedlist";
import { SearchAndReplace } from "reactjs-tiptap-editor/searchandreplace";
import { SlashCommand } from "reactjs-tiptap-editor/slashcommand";
import { Strike } from "reactjs-tiptap-editor/strike";
import { Table } from "reactjs-tiptap-editor/table";
import { TableOfContents } from "reactjs-tiptap-editor/tableofcontent";
import { TaskList } from "reactjs-tiptap-editor/tasklist";
import { TextAlign } from "reactjs-tiptap-editor/textalign";
import { TextDirection } from "reactjs-tiptap-editor/textdirection";
import { TextUnderline } from "reactjs-tiptap-editor/textunderline";
import "reactjs-tiptap-editor/style.css";
import "prism-code-editor-lightweight/layout.css";
import "prism-code-editor-lightweight/themes/github-dark.css";

import "katex/dist/katex.min.css";
import "easydrawer/styles.css";
import { useTheme } from "next-themes";
import { Link } from "reactjs-tiptap-editor/lib/Link.js";
import { LinkedImage } from "@/components/editor/extensions/LinkedImage";
import { findTextBlock } from "@/lib/actions/text_blocks/find-text-block";
import { generateFieldsFromObject } from "@/lib/services/common/typeList";
import { cn } from "@/lib/utils";
import { LinkedVideo } from "./extensions/LinkedVideo";
import LinkedVideoToolbarButton from "./extensions/LinkedVideoButton";
import LinkedImageToolbarButton from "./extensions/LinkeImageButton";
import { StyledLink } from "./extensions/StyledLink";
import StyledLinkButton from "./extensions/StyledLinkButton";

const sampleContact = {
	email: "test@example.com",
	first_name: "John",
	last_name: "Doe",
	address_line1: "123 Main St",
	address_line2: "Apt 4B",
	plz: "12345",
	zip: 12345,
	location: "New York",
	canton: "NY",
	country: "USA",
	language: "en",
	function: "Developer",
	phone: "555-1234",
	mobile_phone: "555-5678",
	salutation: "Mr",
	gender: "male",
	birth_date: new Date(),
	organization: { id: "1", name: "Acme Inc" },
	status: "new",
	priority: "p1",
	description: "Important client",
	document: [{ id: 1, name: "doc1" }],
};

const CONTACT_MENTIONS = generateFieldsFromObject(sampleContact);

export interface EditorProps {
	value?: string;
	onChange?: (value: string) => void;
	className?: string;
	disableToolbar?: boolean;
	max_content?: number;
	ref?: any;
}

export default function Editor(props: EditorProps) {
	const extensions = [
		LinkedImage,
		LinkedVideo,
		StyledLink,
		BaseKit.configure({
			placeholder: {
				showOnlyCurrent: true,
			},
			characterCount: {
				limit: props.max_content || 50000,
			},
		}),
		History,
		SearchAndReplace,
		TableOfContents,
		FormatPainter.configure({ spacer: true }),
		Clear,
		FontFamily,
		Heading.configure({ spacer: true }),
		FontSize,
		Bold,
		Italic,
		TextUnderline,
		Strike,
		MoreMark,
		Emoji,
		Color.configure({ spacer: true }),
		Highlight,
		BulletList,
		OrderedList,
		TextAlign.configure({ types: ["heading", "paragraph"], spacer: true }),
		Indent,
		LineHeight,
		TaskList.configure({
			spacer: true,
			taskItem: {
				nested: true,
			},
		}),
		Blockquote,
		SlashCommand,
		HorizontalRule,
		Code.configure({
			toolbar: false,
		}),
		ColumnActionButton,
		Table,
		Iframe,
		TextDirection,
		Mention.configure({
			deleteTriggerWithBackspace: true,
			suggestion: {
				//Tempo solution until suggestion option is fixed
				// then migrate textblock to char #
				allowSpaces: true,
				items: async ({ query }: any) => {
					const contactMatches = CONTACT_MENTIONS.filter((item) =>
						item.name.toLowerCase().startsWith(query.toLowerCase()),
					)
						.slice(0, 5)
						.map((item) => item.name);

					const textblock_data = await findTextBlock({
						filters: { name: { $containsi: query.replaceAll("-", " ") } },
					});

					const merged = [...contactMatches, ...textblock_data];
					const unique = Array.from(new Set(merged));
					return unique;
				},
			},
		}),
		Katex,
		Link,
	];

	const { theme } = useTheme();

	return (
		<div className={cn(props.className, "flex-1")}>
			<RichTextEditor
				dark={theme === "dark"}
				output="html"
				ref={props.ref}
				content={props.value || ""}
				useEditorOptions={{
					immediatelyRender: false,
				}}
				onChangeContent={props.onChange}
				hideToolbar={props.disableToolbar}
				disabled={props.disableToolbar}
				extensions={extensions as any}
				toolbar={{
					render: (toolbarProps, _toolbarItems, dom, containerDom) => {
						const contentWithCustomButtons = (
							<>
								{dom}
								<div className="w-px bg-gray-300" />
								<StyledLinkButton editor={toolbarProps.editor} />
								<LinkedImageToolbarButton editor={toolbarProps.editor} />
								<LinkedVideoToolbarButton editor={toolbarProps.editor} />
							</>
						);
						return containerDom(contentWithCustomButtons);
					},
				}}
			/>
		</div>
	);
}
