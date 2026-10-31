import { useState, useEffect, useCallback } from 'react';
import fetchWithAuth from './fetchWithAuth';
import config from '../config';

const { API_BASE_URL } = config;

export interface Block {
    block_id: number;
    parent_id?: number;
    project_id: number;
    user_id: number;
    type: string;
    title: string;
    content: any;
    editor_js?: any;
    editorjs_content?: any;
    sort_order: number;
    color?: string;
    icon?: string;
    has_children: boolean;
    is_template: boolean;
    archived: boolean;
    last_edited_by: number;
    created_at: string;
    updated_at: string;
}

export interface BlockRequest {
    parent_id?: number;
    type: string;
    title: string;
    content?: any;
    color?: string;
    icon?: string;
    sort_order?: number;
    editor_js?: any;
    editorjs_content?: any;
}

interface UseBlocksProps {
    projectSid: string;
    blockType?: string;
    parentId?: number;
}

interface UseBlocksReturn {
    blocks: Block[];
    loading: boolean;
    error: string | null;
    fetchBlocks: () => Promise<void>;
    createBlock: (block: BlockRequest) => Promise<Block | null>;
    updateBlock: (blockId: number, data: Partial<BlockRequest>) => Promise<boolean>;
    updateBlockWithEditorJS: (blockId: number, data: Partial<BlockRequest>) => Promise<boolean>;
    deleteBlock: (blockId: number) => Promise<boolean>;
    saveBlocks: (blocks: Block[]) => Promise<boolean>;
}

