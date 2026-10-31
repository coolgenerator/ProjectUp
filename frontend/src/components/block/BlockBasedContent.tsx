import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useBlocks, Block } from '../../hooks/useBlocks';
import { OutputData } from '@editorjs/editorjs';
import ReactEditor from './ReactEditor';
import { useBeforeUnload, useLocation } from 'react-router-dom';

// Debounce helper function
const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
        }

        timeout = setTimeout(() => func(...args), waitFor);
    };
};

// Define constants for auto-save configuration
const AUTO_SAVE_INTERVAL = 60000; // 60 seconds
const AUTO_SAVE_STATUS_RESET_DELAY = 3000; // 3 seconds
const EDITOR_CHANGE_DEBOUNCE_DELAY = 100; // 100ms for more responsive typing
const MIN_TIME_BETWEEN_SAVES = 10000; // 10 seconds minimum between saves

// Define the component props
interface BlockBasedContentProps {
    projectSid: string;
    section: string;
    userPermissions: number;
    blockFilter?: (block: Block) => boolean;
    customTitle?: string;
    allBlocks?: Block[];
}

// Simple LoadingPage component
const LoadingPage = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// Auto-save status indicator component
const AutoSaveStatus: React.FC<{
    status: 'idle' | 'saving' | 'success' | 'error';
    lastSaveTime: Date | null;
}> = ({ status, lastSaveTime }) => {
    if (status === 'idle') return null;

    const statusClasses = {
        saving: 'text-blue-500',
        success: 'text-green-500',
        error: 'text-red-500'
    };

    const statusMessages = {
        saving: 'Auto-saving...',
        success: `Auto-saved ${lastSaveTime ? new Date(lastSaveTime).toLocaleTimeString() : ''}`,
        error: 'Auto-save failed'
    };

    return (
        <div className={`flex items-center text-xs mr-2 ${statusClasses[status]}`}>
            {status === 'saving' && (
                <span className="animate-spin h-3 w-3 border-t-2 border-b-2 border-current rounded-full mr-1"></span>
            )}
            {status === 'success' && (
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            )}
            {status === 'error' && (
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
            {statusMessages[status]}
        </div>
    );
};

// Block for Editor.js data structure
interface EditorBlock {
    type: string;
    data: Record<string, any>;
}

// Interface for Editor.js data
interface EditorData extends OutputData {
    time: number;
    blocks: EditorBlock[];
    version: string;
}

// Interface for Block Create request
interface BlockRequest {
    type: string;
    title: string;
    content?: any;
    parent_id?: number;
    sort_order?: number;
    color?: string;
    icon?: string;
    project_sid?: string;
    description?: string;
    editorjs_content?: any;
}

// Alias for consistency with the handleSaveContent function
type BlockCreateData = BlockRequest;

// Helper function to get a user-friendly display name for a block type
const getDisplayNameForBlockType = (blockType: string): string => {
    const typeMap: Record<string, string> = {
        'page': 'Page',
        'todo': 'Todo List',
        'text': 'Document',
        'database': 'Database',
        'overview': 'Overview',
        'task': 'Tasks',
        'link': 'Resources',
        'embed': 'Workspace',
        'meeting': 'Meetings',
        'members': 'Team Members',
        'settings': 'Settings'
    };

    return typeMap[blockType] || blockType.charAt(0).toUpperCase() + blockType.slice(1);
};

const BlockBasedContent: React.FC<BlockBasedContentProps> = ({
    projectSid,
    section,
    // userPermissions,
    blockFilter,
    customTitle,
    // allBlocks = []
}) => {
    // Use the existing useBlocks hook
    const {
        blocks: unfilteredBlocks,
        loading,
        error,
        updateBlock,
        updateBlockWithEditorJS,
        // deleteBlock
    } = useBlocks({
        projectSid,
        blockType: section
    });

    // Apply the blockFilter if provided, with null checking
    const blocks = blockFilter && unfilteredBlocks.length > 0
        ? unfilteredBlocks.filter(block => block && blockFilter(block))
        : unfilteredBlocks;

    // State for section title - use customTitle if provided
    const [sectionTitle, setSectionTitle] = useState<string>(
        customTitle || getDisplayNameForBlockType(section)
    );

    // Update sectionTitle when customTitle changes
    useEffect(() => {
        if (customTitle) {
            setSectionTitle(customTitle);
        }
    }, [customTitle]);

    // State to track if content has been modified
    const [contentModified, setContentModified] = useState(false);

    // State for editor content
    const [editorContent, setEditorContent] = useState<EditorData | null>(null);

    // State for saving status
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);

    // Reference to track manual save time to prevent too frequent auto-saves
    const lastManualSaveTime = useRef<Date | null>(null);

    // Reference to track if we should auto-save
    const shouldAutoSave = useRef<boolean>(false);
    const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);

    // Reference to always have the latest editor content
    const currentEditorContent = useRef<EditorData | null>(null);

    // Update the content ref whenever editorContent changes
    useEffect(() => {
        currentEditorContent.current = editorContent;
    }, [editorContent]);

    const location = useLocation();

    // Custom implementation for navigation blocking
    useEffect(() => {
        // If content is modified, we want to show a warning before navigation
        if (contentModified) {
            // Store the current pathname to detect navigation changes
            const currentPathname = location.pathname;

            // Function to handle navigation attempts
            const handleBeforeNavigate = (nextLocation: string) => {
                // Don't block navigation to the same path
                if (nextLocation === currentPathname) return true;

                // Confirm navigation with the user
                return window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
            };

            // Add a listener for clicks on all <a> elements
            const handleLinkClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');

                if (link &&
                    link.href &&
                    !link.target &&
                    link.href.startsWith(window.location.origin) &&
                    !e.ctrlKey && !e.metaKey) {

                    const nextPath = link.href.replace(window.location.origin, '');

                    if (!handleBeforeNavigate(nextPath)) {
                        e.preventDefault();
                    }
                }
            };

            document.addEventListener('click', handleLinkClick);

            // Clean up function
            return () => {
                document.removeEventListener('click', handleLinkClick);
            };
        }
    }, [contentModified, location]);

    // Set up beforeunload event handler to warn the user if they try to leave with unsaved changes
    useBeforeUnload(
        useCallback(
            (event) => {
                if (contentModified) {
                    // Standard message that browsers will display
                    event.preventDefault();
                    return 'You have unsaved changes. Are you sure you want to leave?';
                }
            },
            [contentModified]
        )
    );

    // Monitor route changes for within-app navigation
    useEffect(() => {
        // Setup the listener for route changes
        const warningHandler = (e: BeforeUnloadEvent) => {
            if (contentModified) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                e.returnValue = message;
                return message;
            }
        };

        // Add the handler to warn on page unload
        window.addEventListener('beforeunload', warningHandler);

        // Clean up the handler when the component unmounts
        return () => {
            window.removeEventListener('beforeunload', warningHandler);
        };
    }, [contentModified, location]);

    // Debounced version of handleEditorChange to avoid frequent state updates
    const debouncedEditorChange = useCallback(
        debounce((outputData: OutputData) => {
            // Update the currentEditorContent ref immediately
            currentEditorContent.current = outputData as EditorData;
            // Then update state
            setContentModified(true);
            setEditorContent(outputData as EditorData);
        }, EDITOR_CHANGE_DEBOUNCE_DELAY),
        []
    );

    // Function to handle saving editor content
    const handleSaveContent = async (forceCreate = false, isAutoSave = false) => {
        // Always use the current content from the ref
        const contentToUse = currentEditorContent.current || editorContent;

        if (!contentToUse || (!contentModified && !forceCreate)) {
            return;
        }

        // If not an auto-save, update the last manual save time
        if (!isAutoSave) {
            lastManualSaveTime.current = new Date();
            setIsSaving(true);
        } else {
            // If it's an auto-save, check if we've recently done a manual save
            const now = new Date();
            if (lastManualSaveTime.current) {
                const timeSinceLastManualSave = now.getTime() - lastManualSaveTime.current.getTime();
                if (timeSinceLastManualSave < MIN_TIME_BETWEEN_SAVES) {
                    return;
                }
            }

            // Also check if we've recently done an auto-save
            if (lastAutoSaveTime) {
                const timeSinceLastAutoSave = now.getTime() - lastAutoSaveTime.getTime();
                if (timeSinceLastAutoSave < MIN_TIME_BETWEEN_SAVES) {
                    return;
                }
            }
        }

        setSaveError(null);

        try {
            // Find the ID of the block to update, or determine if we need to create a new one
            let targetBlockId: number | null = null;

            // Look for an existing block to update with null checking
            if (blocks.length > 0) {
                if (blockFilter) {
                    const filteredBlock = blocks.find(block => block && blockFilter(block));
                    if (filteredBlock) {
                        targetBlockId = filteredBlock.block_id;
                    }
                } else {
                    // Find first block of the correct type, prioritizing root blocks with null checking
                    const rootBlock = blocks.find(b => b && b.type === section && (!b.parent_id || b.parent_id === 0));

                    if (rootBlock) {
                        targetBlockId = rootBlock.block_id;
                    } else {
                        // Fallback to any block of the correct type with null checking
                        const anyBlock = blocks.find(b => b && b.type === section);
                        if (anyBlock) {
                            targetBlockId = anyBlock.block_id;
                        }
                    }
                }
            }

            // Determine if this is a special section type that needs specific handling
            const isSpecialSection =
                customTitle === 'Project Roadmap' ||
                customTitle === 'Project Checklist' ||
                customTitle === 'Curriculum Alignment';

            // Set up color and icon for special sections
            let color = undefined;
            let icon = undefined;
            let blockType = section;

            if (isSpecialSection) {
                if (customTitle === 'Project Roadmap') {
                    color = 'roadmap';
                    icon = 'timeline';
                    blockType = 'page';
                } else if (customTitle === 'Project Checklist') {
                    color = 'checklist';
                    icon = 'check-square';
                    blockType = 'todo';
                } else if (customTitle === 'Curriculum Alignment') {
                    color = 'curriculum';
                    icon = 'book';
                    blockType = 'database';
                }
            }

            // Make a copy of the content to avoid modifying the reference
            const contentCopy = JSON.parse(JSON.stringify(contentToUse));

            // Remove any potential duplicate blocks before saving
            if (contentCopy.blocks) {
                const uniqueBlocks = dedupBlocks(contentCopy.blocks);
                contentCopy.blocks = uniqueBlocks;
            }

            // Format content based on section type
            let contentToSave;

            if (customTitle === 'Project Checklist') {
                // Convert EditorJS format to checklist items format
                const checklistItems = contentCopy.blocks.map((block: EditorBlock) => {
                    // Default category and priority
                    const category = 'Development';
                    const priority = 'Medium';

                    // Extract text from the block
                    let description = '';
                    if (block.type === 'paragraph') {
                        description = block.data.text;
                    } else if (block.type === 'header') {
                        description = block.data.text;
                    } else if (block.type === 'list') {
                        description = block.data.items.join(', ');
                    } else if (block.type === 'checklist') {
                        description = block.data.items
                            .map((item: { text: string }) => item.text)
                            .join(', ');
                    }

                    return { description, category, priority };
                }).filter((item: { description: string }) => item.description.trim() !== '');

                // Special format for checklist
                contentToSave = {
                    checklist: {
                        items: checklistItems
                    },
                    editorjs_content: contentCopy
                };
            } else {
                // Standard EditorJS format for other sections
                contentToSave = contentCopy;
            }

            // Create block data object
            const blockData: BlockCreateData = {
                project_sid: projectSid,
                title: sectionTitle,
                type: blockType,
                content: contentToSave,
                sort_order: 0
            };

            // Add color and icon for special sections
            if (color) blockData.color = color;
            if (icon) blockData.icon = icon;

            // Try to extract a brief description from the content for preview purposes
            if (contentCopy.blocks.length > 0) {
                const paragraphs = contentCopy.blocks.filter((b: EditorBlock) => b.type === 'paragraph');
                if (paragraphs.length > 0) {
                    blockData.description = extractDescription(contentCopy);
                }
            }

            // Update or create the block
            if (targetBlockId && !forceCreate) {
                const updateData: {
                    title: string;
                    content: any;
                    type: string;
                    color?: string;
                    icon?: string;
                } = {
                    title: sectionTitle,
                    content: contentToSave,
                    type: blockType
                };

                // Add color and icon for special sections
                if (color) updateData.color = color;
                if (icon) updateData.icon = icon;

                try {
                    // First try using the specialized EditorJS update function
                    const result = await updateBlockWithEditorJS(targetBlockId, updateData);

                    if (result) {
                        // Only update the modified state for manual saves
                        if (!isAutoSave) {
                            setContentModified(false);
                        }
                    }
                } catch (editorJsError) {
                    // If EditorJS update fails, try the regular update endpoint as fallback
                    try {
                        const fallbackResult = await updateBlock(targetBlockId, updateData);

                        if (!fallbackResult) {
                            throw new Error('Both update methods failed');
                        }
                    } catch (fallbackError) {
                        throw new Error('Failed to update content with any available method');
                    }
                }
            } else {
                if (!isAutoSave) {
                    setContentModified(false);
                }
            }

            if (!isAutoSave) {
                setIsSaving(false);
            }

            return true; // Return a value to support Promise chaining
        } catch (error) {
            setSaveError('Failed to save content. Please try again.');

            if (!isAutoSave) {
                setIsSaving(false);
            }

            // Rethrow for the auto-save promise chain
            if (isAutoSave) {
                throw error;
            }

            return false;
        }
    };

    // Memoized version of handleSaveContent to use in dependency lists
    const memoizedHandleSaveContent = useCallback(
        async (forceCreate = false, isAutoSave = false) => {
            return handleSaveContent(forceCreate, isAutoSave);
        },
        [blocks, blockFilter, section, sectionTitle, projectSid, currentEditorContent, editorContent, customTitle]
    );

    // Use memoizedHandleSaveContent in the useEffect dependencies
    useEffect(() => {
        // Clear any existing interval when dependencies change
        if (autoSaveInterval.current) {
            clearInterval(autoSaveInterval.current);
            autoSaveInterval.current = null;
        }

        // References to track status reset timeouts
        const statusResetTimeouts: number[] = [];

        // Start auto-save timer if content is modified
        if (contentModified) {
            shouldAutoSave.current = true;

            // Auto-save at the configured interval
            autoSaveInterval.current = setInterval(() => {
                if (shouldAutoSave.current && contentModified && !isSaving) {
                    // Check if we've recently done a manual save
                    const now = new Date();
                    if (lastManualSaveTime.current) {
                        const timeSinceLastManualSave = now.getTime() - lastManualSaveTime.current.getTime();
                        if (timeSinceLastManualSave < MIN_TIME_BETWEEN_SAVES) {
                            return;
                        }
                    }

                    setAutoSaveStatus('saving');

                    // Execute the save without causing a page refresh
                    // Use a promise to handle the async operation
                    (async () => {
                        try {
                            await memoizedHandleSaveContent(false, true);
                            setAutoSaveStatus('success');
                            setLastAutoSaveTime(new Date());

                            // Reset status after a delay
                            const timeoutId = window.setTimeout(() => {
                                setAutoSaveStatus('idle');
                            }, AUTO_SAVE_STATUS_RESET_DELAY);
                            statusResetTimeouts.push(timeoutId);
                        } catch (err) {
                            setAutoSaveStatus('error');

                            // Reset status after a delay
                            const timeoutId = window.setTimeout(() => {
                                setAutoSaveStatus('idle');
                            }, AUTO_SAVE_STATUS_RESET_DELAY);
                            statusResetTimeouts.push(timeoutId);
                        }
                    })();
                }
            }, AUTO_SAVE_INTERVAL);
        } else {
            // If content is no longer modified, we don't need to auto-save
            shouldAutoSave.current = false;
        }

        // Clean up the interval and any pending timeouts when component unmounts or when dependencies change
        return () => {
            // Clear the auto-save interval
            if (autoSaveInterval.current) {
                clearInterval(autoSaveInterval.current);
                autoSaveInterval.current = null;
            }

            // Clear all status reset timeouts
            statusResetTimeouts.forEach(timeoutId => {
                window.clearTimeout(timeoutId);
            });
        };
    }, [contentModified, isSaving, memoizedHandleSaveContent]);

    // Effect to parse content from block into EditorJS format
    useEffect(() => {
        // Skip reloading if content is modified - this prevents losing changes on auto-refresh
        if (contentModified) {
            return;
        }

        if (!loading && blocks.length > 0) {
            try {
                // Find the target block based on filter or type with null checking
                const targetBlock = blockFilter
                    ? blocks.find(block => block && blockFilter(block))
                    : blocks.find(block => block && block.type === section);

                if (targetBlock) {
                    // Try to parse the content as EditorJS format
                    let editorData: EditorData | null = null;

                    // Check first if there's valid editorjs_content field - highest priority
                    if (targetBlock.editorjs_content) {
                        if (typeof targetBlock.editorjs_content === 'string') {
                            try {
                                const parsed = JSON.parse(targetBlock.editorjs_content);
                                if (parsed && parsed.time && parsed.blocks && Array.isArray(parsed.blocks) && parsed.version) {
                                    editorData = parsed as EditorData;
                                }
                            } catch (parseError) {
                                // Error parsing editorjs_content string
                            }
                        } else if (typeof targetBlock.editorjs_content === 'object' && targetBlock.editorjs_content !== null) {
                            const content = targetBlock.editorjs_content as any;
                            if (content && content.time && content.blocks && Array.isArray(content.blocks) && content.version) {
                                editorData = content as EditorData;
                            }
                        }
                    }

                    // If no valid editorjs_content, try the content field
                    if (!editorData) {
                        if (typeof targetBlock.content === 'string') {
                            try {
                                const parsed = JSON.parse(targetBlock.content);
                                // IMPORTANT: Check if the content is directly an EditorJS format
                                if (parsed && parsed.time && parsed.blocks && Array.isArray(parsed.blocks) && parsed.version) {
                                    editorData = parsed as EditorData;
                                }
                                // Avoid parsing content.editor_data or nested structures
                            } catch (parseError) {
                                // Error parsing content string
                            }
                        } else if (typeof targetBlock.content === 'object' && targetBlock.content !== null) {
                            const content = targetBlock.content as any;
                            // IMPORTANT: Check if the content is directly an EditorJS format
                            if (content && content.time && content.blocks && Array.isArray(content.blocks) && content.version) {
                                editorData = content as EditorData;
                            }
                            // Avoid accessing nested properties like content.editor_data
                        }
                    }

                    // If we found valid EditorJS data, use it
                    if (editorData && editorData.blocks && Array.isArray(editorData.blocks)) {
                        // Check for duplicate blocks due to nesting
                        if (hasDuplicateBlocks(editorData.blocks)) {
                            editorData.blocks = dedupBlocks(editorData.blocks);
                        }

                        setEditorContent(editorData);
                        // Make sure we update the ref too
                        currentEditorContent.current = editorData;
                        return;
                    }
                }

                // If no valid content found or no block exists, create default content

                // Create default blocks based on the section type
                const defaultBlocks: EditorBlock[] = [
                    {
                        type: 'header',
                        data: {
                            text: sectionTitle,
                            level: 2
                        }
                    },
                    {
                        type: 'paragraph',
                        data: {
                            text: 'Start creating content here.'
                        }
                    }
                ];

                const defaultData: EditorData = {
                    time: Date.now(),
                    blocks: defaultBlocks,
                    version: '2.28.0'
                };

                setEditorContent(defaultData);
                // Make sure we update the ref too
                currentEditorContent.current = defaultData;
                setContentModified(false);
            } catch (error) {
                // Error rendering content
            }
        }
    }, [blocks, section, sectionTitle, loading, customTitle, blockFilter, contentModified]);

    // Helper to detect duplicate blocks that might come from nested structures
    const hasDuplicateBlocks = (blocks: EditorBlock[]): boolean => {
        const ids = new Set<string>();
        for (const block of blocks) {
            if ('id' in block && block.id) {
                if (ids.has(block.id as string)) {
                    return true;
                }
                ids.add(block.id as string);
            }
        }
        return false;
    };

    // Helper to remove duplicate blocks with the same id
    const dedupBlocks = (blocks: EditorBlock[]): EditorBlock[] => {
        const seen = new Set<string>();
        const contentSignatures = new Set<string>();

        return blocks.filter(block => {
            // First dedup by ID if available
            if ('id' in block && block.id) {
                const id = block.id as string;
                if (seen.has(id)) return false;
                seen.add(id);
            }

            // Then dedup by content signature (type + content)
            const contentSignature = JSON.stringify({
                type: block.type,
                data: block.data
            });

            if (contentSignatures.has(contentSignature)) return false;
            contentSignatures.add(contentSignature);
            return true;
        });
    };

    // Helper to extract a description from editor content for block preview
    const extractDescription = (data: EditorData): string => {
        if (!data || !data.blocks || data.blocks.length === 0) {
            return '';
        }

        // Find the first paragraph or header block
        const firstTextBlock = data.blocks.find(
            (block: any) => block.type === 'paragraph' || block.type === 'header'
        );

        if (firstTextBlock) {
            let text = '';
            if (firstTextBlock.type === 'paragraph') {
                text = firstTextBlock.data.text;
            } else if (firstTextBlock.type === 'header') {
                text = firstTextBlock.data.text;
            }

            // Strip HTML tags and truncate if needed
            const plainText = text.replace(/<[^>]*>/g, '');
            return plainText.length > 150 ? plainText.substring(0, 147) + '...' : plainText;
        }

        return '';
    };

    // Handle the editor-save-triggered custom event
    useEffect(() => {
        const handleEditorSave = (e: any) => {
            // Always prevent default browser behavior
            e.preventDefault?.();
            e.stopPropagation?.();

            if (contentModified) {
                memoizedHandleSaveContent();
            }
            return false; // Ensure we block any default behavior
        };

        // Listen for the custom editor save event
        const editorContainer = document.querySelector('.editorjs-container');
        if (editorContainer) {
            editorContainer.addEventListener('editor-save-triggered', handleEditorSave);
        }

        // Also listen for Ctrl+S directly at the document level with a very high priority
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                // Prevent browser's save dialog with highest priority
                e.preventDefault();
                e.stopPropagation();
                if (contentModified) {
                    memoizedHandleSaveContent();
                }
                return false;
            }
        };

        // Use capture phase and highest priority to intercept Ctrl+S before browser handles it
        document.addEventListener('keydown', handleKeyDown, {
            capture: true,
            passive: false
        });

        return () => {
            if (editorContainer) {
                editorContainer.removeEventListener('editor-save-triggered', handleEditorSave);
            }
            document.removeEventListener('keydown', handleKeyDown, {
                capture: true
            });
        };
    }, [contentModified, memoizedHandleSaveContent]);

    if (loading) {
        return <LoadingPage />;
    }

    if (error) {
        return (
            <div className="p-4 text-red-500 bg-red-50 rounded-md">
                {error}
            </div>
        );
    }

    return (
        <div
            className="block-content-container p-4 md:p-6 lg:p-8"
            onSubmit={(e) => {
                e.preventDefault(); // Prevent form submission
                e.stopPropagation();
                return false;
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">{sectionTitle}</h2>
                <div className="flex items-center space-x-2">
                    {saveError && (
                        <span className="text-red-500 text-sm mr-2">{saveError}</span>
                    )}
                    <AutoSaveStatus status={autoSaveStatus} lastSaveTime={lastAutoSaveTime} />
                    {contentModified && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                memoizedHandleSaveContent();
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            disabled={isSaving}
                            type="button"
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div
                className="bg-white rounded-lg shadow-sm p-3 border border-gray-200"
                data-no-form-submit="true"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.stopPropagation();
                    }
                }}
            >
                {editorContent ? (
                    <ReactEditor
                        data={editorContent}
                        onChange={debouncedEditorChange}
                        readOnly={false}
                    />
                ) : (
                    <div className="p-4 text-center text-gray-500">
                        Loading editor...
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockBasedContent; 