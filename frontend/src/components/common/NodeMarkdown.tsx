import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { getMarkdownComponents } from '../../utils/chat/markdownComponents';
import 'katex/dist/katex.min.css';

interface NodeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Reusable component for rendering node descriptions and summaries with markdown
 * Uses the 'document' variant for neutral styling (slate colors instead of red inline code)
 */
export const NodeMarkdown: React.FC<NodeMarkdownProps> = ({ content, className = '' }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const markdownComponents = getMarkdownComponents({
    copiedCode,
    onCopyCode: copyCode,
    variant: 'document' // Use document variant for neutral styling
  });

  // Preprocess markdown to handle escaped/encoded characters
  const preprocessMarkdown = (text: string): string => {
    return text
      .replace(/\\`/g, '`')         // Unescape backticks
      .replace(/&#96;/g, '`')       // Decode HTML numeric entity
      .replace(/&grave;/g, '`')     // Decode HTML named entity
      .replace(/&lt;/g, '<')        // Decode less than
      .replace(/&gt;/g, '>')        // Decode greater than
      .replace(/&amp;/g, '&');      // Decode ampersand
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, trust: true }]]}
        components={markdownComponents}
        skipHtml={false}
      >
        {preprocessMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
};

export default NodeMarkdown;
