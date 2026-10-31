// @ts-nocheck
// This file uses @ts-nocheck to bypass all TypeScript errors
// as Editor.js tools don't have proper TypeScript typings

// Import EditorJS tools
import Embed from '@editorjs/embed';
import Table from '@editorjs/table';
import Warning from '@editorjs/warning';
import Code from '@editorjs/code';
import LinkTool from '@editorjs/link';
import List from '@editorjs/list';
import Raw from '@editorjs/raw';
import Header from '@editorjs/header';
import Quote from '@editorjs/quote';
import Marker from '@editorjs/marker';
import CheckList from '@editorjs/checklist';
import Delimiter from '@editorjs/delimiter';
import InlineCode from '@editorjs/inline-code';
import SimpleImage from '@editorjs/simple-image';

/**
 * Configuration for EditorJS tools
 * Using direct tool imports to avoid TypeScript errors
 */
export const EDITOR_JS_TOOLS = {
    header: Header,
    paragraph: {
        inlineToolbar: true,
    },
    embed: {
        class: Embed,
        inlineToolbar: true,
        config: {
            services: {
                youtube: true,
                codesandbox: true,
                codepen: true,
                vimeo: true,
                miro: true,
                figma: true
            }
        }
    },
    table: {
        class: Table,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+T',
        config: {
            rows: 2,
            cols: 2
        }
    },
    marker: {
        class: Marker,
        shortcut: 'CMD+SHIFT+M',
        inlineToolbar: true
    },
    list: {
        class: List,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+L',
        config: {
            defaultStyle: 'unordered'
        }
    },
    warning: {
        class: Warning,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+W'
    },
    code: {
        class: Code,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+C'
    },
    linkTool: {
        class: LinkTool,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+K'
    },
    raw: {
        class: Raw,
        inlineToolbar: true
    },
    quote: {
        class: Quote,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+Q',
        config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote\'s author'
        }
    },
    checklist: {
        class: CheckList,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+O'
    },
    delimiter: {
        class: Delimiter,
        inlineToolbar: true,
    },
    inlineCode: {
        class: InlineCode,
        shortcut: 'CMD+SHIFT+I'
    },
    simpleImage: {
        class: SimpleImage,
        inlineToolbar: true,
        shortcut: 'CMD+SHIFT+I'
    }
};
