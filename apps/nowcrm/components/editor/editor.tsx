import { useCallback, useEffect } from 'react'

import { RichTextProvider } from 'reactjs-tiptap-editor'

// Base Kit
import { Document } from '@tiptap/extension-document'
import { HardBreak } from '@tiptap/extension-hard-break'
import { ListItem } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { TextStyle } from '@tiptap/extension-text-style'
import { CharacterCount, Dropcursor, Gapcursor, Placeholder, TrailingNode } from '@tiptap/extensions'

// build extensions
import { Attachment, RichTextAttachment } from 'reactjs-tiptap-editor/attachment'
import { Blockquote, RichTextBlockquote } from 'reactjs-tiptap-editor/blockquote'
import { Bold, RichTextBold } from 'reactjs-tiptap-editor/bold'
import { BulletList, RichTextBulletList } from 'reactjs-tiptap-editor/bulletlist'
import { Clear, RichTextClear } from 'reactjs-tiptap-editor/clear'
import { Code, RichTextCode } from 'reactjs-tiptap-editor/code'
import { CodeBlock, RichTextCodeBlock } from 'reactjs-tiptap-editor/codeblock'
import { CodeView, RichTextCodeView } from 'reactjs-tiptap-editor/codeview'
import { Color, RichTextColor } from 'reactjs-tiptap-editor/color'
import { Column, ColumnNode, MultipleColumnNode, RichTextColumn } from 'reactjs-tiptap-editor/column'
import { Drawer, RichTextDrawer } from 'reactjs-tiptap-editor/drawer'
import { Emoji, RichTextEmoji } from 'reactjs-tiptap-editor/emoji'
import { FontFamily, RichTextFontFamily } from 'reactjs-tiptap-editor/fontfamily'
import { FontSize, RichTextFontSize } from 'reactjs-tiptap-editor/fontsize'
import { Heading, RichTextHeading } from 'reactjs-tiptap-editor/heading'
import { Highlight, RichTextHighlight } from 'reactjs-tiptap-editor/highlight'
import { History, RichTextRedo, RichTextUndo } from 'reactjs-tiptap-editor/history'
import { HorizontalRule, RichTextHorizontalRule } from 'reactjs-tiptap-editor/horizontalrule'
import { Iframe, RichTextIframe } from 'reactjs-tiptap-editor/iframe'
import { Indent, RichTextIndent } from 'reactjs-tiptap-editor/indent'
import { Italic, RichTextItalic } from 'reactjs-tiptap-editor/italic'
import { Katex, RichTextKatex } from 'reactjs-tiptap-editor/katex'
import { LineHeight, RichTextLineHeight } from 'reactjs-tiptap-editor/lineheight'
import { Link, RichTextLink } from 'reactjs-tiptap-editor/link'
import { Mention } from 'reactjs-tiptap-editor/mention'
import { Mermaid, RichTextMermaid } from 'reactjs-tiptap-editor/mermaid'
import { MoreMark, RichTextMoreMark } from 'reactjs-tiptap-editor/moremark'
import { OrderedList, RichTextOrderedList } from 'reactjs-tiptap-editor/orderedlist'
import { RichTextSearchAndReplace, SearchAndReplace } from 'reactjs-tiptap-editor/searchandreplace'
import { RichTextStrike, Strike } from 'reactjs-tiptap-editor/strike'
import { RichTextTable, Table } from 'reactjs-tiptap-editor/table'
import { RichTextTaskList, TaskList } from 'reactjs-tiptap-editor/tasklist'
import { RichTextAlign, TextAlign } from 'reactjs-tiptap-editor/textalign'
import { RichTextTextDirection, TextDirection } from 'reactjs-tiptap-editor/textdirection'
import { RichTextUnderline, TextUnderline } from 'reactjs-tiptap-editor/textunderline'

// Slash Command
import { SlashCommand, SlashCommandList } from 'reactjs-tiptap-editor/slashcommand'


// Bubble
import {
  RichTextBubbleColumns,
  RichTextBubbleDrawer,
  RichTextBubbleIframe,
  RichTextBubbleKatex,
  RichTextBubbleLink,
  RichTextBubbleMermaid,
  RichTextBubbleTable,
  RichTextBubbleText,
} from 'reactjs-tiptap-editor/bubble'

import 'easydrawer/styles.css'
import 'katex/dist/katex.min.css'
import 'prism-code-editor-lightweight/layout.css'
import "prism-code-editor-lightweight/themes/github-dark.css"
import 'reactjs-tiptap-editor/style.css'

import { Editor, EditorContent, useEditor } from '@tiptap/react'
import { generateFieldsFromObject } from '@nowcrm/services'
import { findTextBlock } from '@/lib/actions/text_blocks/find-text-block'
import StyledLinkButton from './extensions/StyledLinkButton'
import LinkedImageToolbarButton from './extensions/LinkeImageButton'
import LinkedVideoToolbarButton from './extensions/LinkedVideoButton'
import { StyledLink } from './extensions/StyledLink'
import { LinkedImage } from './extensions/LinkedImage'
import { LinkedVideo } from './extensions/LinkedVideo'

