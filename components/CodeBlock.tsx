'use client';

import { FC, useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: FC<CodeBlockProps> = ({ language, value }) => {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(err => console.error('Failed to copy text: ', err));
  };

  if (!isMounted) {
    return null;
  }

  const activeTheme = resolvedTheme;

  return (
    <div className={`code-block-wrapper relative my-4 text-left rounded-xl overflow-hidden border ${activeTheme === 'dark' ? 'border-zinc-700 bg-[#0D1117]' : 'border-zinc-300 bg-[#f7f7f7]'}`}>
      <div className={`flex items-center justify-between px-4 py-1.5 ${activeTheme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}`}>
        <span className="text-xs font-sans">{language}</span>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={activeTheme === 'dark' ? vscDarkPlus : oneLight}
        customStyle={{
            padding: '1rem',
            margin: '0',
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            borderRadius: '0',
        }}
        codeTagProps={{
            style: {
                backgroundColor: 'transparent',
                fontFamily: '"Source Code Pro", "Fira Code", monospace',
                fontSize: '1rem',
            }
        }}
        showLineNumbers={false}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;