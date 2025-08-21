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

// Style object for the light theme
const geminiCodeStyleLight = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    backgroundColor: 'transparent',
    padding: '1rem',
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    fontFamily: '"Source Code Pro", "Fira Code", monospace',
    fontSize: '1rem',
    fontWeight: '500',
    lineHeight: '1.1',
  },
};

// Style object for the dark theme
const geminiCodeStyleDark = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    backgroundColor: 'transparent',
    padding: '1rem',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    fontFamily: '"Source Code Pro", "Fira Code", monospace',
    fontSize: '1rem',
    fontWeight: '500',
    lineHeight: '1.1',
  },
  'token.keyword': { color: '#c586c0' },
  'token.string': { color: '#6a9955' },
  'token.function': { color: '#dcdcaa' },
  'token.comment': { color: '#6a9955', fontStyle: 'italic' },
  'token.punctuation': { color: '#d4d4d4' },
  'token.operator': { color: '#d4d4d4' },
  'token.number': { color: '#b5cea8' },
};

const CodeBlock: FC<CodeBlockProps> = ({ language, value }) => {
  const { theme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  if (!isMounted) {
    return null; 
  }
  
  const activeTheme = resolvedTheme || theme;

  return (
    // --- UPDATE: Explicitly set border color based on theme state ---
    <div className={`relative my-4 text-left rounded-3xl overflow-hidden border-2 ${activeTheme === 'dark' ? 'border-white bg-[#0D1117]' : 'border-black bg-[#f7f7f7]'}`}>
      <div className={`flex items-center justify-between px-4 py-2 ${activeTheme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}`}>
        <span className="text-xs font-sans">{language}</span>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="text-gray-400 hover:text-white h-8 w-8">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={activeTheme === 'dark' ? geminiCodeStyleDark : geminiCodeStyleLight}
        showLineNumbers={false}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
