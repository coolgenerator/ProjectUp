import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownComponentsProps {
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  variant?: 'chat' | 'document';
}

/**
 * Get custom React Markdown components with syntax highlighting and copy functionality
 *
 * @param variant - 'chat' for chat messages (red inline code), 'document' for node details (neutral inline code)
 */
export const getMarkdownComponents = ({
  copiedCode,
  onCopyCode,
  variant = 'chat'
}: MarkdownComponentsProps) => ({
  p: ({ children, node, ...props }: any) => {
    // Recursively check if any descendant is a block-level code element
    const hasBlockCodeInTree = (astNode: any): boolean => {
      if (!astNode) return false;

      // Check current node
      if (astNode.type === 'code') return true; // Block code in AST
      if (astNode.type === 'element' && astNode.tagName === 'code' && !astNode.properties?.inline) return true;

      // Recursively check children
      if (astNode.children && Array.isArray(astNode.children)) {
        return astNode.children.some((child: any) => hasBlockCodeInTree(child));
      }

      return false;
    };

    const hasCodeBlock = node?.children?.some((child: any) => hasBlockCodeInTree(child));

    // Also check React children for block-level elements as a fallback
    const childArray = React.Children.toArray(children);
    const hasBlockElements = childArray.some((child: any) => {
      if (React.isValidElement(child)) {
        // Check for div or pre (which are block-level)
        if (child.type === 'div' || child.type === 'pre') {
          return true;
        }
        // Check if it's a code component with block-level styling
        const childProps = child.props as any;
        if (childProps?.inline === false) {
          return true;
        }
        // Check for block-level class names
        const className = childProps?.className || '';
        if (className.includes('group') || className.includes('my-3')) {
          return true;
        }
      }
      return false;
    });

    // If contains block elements, unwrap with Fragment to avoid invalid nesting
    return hasCodeBlock || hasBlockElements ?
      <>{children}</> :
      <p className="mb-2 last:mb-0">{children}</p>;
  },

  ul: ({ children }: any) => <ul className="mb-2 ml-5 list-disc [&_ul]:ml-4 [&_ol]:ml-4">{children}</ul>,

  ol: ({ children }: any) => <ol className="mb-2 ml-5 list-decimal [&_ul]:ml-4 [&_ol]:ml-4">{children}</ol>,

  li: ({ children, ...props }: any) => <li className="mb-1 leading-relaxed">{children}</li>,

  code: ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    // Determine if this should be treated as inline code
    // Single backticks without newlines should be inline, triple backticks should be blocks
    const isInlineCode = inline || (!match && !codeString.includes('\n'));

    // Code block with language (triple backticks with language specifier)
    if (!isInlineCode && match) {
      return (
        <div className="relative group my-3">
          <button
            onClick={() => onCopyCode(codeString)}
            className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy code"
          >
            {copiedCode === codeString ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            className="text-xs rounded-lg"
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Inline code (single backticks or single-line code)
    if (isInlineCode) {
      // Variant-based styling
      const inlineStyles = variant === 'chat'
        ? "px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs font-mono" // Chat: red for component names
        : "px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-mono"; // Document: neutral

      // Clean children: remove any backticks that snuck through
      const cleanChildren = React.Children.map(children, child => {
        if (typeof child === 'string') {
          return child.replace(/`/g, '');
        }
        return child;
      });

      return (
        <code
          className={inlineStyles}
          {...props}
        >
          {cleanChildren}
        </code>
      );
    }

    // Code block without language (triple backticks without language specifier)
    // Clean children: remove any backticks that snuck through
    const cleanBlockChildren = React.Children.map(children, child => {
      if (typeof child === 'string') {
        return child.replace(/`/g, '');
      }
      return child;
    });

    return (
      <div className="relative group my-3">
        <button
          onClick={() => onCopyCode(codeString)}
          className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Copy code"
        >
          {copiedCode === codeString ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-300" />
          )}
        </button>
        <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
          <code className="text-xs font-mono" {...props}>
            {cleanBlockChildren}
          </code>
        </pre>
      </div>
    );
  },

  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,

  em: ({ children }: any) => <em className="italic">{children}</em>,

  h1: ({ children }: any) => <h1 className="text-base font-bold mb-2">{children}</h1>,

  h2: ({ children }: any) => <h2 className="text-sm font-bold mb-1">{children}</h2>,

  h3: ({ children }: any) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
});
