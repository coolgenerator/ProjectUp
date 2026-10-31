import React, { memo, useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import EditorJS, { OutputData, API, EditorConfig } from '@editorjs/editorjs';
import { EDITOR_JS_TOOLS } from './constants';
import './editor.css';

interface EnhancedReactEditorProps {
  data: OutputData;
  onChange: (content: OutputData) => void;
  holder?: string;
  autofocus?: boolean;
  readOnly?: boolean;
  minHeight?: number;
  placeholder?: string;
}

export interface EnhancedReactEditorRef {
  focus: () => void;
  clear: () => void;
  save: () => Promise<OutputData>;
}

const EnhancedReactEditor = forwardRef<EnhancedReactEditorRef, EnhancedReactEditorProps>(({
  data,
  onChange,
  holder,
  autofocus = false,
  readOnly = false,
  minHeight = 100,
  placeholder = "Type '/' for commands..."
}, ref) => {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorId = holder || `editor-${Math.random().toString(36).substring(2, 9)}`;

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current && isEditorReady) {
        try {
          // Focus on the first block or create a new one
          const blocksCount = editorRef.current.blocks.getBlocksCount();
          if (blocksCount === 0) {
            editorRef.current.blocks.insert('paragraph');
          }
          editorRef.current.focus();
        } catch (error) {
          console.error('Error focusing editor:', error);
        }
      }
    },
    clear: () => {
      if (editorRef.current && isEditorReady) {
        editorRef.current.clear();
      }
    },
    save: async () => {
      if (editorRef.current && isEditorReady) {
        return await editorRef.current.save();
      }
      return { blocks: [] };
    }
  }), [isEditorReady]);

  // Handle editor changes
  const handleEditorChange = useCallback(async (api: API) => {
    if (readOnly) return;
    try {
      const content = await api.saver.save();
      onChange(content);
    } catch (err) {
      console.error('Error saving editor content:', err);
    }
  }, [onChange, readOnly]);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editorConfig: EditorConfig = {
      holder: editorId,
      tools: EDITOR_JS_TOOLS,
      data: data || { blocks: [] },
      placeholder: placeholder,
      readOnly: readOnly,
      autofocus: autofocus,
      minHeight: minHeight,
      onChange: handleEditorChange,
      onReady: () => {
        setIsEditorReady(true);
        
        // Auto-focus if requested
        if (autofocus && editorRef.current) {
          setTimeout(() => {
            editorRef.current?.focus();
            
            // If no blocks, create an initial paragraph block
            if (editorRef.current && editorRef.current.blocks.getBlocksCount() === 0) {
              editorRef.current.blocks.insert('paragraph');
            }
          }, 100);
        }

        // Add custom keyboard shortcuts
        if (containerRef.current) {
          const editorElement = containerRef.current.querySelector('.codex-editor');
          if (editorElement) {
            editorElement.addEventListener('keydown', handleKeyboardShortcuts);
          }
        }
      },
    };

    try {
      editorRef.current = new EditorJS(editorConfig);
    } catch (error) {
      console.error('Error initializing EditorJS:', error);
    }

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      setIsEditorReady(false);
    };
  }, []); // Only run once on mount

  // Update editor data when prop changes
  useEffect(() => {
    if (!editorRef.current || !isEditorReady) return;

    // Check if the data actually changed
    editorRef.current.save().then(currentData => {
      if (JSON.stringify(currentData) !== JSON.stringify(data)) {
        editorRef.current?.render(data);
      }
    }).catch(console.error);
  }, [data, isEditorReady]);

  // Handle keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Slash command is already handled by EditorJS
    
    // Additional shortcuts can be added here
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          if (editorRef.current && isEditorReady) {
            editorRef.current.save().then(savedData => {
              onChange(savedData);
            });
          }
          break;
      }
    }
  }, [onChange, isEditorReady]);

  return (
    <div 
      ref={containerRef}
      className="enhanced-editor-container"
      style={{
        minHeight: `${minHeight}px`,
        position: 'relative',
      }}
    >
      <div 
        id={editorId}
        style={{
          minHeight: `${minHeight}px`,
        }}
      />
      <style>{`
        .enhanced-editor-container {
          width: 100%;
        }
        
        .enhanced-editor-container .ce-block__content,
        .enhanced-editor-container .ce-toolbar__content {
          max-width: 100%;
        }
        
        .enhanced-editor-container .ce-toolbar__actions {
          right: 0;
        }
        
        .enhanced-editor-container .codex-editor__redactor {
          padding-bottom: 50px !important;
        }
        
        .enhanced-editor-container .ce-block:first-child {
          margin-top: 0;
        }
        
        .enhanced-editor-container .ce-block {
          padding: 0.4rem 0;
        }
        
        .enhanced-editor-container .ce-paragraph[data-placeholder]:empty::before {
          color: #707684;
          font-weight: normal;
          opacity: 0.6;
        }
        
        .enhanced-editor-container .ce-toolbox {
          left: 0;
        }
        
        .enhanced-editor-container .ce-toolbar__plus {
          left: -2px;
          color: #707684;
        }
        
        .enhanced-editor-container .ce-toolbar__plus:hover {
          color: #388ae5;
        }
      `}</style>
    </div>
  );
});

EnhancedReactEditor.displayName = 'EnhancedReactEditor';

export default memo(EnhancedReactEditor);