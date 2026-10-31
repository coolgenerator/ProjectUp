import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Block } from '../../hooks/useBlocks';

interface MilestoneBlockContainerProps {
    blocks: Block[];
    onEdit: (blockId: number, data: any) => void;
    onDelete: (blockId: number) => void;
    onAddChild: (parentId: number) => void;
    expandedIds?: number[];
    onToggleExpand?: (blockId: number) => void;
    title?: string; // Optional custom title
}

// Define interface for drag state
interface DragState {
    isDragging: boolean;
    draggedItemId: number | null;
    dragOverItemId: number | null;
}

export const MilestoneBlockContainer: React.FC<MilestoneBlockContainerProps> = ({
    blocks,
    onEdit,
    onDelete,
    onAddChild,
    expandedIds = [],
    onToggleExpand = () => { },
    title = "Tasks & Milestones" // Default title if none provided
}) => {
    // State for editing block title/description inline
    const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState('');
    const [editPriority, setEditPriority] = useState('');
    const [editCategory, setEditCategory] = useState('');

    // State for handling drag and drop
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedItemId: null,
        dragOverItemId: null
    });

    // State to track when hover is active on a block
    const [hoveredBlockId, setHoveredBlockId] = useState<number | null>(null);

    // State for menu
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<number | null>(null);

    // Add a local state for blocks at the top of the component, near other state declarations
    const [localBlocks, setLocalBlocks] = useState<Block[]>([]);

    // Add useEffect to sync localBlocks with props.blocks when they change
    useEffect(() => {
        setLocalBlocks(blocks);
    }, [blocks]);

    // Add a debug log at component init to check the props
    useEffect(() => {
        console.log('MilestoneBlock initialized with blocks:', blocks);
    }, []);

    // Add a function to normalize sort orders
    const normalizeSortOrders = (blocksToNormalize: Block[]): Block[] => {
        console.log("Normalizing sort orders for blocks:", blocksToNormalize);

        // Group blocks by parent_id
        const blocksByParent: { [key: string]: Block[] } = {};

        blocksToNormalize.forEach(block => {
            // Safely handle undefined or null parent_id
            const parentKey = (block.parent_id === null || block.parent_id === undefined) ? 'root' : block.parent_id.toString();
            if (!blocksByParent[parentKey]) {
                blocksByParent[parentKey] = [];
            }
            blocksByParent[parentKey].push(block);
        });

        // For each group, assign sequential sort orders
        const normalizedBlocks: Block[] = [];

        Object.keys(blocksByParent).forEach(parentKey => {
            // Sort by created_at to maintain some logical order
            const childBlocks = blocksByParent[parentKey].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Assign incremental sort orders (1, 2, 3...)
            childBlocks.forEach((block, index) => {
                normalizedBlocks.push({
                    ...block,
                    sort_order: (index + 1) * 10 // Use multiples of 10 to leave space between items
                });
            });
        });

        console.log("Normalized blocks:", normalizedBlocks);
        return normalizedBlocks;
    };

    // Modify the useEffect to normalize sort orders when blocks are loaded
    useEffect(() => {
        // Check if blocks have proper sort orders
        const allZeroSortOrder = blocks.every(block => block.sort_order === 0);
        const hasDuplicateSortOrders = new Set(blocks.map(b => b.sort_order)).size !== blocks.length;

        if (blocks.length > 0 && (allZeroSortOrder || hasDuplicateSortOrders)) {
            console.log("Detected invalid sort orders - normalizing...");
            const normalized = normalizeSortOrders(blocks);

            // Apply normalized sort orders to local state
            setLocalBlocks(normalized);

            // Update sort orders in the backend
            normalized.forEach(block => {
                console.log(`Updating backend sort order for block ${block.block_id} to ${block.sort_order}`);
                onEdit(block.block_id, {
                    type: 'task',
                    sort_order: block.sort_order
                });
            });
        } else {
            // Normal case - just sync the local blocks
            setLocalBlocks(blocks);
        }

        console.log('MilestoneBlock initialized with blocks:', blocks);
    }, [blocks]);

    // Add a function to sort local blocks by sort_order consistently
    const sortBlocksConsistently = (blocksToSort: Block[]): Block[] => {
        // First sort by parent_id (null/undefined parents come first)
        // Then by sort_order within each parent group
        return [...blocksToSort].sort((a: Block, b: Block) => {
            // First group by parent_id
            if (!a.parent_id && b.parent_id) return -1;
            if (a.parent_id && !b.parent_id) return 1;
            if (a.parent_id !== b.parent_id) return (a.parent_id || 0) - (b.parent_id || 0);

            // Then sort by sort_order
            return a.sort_order - b.sort_order;
        });
    };

    // Improve the rootBlocks definition to ensure it's always sorted by sort_order
    const rootBlocks = useMemo(() => {
        console.log("Recalculating root blocks with sort order");
        return sortBlocksConsistently(localBlocks)
            .filter(block => !block.parent_id);
    }, [localBlocks]);

    // Update the getChildBlocks function to be more explicit about sorting
    const getChildBlocks = useCallback((parentId: number) => {
        console.log(`Getting children of ${parentId} with explicit sorting`);
        return localBlocks
            .filter(block => block.parent_id === parentId)
            .sort((a: Block, b: Block) => a.sort_order - b.sort_order);
    }, [localBlocks]);

    // Function to create a new item
    const createNewItem = () => {
        onAddChild(0);
    };

    // Function to toggle item expanded state
    const toggleExpand = (blockId: number) => {
        onToggleExpand(blockId);
    };

    // Function to start editing a block
    const startEditing = (block: Block) => {
        setEditingBlockId(block.block_id);
        setEditTitle(block.title);
        setEditDescription(block.content?.description || '');
        setEditDeadline(block.content?.due_date || '');
        setEditPriority(block.content?.priority || 'Medium');
        setEditCategory(block.content?.category || '');
    };

    // Modify the handleEdit function to prevent page refreshes
    const handleEdit = (blockId: number, data: any) => {
        console.log(`Editing block ${blockId} with data:`, data);

        // Keep a reference to the current sort order from local state
        const blockToEdit = localBlocks.find(b => b.block_id === blockId);
        if (!blockToEdit) {
            console.error(`Block with ID ${blockId} not found in local state`);
            return onEdit(blockId, data);
        }

        // Update local state immediately for better UX
        const updatedBlocks = localBlocks.map(block =>
            block.block_id === blockId
                ? {
                    ...block,
                    ...data,
                    // Preserve existing properties that aren't being updated
                    type: data.type || block.type,
                    parent_id: data.parent_id !== undefined ? data.parent_id : block.parent_id,
                    sort_order: data.sort_order !== undefined ? data.sort_order : block.sort_order,
                    title: data.title || block.title,
                    content: data.content ? { ...block.content, ...data.content } : block.content
                }
                : block
        );

        // Sort the blocks properly before updating state
        const sortedBlocks = sortBlocksConsistently(updatedBlocks);
        setLocalBlocks(sortedBlocks);

        // Don't trigger refetch - this is causing the page refresh
        // Call the parent onEdit without triggering a refetch
        return onEdit(blockId, data);
    };

    // Function to save edits
    const saveEdits = (blockId: number) => {
        handleEdit(blockId, {
            type: 'task', // required field for the server
            title: editTitle,
            content: {
                ...blocks.find(b => b.block_id === blockId)?.content,
                description: editDescription,
                due_date: editDeadline,
                priority: editPriority,
                category: editCategory
            }
        });
        setEditingBlockId(null);
    };

    // Function to toggle completion status
    const toggleComplete = (block: Block) => {
        handleEdit(block.block_id, {
            type: 'task', // required field for the server
            content: {
                ...block.content,
                completed: !block.content?.completed
            }
        });
    };

    // Function to update status
    const updateStatus = (block: Block, newStatus: string) => {
        handleEdit(block.block_id, {
            type: 'task', // required field for the server
            content: {
                ...block.content,
                status: newStatus
            }
        });
    };

    // Menu handlers
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, blockId: number) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });
        setActiveBlockId(blockId);
    };

    const handleMenuClose = () => {
        setMenuPosition(null);
        setActiveBlockId(null);
    };

    // Add click-away listener for menu
    useEffect(() => {
        const handleClickAway = (e: MouseEvent) => {
            if (menuPosition) {
                const target = e.target as HTMLElement;
                if (!target.closest('.milestone-menu')) {
                    handleMenuClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickAway);
        return () => {
            document.removeEventListener('mousedown', handleClickAway);
        };
    }, [menuPosition]);

    // Duplicate a block
    const duplicateBlock = (blockId: number) => {
        const blockToDuplicate = blocks.find(b => b.block_id === blockId);
        if (!blockToDuplicate) return;

        const parentId = blockToDuplicate.parent_id || 0;

        // Close menu and create a duplicate
        handleMenuClose();
        // Create a duplicate by calling onEdit with a new block ID (would be assigned by backend)
        onAddChild(parentId);
        // Note: Ideally the backend would support passing a template to onAddChild
    };

    // Move block up in order
    const moveBlockUp = (blockId: number) => {
        // Gather siblings at the same level
        const currentBlock = localBlocks.find((b: Block) => b.block_id === blockId);
        if (!currentBlock) return;

        const siblings = localBlocks
            .filter((b: Block) => b.parent_id === currentBlock.parent_id)
            .sort((a, b) => a.sort_order - b.sort_order);

        const index = siblings.findIndex((b: Block) => b.block_id === blockId);
        if (index <= 0) return; // Already at the top

        const previousBlock = siblings[index - 1];
        // Move this block before the previous one
        handleEdit(blockId, {
            type: 'task',
            sort_order: previousBlock.sort_order - 0.1
        });

        handleMenuClose();
    };

    // Move block down in order
    const moveBlockDown = (blockId: number) => {
        // Gather siblings at the same level
        const currentBlock = localBlocks.find((b: Block) => b.block_id === blockId);
        if (!currentBlock) return;

        const siblings = localBlocks
            .filter((b: Block) => b.parent_id === currentBlock.parent_id)
            .sort((a, b) => a.sort_order - b.sort_order);

        const index = siblings.findIndex((b: Block) => b.block_id === blockId);
        if (index >= siblings.length - 1) return; // Already at the bottom

        const nextBlock = siblings[index + 1];
        // Move this block after the next one
        handleEdit(blockId, {
            type: 'task',
            sort_order: nextBlock.sort_order + 0.1
        });

        handleMenuClose();
    };

    // Check if a block has children
    const hasChildren = (blockId: number) => {
        return localBlocks.some(block => block.parent_id === blockId);
    };

    // Check if a block is expanded
    const isExpanded = (blockId: number) => {
        return expandedIds.includes(blockId);
    };

    // Helper function to get color classes for status tag
    const getStatusClasses = (status: string): string => {
        switch (status) {
            case "Completed": return "bg-green-100 text-green-700 border-green-300";
            case "In Progress": return "bg-blue-100 text-blue-700 border-blue-300";
            case "Blocked": return "bg-red-100 text-red-700 border-red-300";
            case "At Risk": return "bg-orange-100 text-orange-700 border-orange-300";
            default: return "bg-gray-100 text-gray-700 border-gray-300";
        }
    };

    // Helper function to get priority classes
    const getPriorityClasses = (priority: string): string => {
        switch (priority) {
            case "High": return "bg-red-100 text-red-700 border-red-300";
            case "Medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
            case "Low": return "bg-green-100 text-green-700 border-green-300";
            default: return "bg-gray-100 text-gray-700 border-gray-300";
        }
    };

    // Format date to be more user friendly
    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    // Drag event handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, blockId: number) => {
        e.dataTransfer.setData('blockId', blockId.toString());
        setDragState({
            isDragging: true,
            draggedItemId: blockId,
            dragOverItemId: null
        });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, blockId: number) => {
        e.preventDefault();
        if (dragState.draggedItemId !== blockId) {
            setDragState(prev => ({
                ...prev,
                dragOverItemId: blockId
            }));
        }
    };

    // Modify our drag handler to properly handle sort order without triggering refreshes
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const { draggedItemId, dragOverItemId } = dragState;

        console.log(`Drag ended - Dragged: ${draggedItemId}, Target: ${dragOverItemId}`);

        if (draggedItemId && dragOverItemId && draggedItemId !== dragOverItemId) {
            // Find the blocks in question
            const sourceBlock = localBlocks.find(b => b.block_id === draggedItemId);
            const targetBlock = localBlocks.find(b => b.block_id === dragOverItemId);

            console.log('Source block:', sourceBlock);
            console.log('Target block:', targetBlock);

            if (sourceBlock && targetBlock) {
                // Get parent scope - whether we're reordering within the same parent
                const sameParentScope = sourceBlock.parent_id === targetBlock.parent_id;

                // Create a deep copy of blocks to work with
                const updatedBlocks = JSON.parse(JSON.stringify(localBlocks)) as Block[];
                const sourceIndex = updatedBlocks.findIndex((b: Block) => b.block_id === draggedItemId);

                if (sameParentScope) {
                    // Calculate new sort order - place it between the target and the next item
                    // Find siblings to determine sort order
                    const siblings = localBlocks
                        .filter(b => b.parent_id === targetBlock.parent_id)
                        .sort((a, b) => a.sort_order - b.sort_order);

                    console.log('All siblings in order:', siblings.map(s => ({ id: s.block_id, order: s.sort_order })));

                    const targetIndex = siblings.findIndex(b => b.block_id === targetBlock.block_id);
                    let newSortOrder;

                    if (targetIndex === siblings.length - 1) {
                        // If target is the last item, add 1.0 to its sort order
                        newSortOrder = targetBlock.sort_order + 1.0;
                    } else {
                        // Otherwise place it between target and next item
                        const nextItem = siblings[targetIndex + 1];
                        newSortOrder = targetBlock.sort_order +
                            (nextItem.sort_order - targetBlock.sort_order) / 2;
                    }

                    console.log(`New sort order: ${newSortOrder} (calculated between ${targetBlock.sort_order} and next item)`);

                    // Update locally first
                    if (sourceIndex !== -1) {
                        updatedBlocks[sourceIndex] = {
                            ...sourceBlock,
                            sort_order: newSortOrder
                        };
                    }

                    // Sort the blocks explicitly
                    const sortedBlocks = sortBlocksConsistently(updatedBlocks);

                    // Apply local update immediately for responsive UI
                    setLocalBlocks(sortedBlocks);
                    console.log('Updated local blocks with new order', sortedBlocks.map(b => ({ id: b.block_id, parent: b.parent_id, order: b.sort_order })));

                    // Then update on backend without triggering a refetch
                    console.log(`Updating backend for block ${draggedItemId} with new sort order ${newSortOrder}`);
                    onEdit(draggedItemId, {
                        type: 'task',
                        sort_order: newSortOrder
                    });
                } else {
                    // Moving to a different parent
                    // Calculate appropriate sort order in new parent context
                    const newSiblings = localBlocks
                        .filter(b => b.parent_id === targetBlock.parent_id)
                        .sort((a, b) => a.sort_order - b.sort_order);

                    console.log('New parent siblings:', newSiblings.map(s => ({ id: s.block_id, order: s.sort_order })));

                    let newSortOrder;

                    if (newSiblings.length === 0) {
                        // If no siblings, use 1.0 as the sort order
                        newSortOrder = 1.0;
                    } else {
                        // Add it after the target
                        const targetIndex = newSiblings.findIndex(b => b.block_id === targetBlock.block_id);

                        if (targetIndex === newSiblings.length - 1) {
                            // If target is the last item, add 1.0 to its sort order
                            newSortOrder = targetBlock.sort_order + 1.0;
                        } else {
                            // Otherwise place it between target and next item
                            const nextItem = newSiblings[targetIndex + 1];
                            newSortOrder = targetBlock.sort_order +
                                (nextItem.sort_order - targetBlock.sort_order) / 2;
                        }
                    }

                    console.log(`New parent and sort order: parent=${targetBlock.parent_id}, order=${newSortOrder}`);

                    // Update locally first
                    if (sourceIndex !== -1) {
                        updatedBlocks[sourceIndex] = {
                            ...sourceBlock,
                            parent_id: targetBlock.parent_id,
                            sort_order: newSortOrder
                        };
                    }

                    // Sort the blocks explicitly
                    const sortedBlocks = sortBlocksConsistently(updatedBlocks);

                    // Apply local update immediately for responsive UI
                    setLocalBlocks(sortedBlocks);
                    console.log('Updated local blocks with new parent and order', sortedBlocks.map(b => ({ id: b.block_id, parent: b.parent_id, order: b.sort_order })));

                    // Then update on backend without triggering a refetch
                    console.log(`Updating backend for block ${draggedItemId} with new parent ${targetBlock.parent_id} and sort order ${newSortOrder}`);
                    onEdit(draggedItemId, {
                        type: 'task',
                        parent_id: targetBlock.parent_id,
                        sort_order: newSortOrder
                    });
                }

                console.log(`Moved block ${draggedItemId} ${sameParentScope ? 'within same parent' : 'to new parent'} with new sort order`);
            }
        }

        // Reset drag state
        setDragState({
            isDragging: false,
            draggedItemId: null,
            dragOverItemId: null
        });
    };

    // Drag leave handler
    const handleDragLeave = () => {
        // Only update if we're not dragging over another element
        setTimeout(() => {
            if (dragState.dragOverItemId && !document.querySelector('.drag-over')) {
                setDragState(prev => ({
                    ...prev,
                    dragOverItemId: null
                }));
            }
        }, 50);
    };

    // Add block before
    const addBlockBefore = (blockId: number) => {
        const block = blocks.find(b => b.block_id === blockId);
        if (!block) return;

        const parentId = block.parent_id || 0;

        // First add the block at the parent level
        onAddChild(parentId);

        // Then in a separate step, update its sort order
        // Note: In real implementation, you would want to get the new block's ID
        // and then update it, or have a more sophisticated API
        handleMenuClose();
    };

    // Add block after
    const addBlockAfter = (blockId: number) => {
        const block = blocks.find(b => b.block_id === blockId);
        if (!block) return;

        const parentId = block.parent_id || 0;

        // First add the block at the parent level
        onAddChild(parentId);

        // Then ideally update its sort order in a separate step
        handleMenuClose();
    };

    // Render a single block
    const renderTaskBlock = (block: Block) => {
        const isEditing = editingBlockId === block.block_id;
        const { priority = 'Medium', category = '', due_date = '' } = block.content || {};
        const isHovered = hoveredBlockId === block.block_id;
        const isDragging = dragState.draggedItemId === block.block_id;
        const isDraggedOver = dragState.dragOverItemId === block.block_id;

        return (
            <div
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, block.block_id)}
                onDragOver={(e) => handleDragOver(e, block.block_id)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                onMouseEnter={() => setHoveredBlockId(block.block_id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                className={`relative ${isDragging ? 'opacity-50' : ''} ${isDraggedOver ? 'border-t-2 border-blue-500 drag-over' : ''}`}
            >
                {/* Side Menu - only show when hovered */}
                <div
                    className={`absolute left-0 top-0 h-full flex items-center ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 z-10`}
                    style={{ transform: 'translateX(-100%)' }}
                >
                    <div className="bg-white rounded-lg shadow-md p-1 mr-1 flex flex-col space-y-1 border border-gray-200">
                        {/* Add button */}
                        <button
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                            onClick={() => addBlockBefore(block.block_id)}
                            title="Add block before"
                        >
                            <span className="text-lg">+</span>
                        </button>

                        {/* Drag handle - opens menu on click */}
                        <button
                            className="p-1.5 cursor-grab text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                            onClick={(e) => handleMenuOpen(e, block.block_id)}
                            title="More options"
                        >
                            <span className="text-lg">⋮⋮</span>
                        </button>
                    </div>
                </div>

                <div className="mb-3 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-all hover:shadow-lg shadow-sm">
                    <div className="p-4">
                        {isEditing ? (
                            <div className="flex flex-col space-y-2">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Title"
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Description"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <div className="relative">
                                        <label className="absolute -top-2 left-2 px-1 text-xs text-gray-600 bg-white">Deadline</label>
                                        <input
                                            type="date"
                                            value={editDeadline}
                                            onChange={(e) => setEditDeadline(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2 left-2 px-1 text-xs text-gray-600 bg-white">Priority</label>
                                        <select
                                            value={editPriority}
                                            onChange={(e) => setEditPriority(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none cursor-pointer"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <label className="absolute -top-2 left-2 px-1 text-xs text-gray-600 bg-white">Category</label>
                                        <input
                                            type="text"
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            placeholder="Enter category"
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex space-x-2">
                                        <select
                                            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:border-indigo-500 focus:outline-none"
                                            value={block.content?.status || "Not Started"}
                                            onChange={(e) => updateStatus(block, e.target.value)}
                                        >
                                            <option value="Not Started">Not Started</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Blocked">Blocked</option>
                                            <option value="At Risk">At Risk</option>
                                        </select>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setEditingBlockId(null)}
                                            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => saveEdits(block.block_id)}
                                            className="px-4 py-1.5 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start flex-1 gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={block.content?.completed || false}
                                                onChange={() => toggleComplete(block)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600 peer-checked:border-transparent transition-all flex items-center justify-center">
                                                {block.content?.completed && (
                                                    <span className="text-white text-xs">✓</span>
                                                )}
                                            </div>
                                        </label>
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-medium transition-all ${
                                                block.content?.completed 
                                                    ? "line-through text-gray-500" 
                                                    : "text-gray-800 hover:text-indigo-600"
                                            }`}>
                                                {block.title}
                                            </h3>
                                            {block.content?.description && (
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {block.content.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {block.content?.status && (
                                                    <span className={`px-2.5 py-1 text-xs rounded-full border flex items-center gap-1 ${getStatusClasses(block.content.status)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        {block.content.status}
                                                    </span>
                                                )}
                                                {due_date && (
                                                    <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                                                        <span>📅</span>
                                                        {formatDate(due_date)}
                                                    </span>
                                                )}
                                                {priority && (
                                                    <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${getPriorityClasses(priority)}`}>
                                                        <span>🚩</span>
                                                        {priority}
                                                    </span>
                                                )}
                                                {category && (
                                                    <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
                                                        <span>📁</span>
                                                        {category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {hasChildren(block.block_id) && (
                                            <button
                                                onClick={() => toggleExpand(block.block_id)}
                                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            >
                                                {isExpanded(block.block_id) ? '▼' : '▶'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => startEditing(block)}
                                            title="Edit"
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => onAddChild(block.block_id)}
                                            title="Add sub-task"
                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            ➕
                                        </button>
                                        <button
                                            onClick={() => onDelete(block.block_id)}
                                            title="Delete"
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dropdown Menu */}
                {menuPosition && activeBlockId === block.block_id && (
                    <div 
                        className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden milestone-menu"
                        style={{ 
                            left: `${menuPosition.x}px`, 
                            top: `${menuPosition.y}px` 
                        }}
                    >
                        <button
                            onClick={() => { addBlockBefore(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>➕</span> Add above
                        </button>
                        <button
                            onClick={() => { addBlockAfter(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>➕</span> Add below
                        </button>
                        <button
                            onClick={() => onAddChild(block.block_id)}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>➕</span> Add child
                        </button>
                        <button
                            onClick={() => { duplicateBlock(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>📋</span> Duplicate
                        </button>
                        <button
                            onClick={() => { moveBlockUp(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>⬆️</span> Move up
                        </button>
                        <button
                            onClick={() => { moveBlockDown(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>⬇️</span> Move down
                        </button>
                        <button
                            onClick={() => { handleMenuClose(); startEditing(block); }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
                        >
                            <span>✏️</span> Edit
                        </button>
                        <button
                            onClick={() => { handleMenuClose(); onDelete(block.block_id); }}
                            className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all flex items-center gap-2"
                        >
                            <span>🗑️</span> Delete
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="milestone-block-container bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-xl">🎯</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {title}
                    </h2>
                </div>
                <button
                    onClick={createNewItem}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 hover:-translate-y-0.5 transition-all shadow-md flex items-center gap-2 font-medium"
                >
                    <span>➕</span>
                    Add Item
                </button>
            </div>

            {blocks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-300 transition-all">
                    <div className="mb-4">
                        <span className="text-6xl opacity-50">📃</span>
                    </div>
                    <p className="text-gray-600 mb-4 text-lg font-medium">No milestones added yet</p>
                    <p className="text-gray-500 mb-6 text-sm">Start tracking your project milestones and tasks</p>
                    <button
                        onClick={createNewItem}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md font-medium"
                    >
                        Add your first milestone
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Progress Overview */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Overall Progress</span>
                            <span className="text-sm text-indigo-600 font-medium">
                                {blocks.filter(b => b.content?.completed).length} / {blocks.length} completed
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                                style={{ width: `${(blocks.filter(b => b.content?.completed).length / blocks.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Root level items */}
                    {rootBlocks.map(block => (
                        <div key={block.block_id}>
                            {renderTaskBlock(block)}

                            {/* Children if expanded */}
                            {isExpanded(block.block_id) && hasChildren(block.block_id) && (
                                <div className="ml-8 pl-4 border-l-2 border-gray-200 hover:border-indigo-300 transition-colors">
                                    {getChildBlocks(block.block_id).map(childBlock => (
                                        <div key={childBlock.block_id}>
                                            {renderTaskBlock(childBlock)}

                                            {/* Grandchildren if expanded */}
                                            {isExpanded(childBlock.block_id) && hasChildren(childBlock.block_id) && (
                                                <div className="ml-6 pl-4 border-l-2 border-gray-200 hover:border-indigo-200 transition-colors">
                                                    {getChildBlocks(childBlock.block_id).map(grandChild => (
                                                        <div key={grandChild.block_id}>
                                                            {renderTaskBlock(grandChild)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MilestoneBlockContainer; 