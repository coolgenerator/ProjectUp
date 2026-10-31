import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import EditorJS, { OutputData, API, EditorConfig } from '@editorjs/editorjs';
import DragDrop from 'editorjs-drag-drop';
import { EDITOR_JS_TOOLS } from './constants';
import './editor.css'; // We'll create this CSS file next

interface ReactEditorProps {
    data: OutputData;
    onChange: (content: OutputData) => void;
    readOnly?: boolean;
}

// Suppress console warnings for specific editor events and React Router warnings
const originalConsoleWarn = console.warn;
console.warn = function (msg: string, ...args: any[]) {
    // Ignore EditorJS mobile layout warnings
    if (typeof msg === 'string' && msg.includes('EventDispatcher .off(): there is no subscribers for event "editor mobile layout toggled"')) {
        return;
    }

    // Ignore React Router future flag warnings
    if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) {
        return;
    }

    // Pass through all other warnings
    originalConsoleWarn.apply(console, [msg, ...args]);
};

const ReactEditor: React.FC<ReactEditorProps> = ({ data, onChange, readOnly = false }) => {
    const editorRef = useRef<EditorJS | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dataRef = useRef<OutputData>(data);
    const readOnlyRef = useRef<boolean>(readOnly);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const dragDropInstanceRef = useRef<any>(null);
    const editorId = useRef(`editor-${Math.random().toString(36).substring(2, 9)}`);
    const [editorInitialized, setEditorInitialized] = useState(false);

    // Memoize the onChange handler to prevent unnecessary re-renders
    const handleEditorChange = useCallback(async (api: API) => {
        if (readOnlyRef.current) return;
        try {
            const content = await api.saver.save();
            // Immediately notify parent component of changes
            onChange(content);
        } catch (err) {
            // Error saving content
        }
    }, [onChange]);

    // Update ref
    useEffect(() => {
        readOnlyRef.current = readOnly;
    }, [readOnly]);

    // Update the reference when data changes externally
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Prevent default form submission events but allow Enter key for editing
    const preventDefaultBehavior = (e: Event) => {
        // Only prevent Enter default behavior if it's in a form context
        // but allow it for contenteditable regions to create new blocks
        if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Enter') {
            const target = e.target as HTMLElement;

            // Allow Enter in contenteditable regions (for creating new blocks)
            if (target.isContentEditable) {
                return; // Let EditorJS handle Enter in contenteditable regions
            }

            // Only prevent default for non-textarea elements
            if (target.tagName !== 'TEXTAREA') {
                // Prevent only if we're not in the editor context
                if (!target.closest('.codex-editor')) {
                    e.preventDefault();
                }
            }
        }
    };

    // Custom handler for slash commands
    const handleSlashCommand = useCallback((editor: EditorJS) => {
        if (!containerRef.current || !editor) return;

        const handleSlashKey = (e: KeyboardEvent) => {
            // Check if the slash key is pressed anywhere in the editor
            if (e.key === '/' && !readOnlyRef.current) {
                // Don't prevent default - let the slash character be typed

                // After a very short delay to ensure the slash is inserted first
                setTimeout(() => {
                    try {
                        if (editor && editor.blocks) {
                            // Get the current block and its ID
                            const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
                            if (typeof currentBlockIndex === 'number') {
                                const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);

                                if (currentBlock) {
                                    // Force the toolbar to open by simulating user actions

                                    // 1. Find and focus the contenteditable element
                                    const blockElement = document.getElementById(currentBlock.id);
                                    if (blockElement) {
                                        const contentEditable = blockElement.querySelector('[contenteditable="true"]');
                                        if (contentEditable instanceof HTMLElement) {
                                            contentEditable.focus();

                                            // Create a selection at the right position (after the slash)
                                            try {
                                                // Position cursor after the slash
                                                const selection = window.getSelection();
                                                const range = document.createRange();

                                                if (selection && contentEditable.textContent) {
                                                    // Get current cursor position
                                                    const textNode = contentEditable.firstChild || contentEditable;
                                                    const textContent = contentEditable.textContent;
                                                    const slashPos = textContent.lastIndexOf('/');

                                                    if (slashPos >= 0) {
                                                        // Position cursor right after the slash
                                                        range.setStart(textNode, slashPos + 1);
                                                        range.setEnd(textNode, slashPos + 1);
                                                        selection.removeAllRanges();
                                                        selection.addRange(range);
                                                    }
                                                }
                                            } catch (err) {
                                                // Error setting selection
                                            }
                                        }
                                    }

                                    // 2. Multiple approaches to show the toolbar

                                    // Method A: Directly access toolbar API
                                    if (editor.toolbar) {
                                        editor.toolbar.open();

                                        // Try to access any additional methods that might help
                                        try {
                                            // Try to show the inline toolbar
                                            if ((editor.toolbar as any).showInlineToolbar) {
                                                (editor.toolbar as any).showInlineToolbar();
                                            }

                                            // Try to show the conversion toolbar
                                            if ((editor.toolbar as any).showConversionToolbar) {
                                                (editor.toolbar as any).showConversionToolbar();
                                            }
                                        } catch (err) {
                                            // Some toolbar methods not available
                                        }
                                    }

                                    // Method B: Simulate UI clicks with short delays between them
                                    setTimeout(() => {
                                        // Try finding and clicking the plus button
                                        const plusButton = containerRef.current?.querySelector('.ce-toolbar__plus');
                                        if (plusButton instanceof HTMLElement) {
                                            plusButton.click();
                                        }

                                        // Also try the settings button
                                        setTimeout(() => {
                                            const settingsButton = containerRef.current?.querySelector('.ce-toolbar__settings-btn');
                                            if (settingsButton instanceof HTMLElement) {
                                                settingsButton.click();
                                            }

                                            // Also try to find and open the inline toolbar
                                            setTimeout(() => {
                                                const inlineToolbar = containerRef.current?.querySelector('.ce-inline-toolbar');
                                                if (inlineToolbar instanceof HTMLElement) {
                                                    inlineToolbar.classList.add('ce-inline-toolbar--showed');
                                                    inlineToolbar.style.display = 'block';
                                                }

                                                // Last try - dispatch a fake selection change to trigger toolbar
                                                document.dispatchEvent(new Event('selectionchange'));
                                            }, 50);
                                        }, 50);
                                    }, 50);
                                }
                            }
                        }
                    } catch (err) {
                        // Error handling slash command
                    }
                }, 10); // Very small delay to ensure slash is inserted first
            }
        };

        // Add event listener to capture slash key events anywhere in the editor
        // This ensures we catch it regardless of which block is focused
        containerRef.current.addEventListener('keydown', handleSlashKey as EventListener);

        // Return cleanup function
        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('keydown', handleSlashKey as EventListener);
            }
        };
    }, []);

    // Add event listeners to prevent default form submission
    useEffect(() => {
        if (containerRef.current) {
            // Add event listeners to prevent form submission
            containerRef.current.addEventListener('keydown', preventDefaultBehavior);
            containerRef.current.addEventListener('submit', e => e.preventDefault());

            // Cleanup
            return () => {
                if (containerRef.current) {
                    containerRef.current.removeEventListener('keydown', preventDefaultBehavior);
                    containerRef.current.removeEventListener('submit', e => e.preventDefault());
                }
            };
        }
    }, [isEditorReady]);

    // Helper to check if we're inside the editor
    const isInsideEditor = (element: HTMLElement | null): boolean => {
        if (!element) return false;
        return element.classList.contains('codex-editor') || !!element.closest('.codex-editor');
    };

    // Add global keyboard listener to detect slash commands anywhere in the editor
    useEffect(() => {
        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if (e.key === '/' && !readOnlyRef.current && editorRef.current) {
                // Check if we're inside the editor
                const target = e.target as HTMLElement;
                if (isInsideEditor(target)) {
                    // Let the slash character be typed first, then open toolbar
                    setTimeout(() => {
                        try {
                            // Make sure we have a selection inside the editor
                            if (document.activeElement && isInsideEditor(document.activeElement as HTMLElement)) {
                                const editor = editorRef.current;

                                // Find the active contenteditable element
                                const activeElement = document.activeElement as HTMLElement;

                                // If contenteditable is focused, position cursor after the slash
                                if (activeElement.getAttribute('contenteditable') === 'true') {
                                    try {
                                        // Position cursor after the slash
                                        const selection = window.getSelection();
                                        if (selection && activeElement.textContent) {
                                            // Get text content and find the last slash
                                            const textContent = activeElement.textContent;
                                            const slashPos = textContent.lastIndexOf('/');

                                            if (slashPos >= 0 && selection.rangeCount > 0) {
                                                // Get the current range and modify it
                                                const range = selection.getRangeAt(0);
                                                const textNode = activeElement.firstChild || activeElement;

                                                // Position cursor right after the slash
                                                range.setStart(textNode, slashPos + 1);
                                                range.setEnd(textNode, slashPos + 1);
                                                selection.removeAllRanges();
                                                selection.addRange(range);
                                            }
                                        }
                                    } catch (err) {
                                        // Error positioning cursor after slash
                                    }
                                }

                                // Multiple approaches to show the toolbar

                                // 1. Try to open the toolbar programmatically
                                if (editor && editor.toolbar) {
                                    editor.toolbar.open();
                                }

                                // 2. Try opening the toolbox by clicking the plus button
                                setTimeout(() => {
                                    const plusButton = containerRef.current?.querySelector('.ce-toolbar__plus');
                                    if (plusButton instanceof HTMLElement) {
                                        plusButton.click();
                                    }

                                    // 3. Try opening settings/conversion menu
                                    setTimeout(() => {
                                        const settingsButton = containerRef.current?.querySelector('.ce-toolbar__settings-btn');
                                        if (settingsButton instanceof HTMLElement) {
                                            settingsButton.click();
                                        }

                                        // 4. Try forcing the inline toolbar to show
                                        setTimeout(() => {
                                            // Find and show inline toolbar
                                            const inlineToolbar = containerRef.current?.querySelector('.ce-inline-toolbar');
                                            if (inlineToolbar instanceof HTMLElement) {
                                                inlineToolbar.classList.add('ce-inline-toolbar--showed');
                                                inlineToolbar.style.display = 'block';
                                            }

                                            // 5. Try to find conversion toolbar
                                            const conversionToolbar = containerRef.current?.querySelector('.ce-conversion-toolbar');
                                            if (conversionToolbar instanceof HTMLElement) {
                                                conversionToolbar.classList.add('ce-conversion-toolbar--showed');
                                                conversionToolbar.style.display = 'block';
                                            }

                                            // 6. Find and show toolbox
                                            const toolbox = containerRef.current?.querySelector('.ce-toolbox');
                                            if (toolbox instanceof HTMLElement) {
                                                toolbox.classList.add('ce-toolbox--showed');
                                                toolbox.style.display = 'block';
                                            }

                                            // Trigger a selection change to force toolbar update
                                            document.dispatchEvent(new Event('selectionchange'));
                                        }, 50);
                                    }, 50);
                                }, 50);
                            }
                        } catch (err) {
                            // Error in global slash handler
                        }
                    }, 10);
                }
            }
        };

        // Add the listener to the document
        document.addEventListener('keydown', handleGlobalKeydown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, [readOnlyRef.current, isEditorReady]);

    // Handle keyboard shortcuts and markdown formatting
    const handleEditorKeydown = useCallback((e: KeyboardEvent) => {
        if (!editorRef.current || readOnlyRef.current) return;

        // Handle Ctrl+Z (Undo) - Make it work at block level rather than character level
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();

            try {
                // Find the active contenteditable element within the editor
                const activeEditableElement = containerRef.current?.querySelector('[contenteditable="true"]:focus');

                if (activeEditableElement) {
                    // We already have an editable element in focus, just use document.execCommand on it
                    document.execCommand('undo');
                    return;
                }

                // Find all contenteditable elements
                const editableElements = containerRef.current?.querySelectorAll('[contenteditable="true"]');
                if (editableElements && editableElements.length > 0) {
                    // Focus the first one and execute undo
                    (editableElements[0] as HTMLElement).focus();
                    document.execCommand('undo');
                    return;
                }

                // If we couldn't find a good element to focus, let the browser handle it naturally
                // by re-dispatching the event after removing our handler
                document.removeEventListener('keydown', handleEditorKeydown);

                // Dispatch directly to the document
                const nativeEvent = new KeyboardEvent('keydown', {
                    key: 'z',
                    code: 'KeyZ',
                    ctrlKey: true,
                    metaKey: navigator.platform.indexOf('Mac') >= 0,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(nativeEvent);

                // Re-add our handler after the event has propagated
                setTimeout(() => {
                    document.addEventListener('keydown', handleEditorKeydown);
                }, 0);
            } catch (error) {
                // Error in undo handler
                // Let browser handle it if our approach fails
            }
            return;
        }

        // Handle Ctrl+Shift+Z or Ctrl+Y (Redo)
        if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
            e.preventDefault();
            e.stopPropagation();

            try {
                // Find the active contenteditable element within the editor
                const activeEditableElement = containerRef.current?.querySelector('[contenteditable="true"]:focus');

                if (activeEditableElement) {
                    // We already have an editable element in focus, just use document.execCommand on it
                    document.execCommand('redo');
                    return;
                }

                // Find all contenteditable elements
                const editableElements = containerRef.current?.querySelectorAll('[contenteditable="true"]');
                if (editableElements && editableElements.length > 0) {
                    // Focus the first one and execute redo
                    (editableElements[0] as HTMLElement).focus();
                    document.execCommand('redo');
                    return;
                }

                // If we couldn't find a good element to focus, let the browser handle it naturally
                // by re-dispatching the event after removing our handler
                document.removeEventListener('keydown', handleEditorKeydown);

                // Dispatch directly to the document
                const nativeEvent = new KeyboardEvent('keydown', {
                    key: e.key === 'y' ? 'y' : 'z',
                    code: e.key === 'y' ? 'KeyY' : 'KeyZ',
                    ctrlKey: true,
                    metaKey: navigator.platform.indexOf('Mac') >= 0,
                    shiftKey: e.key !== 'y',
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(nativeEvent);

                // Re-add our handler after the event has propagated
                setTimeout(() => {
                    document.addEventListener('keydown', handleEditorKeydown);
                }, 0);
            } catch (error) {
                // Error in redo handler
                // Let browser handle it if our approach fails
            }
            return;
        }

        // Handle Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            // Dispatch a custom save event that parent components can listen for
            const saveEvent = new CustomEvent('editor-save-triggered', {
                bubbles: true,
                detail: { editorId: editorId.current }
            });
            containerRef.current?.dispatchEvent(saveEvent);
            return;
        }

        // Only process markdown when we're in an editable area
        const target = e.target as HTMLElement;
        if (!target.isContentEditable) return;

        // Get the current selection and the containing block
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const blockElement = target.closest('.ce-block');
        if (!blockElement) return;

        // Get text content before cursor
        const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';

        // Handle markdown formatting shortcuts
        if (e.key === 'Enter' && !e.shiftKey) {
            // # for heading
            if (/^#+\s/.test(textBeforeCursor)) {
                e.preventDefault();
                const level = textBeforeCursor.match(/^(#+)/)?.[0].length || 1;
                if (level > 0 && level <= 6) {
                    // Get the text without the # characters
                    const text = textBeforeCursor.replace(/^#+\s/, '');

                    // Get the current block index
                    const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                    // Replace the current block with a header
                    editorRef.current.blocks.delete(currentBlockIndex);
                    editorRef.current.blocks.insert('header', {
                        text: text,
                        level: level
                    }, {}, currentBlockIndex, true);

                    return;
                }
            }

            // * or - or + for unordered list
            if (/^\s*[-*+]\s/.test(textBeforeCursor)) {
                e.preventDefault();
                const text = textBeforeCursor.replace(/^\s*[-*+]\s/, '');

                // Get the current block index
                const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                // Replace the current block with a list
                editorRef.current.blocks.delete(currentBlockIndex);
                editorRef.current.blocks.insert('list', {
                    style: 'unordered',
                    items: [text]
                }, {}, currentBlockIndex, true);

                return;
            }

            // 1. for ordered list
            if (/^\s*\d+\.\s/.test(textBeforeCursor)) {
                e.preventDefault();
                const text = textBeforeCursor.replace(/^\s*\d+\.\s/, '');

                // Get the current block index
                const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                // Replace the current block with a list
                editorRef.current.blocks.delete(currentBlockIndex);
                editorRef.current.blocks.insert('list', {
                    style: 'ordered',
                    items: [text]
                }, {}, currentBlockIndex, true);

                return;
            }

            // > for quote
            if (/^\s*>\s/.test(textBeforeCursor)) {
                e.preventDefault();
                const text = textBeforeCursor.replace(/^\s*>\s/, '');

                // Get the current block index
                const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                // Replace the current block with a quote
                editorRef.current.blocks.delete(currentBlockIndex);
                editorRef.current.blocks.insert('quote', {
                    text: text,
                    caption: ''
                }, {}, currentBlockIndex, true);

                return;
            }

            // ``` for code block
            if (/^\s*```/.test(textBeforeCursor)) {
                e.preventDefault();

                // Get the current block index
                const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                // Replace the current block with a code block
                editorRef.current.blocks.delete(currentBlockIndex);
                editorRef.current.blocks.insert('code', {
                    code: ''
                }, {}, currentBlockIndex, true);

                return;
            }

            // [] or [ ] for checklist
            if (/^\s*\[\s?\]\s/.test(textBeforeCursor)) {
                e.preventDefault();
                const text = textBeforeCursor.replace(/^\s*\[\s?\]\s/, '');

                // Get the current block index
                const currentBlockIndex = editorRef.current.blocks.getCurrentBlockIndex();

                // Replace the current block with a checklist
                editorRef.current.blocks.delete(currentBlockIndex);
                editorRef.current.blocks.insert('checklist', {
                    items: [{
                        text: text,
                        checked: false
                    }]
                }, {}, currentBlockIndex, true);

                return;
            }
        }
    }, []);

    // Initialize editor only once
    useEffect(() => {
        if (!containerRef.current || editorInitialized) return;

        // Set the ID on the container element
        containerRef.current.id = editorId.current;

        let editor: EditorJS | null = null;

        // Helper function to handle Enter key in editor
        const handleEditorEnterKey = (e: KeyboardEvent) => {
            // Only handle Enter key events
            if (e.key === 'Enter' && !e.shiftKey) {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;

                const range = selection.getRangeAt(0);
                const startContainer = range.startContainer;

                // Check if we're at the end of a block
                const isAtEndOfBlock = range.startOffset === (startContainer.textContent?.length || 0);

                if (isAtEndOfBlock) {
                    // Let EditorJS handle it normally - don't interfere
                }
            }
        };

        // Short delay to ensure DOM is ready
        setTimeout(() => {
            try {
                // Configure EditorJS with proper settings
                editor = new EditorJS({
                    holder: editorId.current, // Use the ID as holder
                    data: dataRef.current,
                    tools: EDITOR_JS_TOOLS,
                    readOnly: readOnlyRef.current,
                    inlineToolbar: true,
                    placeholder: 'Type / for commands or use markdown formatting...',
                    autofocus: !readOnlyRef.current,
                    defaultBlock: 'paragraph',
                    minHeight: 100,
                    logLevel: 'ERROR',
                    onChange: (api: API) => {
                        // Call our memoized handler for each change
                        // This ensures changes are captured quickly
                        handleEditorChange(api);
                    },
                    // Make sure EditorJS triggers changes more frequently
                    onChange_debounce: 100, // Reduce internal debounce delay
                    // Add keyboard shortcuts
                    shortcut: true, // Enable keyboard shortcuts
                    hideToolbar: false, // Make sure toolbar is always available
                    // Configure toolbar to be more responsive
                    toolbar: {
                        visible: true,
                        position: 'top'
                    },
                    // Improve history tracking for better undo/redo
                    history: {
                        enabled: true, // Make sure history is enabled
                        maxLength: 50  // Allow more undo steps
                    },
                    // i18n configuration for better UI text
                    i18n: {
                        messages: {
                            ui: {
                                blockTunes: {
                                    toggler: {
                                        'Click to tune': 'Click to tune or use /'
                                    },
                                },
                                inlineToolbar: {
                                    converter: {
                                        'Convert to': 'Convert block to'
                                    }
                                },
                                toolbar: {
                                    toolbox: {
                                        'Add': 'Add block (or use /)'
                                    }
                                }
                            }
                        }
                    },
                    // Register commands for undo/redo actions
                    onReady: () => {
                        editorRef.current = editor;

                        setIsEditorReady(true);
                        setEditorInitialized(true);

                        // Initialize drag and drop if not in readOnly mode
                        if (!readOnlyRef.current && editor) {
                            try {
                                // Create a new DragDrop instance with custom border
                                dragDropInstanceRef.current = new DragDrop(editor, '2px dashed #3b82f6');
                            } catch (error) {
                                // Failed to initialize drag and drop
                            }

                            // Initialize slash command handler
                            handleSlashCommand(editor);

                            // Add keyboard shortcut and markdown handler
                            document.addEventListener('keydown', handleEditorKeydown);
                        }

                        // Add event listeners to all editor elements to prevent form submission
                        if (containerRef.current) {
                            const editorElement = containerRef.current;

                            // Add Enter key handler for editor
                            editorElement.addEventListener('keydown', handleEditorEnterKey as EventListener);

                            const allInputs = editorElement.querySelectorAll('input, [contenteditable="true"]');
                            allInputs.forEach(input => {
                                input.addEventListener('keydown', (e: Event) => {
                                    const keyEvent = e as KeyboardEvent;

                                    // Only stop propagation for Enter with Shift key
                                    // Allow normal Enter for creating new blocks
                                    if (keyEvent.key === 'Enter' && keyEvent.shiftKey) {
                                        e.stopPropagation();
                                    }
                                });
                            });
                        }
                    }
                } as unknown as EditorConfig);
            } catch (error) {
                // EditorJS initialization error
            }
        }, 50);  // 50ms delay for initialization

        // Cleanup function
        return () => {
            // Clean up drag drop instance
            dragDropInstanceRef.current = null;

            // Clean up editor
            if (editor && typeof editor.destroy === 'function') {
                try {
                    editor.destroy();
                } catch (err) {
                    // Error destroying editor
                }
            }

            // Remove event listeners
            if (containerRef.current) {
                containerRef.current.removeEventListener('keydown', handleEditorEnterKey as EventListener);
            }
            document.removeEventListener('keydown', handleEditorKeydown);

            editorRef.current = null;
            setIsEditorReady(false);
            setEditorInitialized(false);
        };
    }, [handleEditorChange, handleSlashCommand, handleEditorKeydown]); // Add the new handler to dependencies

    // Handler to prevent form submission
    const handleContainerEvents = (e: React.FormEvent) => {
        e.preventDefault();
        return false;
    };

    return (
        <div className="editor-wrapper">
            <div
                ref={containerRef}
                className={`editorjs-container ${readOnly ? 'readonly-editor' : 'editable-editor'}`}
                onSubmit={handleContainerEvents}
                onClick={(e) => e.stopPropagation()}
            />
            {!isEditorReady && (
                <div className="editor-loading">
                    <div className="loading-spinner"></div>
                </div>
            )}
            {/* Add a hint about shortcuts and markdown */}
            {!readOnly && (
                <div className="text-xs text-gray-400 mt-2 pl-2">
                    Tip: Type '/' for commands, or use markdown like # for headings, - for lists, {'>'} for quotes.
                </div>
            )}
        </div>
    );
};

export default memo(ReactEditor);