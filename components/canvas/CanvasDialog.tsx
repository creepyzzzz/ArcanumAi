'use client';

import { useState, useEffect, Key } from 'react';
import { useThreadStore } from '@/lib/state/threadStore';
import { useUiStore } from '@/lib/state/uiStore'; // Import the UI store
import { Button } from '@/components/ui/button';
import { X, Copy, Download, Check, Code, Eye } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Highlight, Prism, themes, type Language } from 'prism-react-renderer';
import Editor from '@monaco-editor/react';
import { PdfViewer } from './PdfViewer';

interface CodeBlockProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function CanvasDialog() {
  const { getActiveDoc, closeCanvas, updateDoc } = useThreadStore();
  const { fontSizes } = useUiStore(); // Get font sizes from the store
  const activeDoc = getActiveDoc();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');

  useEffect(() => {
    if (activeDoc) {
      setViewMode(activeDoc.kind === 'code' || activeDoc.kind === 'pdf' ? 'preview' : 'edit');
    }
  }, [activeDoc]);

  if (!activeDoc) {
    return null;
  }

  const handleCopy = () => {
    if (activeDoc.content) {
      navigator.clipboard.writeText(activeDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (activeDoc.content) {
      const blob = new Blob([activeDoc.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeDoc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleContentChange = (newContent: string | undefined) => {
    if (newContent !== undefined) {
        updateDoc(activeDoc.id, { content: newContent });
    }
  };

  const isCode = activeDoc.kind === 'code';
  const isPdf = activeDoc.kind === 'pdf';

  const markdownComponents: Components = {
    code: ({ node, inline, className, children, ...props }: CodeBlockProps) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      return !inline && match ? (
        <Highlight
          prism={Prism}
          code={codeString}
          language={match[1] as Language}
          theme={themes.nightOwl}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={{...style, padding: '1rem', margin: 0, overflow: 'auto', borderRadius: '0.5rem', fontSize: fontSizes.canvasCodePreview }}>
              {tokens.map((line, i) => {
                const { key, ...lineProps } = getLineProps({ line, key: i });
                return (
                  <div key={key as Key} {...lineProps}>
                    {line.map((token, keyIndex) => {
                      const { key: tokenKey, ...tokenProps } = getTokenProps({ token, key: keyIndex });
                      return <span key={tokenKey as Key} {...tokenProps} />;
                    })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 pl-4 border-b gap-2">
        <h3 className="font-medium text-sm truncate flex-1">{activeDoc.name}</h3>
        <div className="flex items-center gap-1">
          {isCode && (
             <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}>
              {viewMode === 'preview' ? <Code className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {viewMode === 'preview' ? 'Edit' : 'Preview'}
            </Button>
          )}
          {!isPdf && (
            <>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={closeCanvas} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto relative">
         {isPdf ? (
            <PdfViewer fileUrl={activeDoc.content} />
         ) : isCode ? (
          viewMode === 'edit' ? (
            <Editor
              height="100%"
              language={activeDoc.language || 'plaintext'}
              value={activeDoc.content}
              onChange={handleContentChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: fontSizes.canvasCodeEditor, // Use canvas code editor font size
                wordWrap: 'off',
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <div className="p-4" style={{ fontSize: fontSizes.canvasCodePreview }}>
              <ReactMarkdown components={markdownComponents}>
                {`\`\`\`${activeDoc.language || ''}\n${activeDoc.content}\n\`\`\``}
              </ReactMarkdown>
            </div>
          )
        ) : (
          <article className="prose dark:prose-invert max-w-none p-4 canvas-document">
            <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
