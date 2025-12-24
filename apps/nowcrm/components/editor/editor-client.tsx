'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const Editor = dynamic(() => import('@/components/editor/editor-tiptap'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});


export interface EditorProps {
	value?: string;
	onChange?: (value: string) => void;
	disableToolbar?: boolean;
  editable?: boolean
	max_content?: number;
  ref?: any
}

const EditorClient = (props: EditorProps) => {
  return (
    <>
      <Editor {...props}/>
    </>
  );
}



export default EditorClient;