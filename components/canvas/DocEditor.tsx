// path: components/canvas/DocEditor.tsx

'use client';

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useThreadStore } from '@/lib/state/threadStore';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

export function DocEditor() {
  const { getActiveDoc, updateDoc } = useThreadStore();
  const activeDoc = getActiveDoc();
  const { theme } = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The CodeBlock extension is configured to use lowlight for syntax highlighting.
        codeBlock: false, 
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
      }),
    ],
    content: activeDoc?.content || '',
    editorProps: {
      attributes: {
        // This class applies Tailwind's typography styles for a better reading experience.
        class: 'prose dark:prose-invert focus:outline-none max-w-full p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (activeDoc) {
        // When the content is updated, save it back to the store as HTML.
        updateDoc(activeDoc.id, { content: editor.getHTML() });
      }
    },
  });

  // This effect ensures that if the document content is changed from outside the editor,
  // the editor's view is updated to reflect that change.
  useEffect(() => {
    if (editor && activeDoc && editor.getHTML() !== activeDoc.content) {
      // `setContent` correctly parses and renders the HTML string.
      editor.commands.setContent(activeDoc.content);
    }
  }, [activeDoc, editor]);
  
  if (!activeDoc) {
    return null;
  }

  return (
    <EditorContent editor={editor} className="h-full overflow-y-auto" />
  );
}
