// path: components/canvas/CodeEditor.tsx

'use client';

import { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useThreadStore } from '@/lib/state/threadStore';

export function CodeEditor() {
  const { theme } = useTheme();
  const { getActiveDoc, updateDoc } = useThreadStore();
  const activeDoc = getActiveDoc();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: false,
    });


    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      console.log('Save command triggered!');
    });
  };

  const handleContentChange = (value: string | undefined) => {
    if (activeDoc && value !== undefined) {
      updateDoc(activeDoc.id, { content: value });
    }
  };

  useEffect(() => {
    if (editorRef.current && activeDoc) {
      const currentModel = editorRef.current.getModel();
      if (currentModel && currentModel.getValue() !== activeDoc.content) {
        editorRef.current.setValue(activeDoc.content);
      }
    }
  }, [activeDoc]);

  if (!activeDoc) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={activeDoc.language || 'plaintext'}
        value={activeDoc.content}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={handleContentChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          // --- UPDATE: Font styling to precisely match Gemini's editor ---
          fontFamily: '"Google Sans Mono", Consolas, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 19,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          roundedSelection: false,
        }}
      />
    </div>
  );
}
