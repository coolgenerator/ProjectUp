import React from 'react';
import { Paperclip } from 'lucide-react';
import { Attachment } from '../../../../types/chat';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

/**
 * Component for previewing file attachments before sending
 */
const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove
}) => {
  if (attachments.length === 0) return null;

  return (
    <div className="mx-4 mb-2 flex flex-wrap gap-2 flex-shrink-0">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative group">
          {attachment.type === 'image' ? (
            <div className="relative">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-20 w-20 object-cover rounded border-2 border-indigo-300"
              />
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded border-2 border-indigo-300">
              <Paperclip className="w-4 h-4" />
              <span className="text-xs">{attachment.name}</span>
              <button
                onClick={() => onRemove(index)}
                className="ml-2 text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AttachmentPreview;