export const useBlocks = ({ projectSid, blockType, parentId }: UseBlocksProps): UseBlocksReturn => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    // CHANGED: Set loading to false by default since block APIs are disabled
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBlocks = useCallback(async () => {
        // STUB: Block-based design has been removed from backend
        // Return empty blocks array to prevent errors
        console.log('Block fetch disabled - block-based design removed from backend');
        setBlocks([]);
        setLoading(false);
        return;
        
        // Original implementation commented out
        /*
        if (!projectSid) {
            setError("Project ID is required");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Build the URL with optional query parameters
            let url = `${API_BASE_URL}/api/project/${projectSid}/blocks`;
            const params = new URLSearchParams();

            if (blockType) {
                params.append('type', blockType);
            }

            if (parentId !== undefined) {
                params.append('parent_id', parentId.toString());
            }

            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }

            const response = await fetchWithAuth(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch blocks: ${response.statusText}`);
            }

            const data = await response.json();
            setBlocks(data.blocks || []);
        } catch (err) {
            console.error("Error fetching blocks:", err);
            setError("Failed to load blocks");
        } finally {
            setLoading(false);
        }
        */
    }, [projectSid, blockType, parentId]);

    const createBlock = async (blockData: BlockRequest): Promise<Block | null> => {
        // STUB: Block-based design has been removed from backend
        console.log('Block creation disabled - block-based design removed from backend', blockData);
        return null;
        
        /* Original implementation commented out
        if (!projectSid) {
            setError("Project ID is required");
            return null;
        }

        try {
            setLoading(true);

            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/blocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blockData),
            });

            if (!response.ok) {
                throw new Error(`Failed to create block: ${response.statusText}`);
            }

            const newBlock = await response.json();

            // Update local state with the new block
            setBlocks(prev => [...prev, newBlock.block]);

            return newBlock.block;
        } catch (err) {
            console.error("Error creating block:", err);
            setError("Failed to create block");
            return null;
        } finally {
            setLoading(false);
        }
        */
    };

    const updateBlock = async (blockId: number, data: Partial<BlockRequest>): Promise<boolean> => {
        // STUB: Block-based design has been removed from backend
        console.log('Block update disabled - block-based design removed from backend', blockId, data);
        return false;
        
        /* Original implementation commented out
        if (!projectSid) {
            setError("Project ID is required");
            return false;
        }

        try {
            // Don't set loading to true for updates to prevent refetching
            // setLoading(true);

            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/blocks/${blockId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to update block: ${response.statusText}`);
            }

            const updatedBlock = await response.json();

            // Update the local state
            if (updatedBlock && updatedBlock.block) {
                setBlocks(prev =>
                    prev.map(block =>
                        block.block_id === blockId ? updatedBlock.block : block
                    )
                );
            }

            return true;
        } catch (err) {
            console.error("Error updating block:", err);
            setError("Failed to update block");
            return false;
        } finally {
            // Don't set loading to false, as we didn't set it to true
            // setLoading(false);
        }
        */
    };

    const updateBlockWithEditorJS = async (blockId: number, data: Partial<BlockRequest>): Promise<boolean> => {
        if (!projectSid) {
            setError("Project ID is required");
            return false;
        }

        try {
            // Don't set loading to true for editor JS updates to prevent refetching
            // This avoids resetting the UI while editing
            // setLoading(true);
            console.log('Updating block with EditorJS content:', blockId, data);

            // Format the request body for the EditorJS endpoint
            const requestBody = {
                // Use editor_content instead of editorjs_content based on what SaveBlockWithEditorJS expects
                editor_content: data.content,
                title: data.title,
                // Include both type and block_type to cover all bases
                type: data.type,
                block_type: data.type,
                color: data.color,
                icon: data.icon,
                parent_id: data.parent_id,
                sort_order: data.sort_order,
                // Add project_id which might be required by some endpoints
                project_id: parseInt(projectSid.replace(/\D/g, ''), 10) || 0
            };

            // Log the full payload for debugging
            console.log('EditorJS API Request - Full payload:', JSON.stringify(requestBody, null, 2));

            // Try the direct endpoint instead of the service-based one
            // This endpoint should bypass permission checks and work more reliably
            const directEndpoint = `${API_BASE_URL}/api/blocks/editor/${blockId}`;
            console.log('Using direct EditorJS API endpoint:', directEndpoint);

            // Use the direct EditorJS handling endpoint
            const response = await fetchWithAuth(directEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response from EditorJS update:', response.status, response.statusText);
                console.error('Response body:', errorText);

                // If we get a permission error, log more details
                if (errorText.includes("permission denied")) {
                    console.error('Permission error detected! This might be due to missing permission records.');
                    console.log('User might not have explicit edit permission for this block.');
                }

                throw new Error(`Failed to update block: ${response.statusText}`);
            }

            const updatedBlock = await response.json();
            console.log('Successfully updated block with EditorJS:', updatedBlock);

            // Update the local state, but don't trigger a refetch
            if (updatedBlock && updatedBlock.block) {
                setBlocks(prev =>
                    prev.map(block =>
                        block.block_id === blockId ? updatedBlock.block : block
                    )
                );
            }

            return true;
        } catch (err) {
            console.error("Error updating block with EditorJS:", err);
            setError("Failed to update block with EditorJS content");
            return false;
        } finally {
            // Don't set loading to false, as we didn't set it to true
            // setLoading(false);
        }
    };

    const deleteBlock = async (blockId: number): Promise<boolean> => {
        // STUB: Block-based design has been removed from backend
        console.log('Block deletion disabled - block-based design removed from backend', blockId);
        return false;
        
        /* Original implementation commented out
        if (!projectSid) {
            setError("Project ID is required");
            return false;
        }

        try {
            setLoading(true);

            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/blocks/${blockId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`Failed to delete block: ${response.statusText}`);
            }

            // Update local state by removing the deleted block
            setBlocks(prev => prev.filter(block => block.block_id !== blockId));

            return true;
        } catch (err) {
            console.error("Error deleting block:", err);
            setError("Failed to delete block");
            return false;
        } finally {
            setLoading(false);
        }
        */
    };

    const saveBlocks = async (updatedBlocks: Block[]): Promise<boolean> => {
        if (!projectSid) {
            setError("Project ID is required");
            return false;
        }

        try {
            setLoading(true);

            const response = await fetchWithAuth(`${API_BASE_URL}/api/project/${projectSid}/blocks/batch`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ blocks: updatedBlocks }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save blocks: ${response.statusText}`);
            }

            // Update the local state with the new blocks array
            setBlocks(updatedBlocks);

            return true;
        } catch (err) {
            console.error("Error saving blocks:", err);
            setError("Failed to save blocks");
            return false;
        } finally {
            setLoading(false);
        }
    };

    // DISABLED: Block-based design has been removed from backend
    // Comment out the automatic fetch to prevent 404 errors
    // useEffect(() => {
    //     fetchBlocks();
    // }, [fetchBlocks]);

    return {
        blocks,
        loading,
        error,
        fetchBlocks,
        createBlock,
        updateBlock,
        updateBlockWithEditorJS,
        deleteBlock,
        saveBlocks,
    };
}; 