function convertBase64ToBlob(base64: string) {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

// custom document to support columns
const DocumentColumn = /* @__PURE__ */ Document.extend({
  content: '(block|columns)+',
  // echo editor is a block editor
});

function debounce(func: any, wait: number) {
  let timeout: NodeJS.Timeout
  return function (...args: any[]) {
    clearTimeout(timeout)
    // @ts-ignore
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

const RichTextToolbar = ({editor}: {editor: Editor}) => {
  return <div className="flex items-center !p-1 gap-2 flex-wrap !border-b !border-solid !border-[#a5a4a4]">
    <RichTextUndo />
    <RichTextRedo />
    <RichTextSearchAndReplace />
    <RichTextClear />
    <RichTextFontFamily />
    <RichTextHeading />
    <RichTextFontSize />
    <RichTextBold />
    <RichTextItalic />
    <RichTextUnderline />
    <RichTextStrike />
    <RichTextMoreMark />
    <RichTextEmoji />
    <RichTextColor />
    <RichTextHighlight />
    <RichTextBulletList />
    <RichTextOrderedList />
    <RichTextAlign />
    <RichTextIndent />
    <RichTextLineHeight />
    <RichTextTaskList />
    <RichTextLink />
    <RichTextBlockquote />
    <RichTextHorizontalRule />
    <RichTextCode />
    <RichTextCodeBlock />
    <RichTextColumn />
    <RichTextTable />
    <RichTextIframe />
    <RichTextTextDirection />
    <RichTextAttachment />
    <RichTextKatex />
    <RichTextMermaid />
    <RichTextDrawer />
    <RichTextCodeView />
    <StyledLinkButton editor={editor} />
    <LinkedImageToolbarButton editor={editor} />
    <LinkedVideoToolbarButton editor={editor} />
  </div>
}

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
	salutation: { id: "1", name: "Mr" }, 
	gender: "male",
	birth_date: new Date(),
	organization: { id: "1", name: "Acme Inc" },
	department: { id: "1", name: "Marketing" },
	keywords: [{ id: "1", name: "CRM" }],
	contact_interests: [{ id: "1", name: "Automation" }],	
	contact_status: "new",
	priority: "p1",
	description: "Important client",
	document: [{ id: 1, name: "doc1" }],
};

const CONTACT_MENTIONS = generateFieldsFromObject(sampleContact);



export interface EditorProps {
	value?: string;
	onChange?: (value: string) => void;
	disableToolbar?: boolean;
  editable?: boolean
	max_content?: number;
  ref?: any
}

export default function EditorTipTap(props: EditorProps) {

const BaseKit = [
  DocumentColumn,
  Text,
  Dropcursor,
  Gapcursor,
  HardBreak,
  Paragraph,
  TrailingNode,
  ListItem,
  TextStyle,
  CharacterCount.configure({
    limit: props.max_content || 50000,
  }),
  Placeholder.configure({
    placeholder: 'Press \'/\' for commands',
    showOnlyCurrent: true
  })
]

const extensions = [
  ...BaseKit,
  History,
  SearchAndReplace,
  Clear,
  FontFamily,
  Heading,
  FontSize,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Emoji,
  Color,
  Highlight,
  BulletList,
  OrderedList,
  TextAlign,
  Indent,
  LineHeight,
  TaskList,
  Link,
  Blockquote,
  HorizontalRule,
  Code,
  CodeBlock,
  Column,
  ColumnNode,
  MultipleColumnNode,
  Table,
  Iframe,
  TextDirection,
  Attachment.configure({
    upload: (file: any) => {
      // fake upload return base 64
      const reader = new FileReader()
      reader.readAsDataURL(file)

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string)
          resolve(URL.createObjectURL(blob))
        }, 300)
      })
    },
  }),
  Katex,
  Mermaid.configure({
    upload: (file: any) => {
      // fake upload return base 64
      const reader = new FileReader()
      reader.readAsDataURL(file)

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string)
          resolve(URL.createObjectURL(blob))
        }, 300)
      })
    },
  }),
  Drawer.configure({
    upload: (file: any) => {
      // fake upload return base 64
      const reader = new FileReader()
      reader.readAsDataURL(file)

      return new Promise((resolve) => {
        setTimeout(() => {
          const blob = convertBase64ToBlob(reader.result as string)
          resolve(URL.createObjectURL(blob))
        }, 300)
      })
    },
  }),
  Mention.configure({
    suggestion: {
      char: "@",
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
  SlashCommand,
  CodeView,
  StyledLink,
  LinkedImage,
	LinkedVideo,
]

  const onValueChange = useCallback(
    debounce((value: any) => {
      props.onChange && props.onChange(value) 
    }, 300),
    [],
  )

  const editor = useEditor({
    // shouldRerenderOnTransaction:  false,
    textDirection: 'auto', // global text direction
    content:props.value || "",
    extensions,
    immediatelyRender: false, // error duplicate plugin key
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onValueChange(html)
    },
  });



  useEffect(() => {
    (window as any).editor = editor;
    editor?.setEditable(props.editable ?? true)
  }, [editor]);

  return (
    <div
      className="p-[24px] flex flex-col w-full max-w-screen-lg gap-[24px] mx-[auto] my-0"
      style={{
        maxWidth: 1200,
        margin: '40px auto',
      }}
    >

      <RichTextProvider editor={editor as Editor} >
        <div className="overflow-hidden rounded-[0.5rem] bg-background shadow outline outline-1">
          <div className="flex max-h-full w-full flex-col">

            {!props.disableToolbar && <RichTextToolbar editor={editor as Editor} />}

            <EditorContent
              editor={editor}
              ref={props.ref}
            />

            {/* Bubble */}
            <RichTextBubbleColumns />
            <RichTextBubbleDrawer />
            <RichTextBubbleIframe />
            <RichTextBubbleKatex />
            <RichTextBubbleLink />


            <RichTextBubbleMermaid />
            <RichTextBubbleTable />
            <RichTextBubbleText />

            {/* Command List */}
            <SlashCommandList />
          </div>
        </div>
      </RichTextProvider>
    </div>
  )
}


{}