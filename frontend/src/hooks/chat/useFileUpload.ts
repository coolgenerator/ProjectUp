import { useState, useRef } from 'react';
import { Attachment } from '../../types/chat';

interface UseFileUploadReturn {
  attachments: Attachment[];
  uploadingFiles: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeAttachment: (index: number) => void;
  clearAttachments: () => void;
}

/**
 * Custom hook for handling file uploads and attachments
 */
export const useFileUpload = (): UseFileUploadReturn => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);

    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // For images, create a local preview URL
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          newAttachments.push({
            type: 'image',
            url,
            name: file.name,
            size: file.size,
          });
        } else {
          // For other files, you'd typically upload to a server first
          // For now, we'll just store the file info
          newAttachments.push({
            type: 'file',
            url: '', // Would be populated after upload
            name: file.name,
            size: file.size,
          });
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      // Revoke the object URL if it's an image
      if (prev[index].type === 'image' && prev[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(prev[index].url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAttachments = () => {
    // Revoke all object URLs
    attachments.forEach(attachment => {
      if (attachment.type === 'image' && attachment.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
    });
    setAttachments([]);
  };

  return {
    attachments,
    uploadingFiles,
    fileInputRef,
    handleFileUpload,
    removeAttachment,
    clearAttachments
  };
};
