import React, { useState, useRef, useEffect } from 'react';
import { Section } from '../../../types/task';

interface SectionHeaderProps {
  section: Section;
  taskCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
}

const SECTION_COLORS = [
  { name: 'Gray', value: '#9CA3AF' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Green', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Pink', value: '#EC4899' },
];

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  section,
  taskCount,
  isCollapsed,
  onToggleCollapse,
  onRename,
  onDelete,
  onColorChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const menuOpen = Boolean(anchorEl);
  const colorMenuOpen = Boolean(colorAnchorEl);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleColorMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColorAnchorEl(event.currentTarget);
    handleMenuClose();
  };

  const handleColorMenuClose = () => {
    setColorAnchorEl(null);
  };

  const handleRenameClick = () => {
    setIsEditing(true);
    handleMenuClose();
  };

  const handleRenameSubmit = () => {
    if (editedName.trim() && editedName !== section.name) {
      onRename(editedName.trim());
    } else {
      setEditedName(section.name);
    }
    setIsEditing(false);
  };

  const handleRenameCancel = () => {
    setEditedName(section.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    onDelete();
  };

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    handleColorMenuClose();
  };

  const sectionColor = section.color || '#9CA3AF';

  return (
    <div
      className={`flex items-center gap-2 py-3 px-4 border-l-4 border-b border-gray-200 bg-white ${
        !isEditing ? 'cursor-pointer hover:bg-gray-50' : ''
      } transition-colors`}
      style={{ borderLeftColor: sectionColor }}
      onClick={!isEditing ? onToggleCollapse : undefined}
    >
      {/* Collapse/Expand Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-600"
      >
        {isCollapsed ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      {/* Section Name */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
        />
      ) : (
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="flex-1 text-sm font-semibold text-gray-900 cursor-text hover:opacity-80 select-none"
        >
          {section.name}
        </div>
      )}

      {/* Task Count */}
      <span className="text-xs text-gray-500 px-2">
        {taskCount}
      </span>

      {/* More Actions Menu */}
      <button
        onClick={handleMenuOpen}
        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500 opacity-60 hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Actions Menu Dropdown */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={handleMenuClose}
          />
          <div
            className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20"
            style={{ top: anchorEl?.getBoundingClientRect().bottom }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleRenameClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename section
            </button>
            <button
              onClick={handleColorMenuOpen}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Change color
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete section
            </button>
          </div>
        </>
      )}

      {/* Color Picker Popover */}
      {colorMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={handleColorMenuClose}
          />
          <div
            className="absolute right-4 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-20"
            style={{ top: anchorEl?.getBoundingClientRect().bottom }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Section color
            </div>
            <div className="grid grid-cols-5 gap-2 w-44">
              {SECTION_COLORS.map((color) => (
                <div
                  key={color.value}
                  title={color.name}
                  onClick={() => handleColorSelect(color.value)}
                  className={`w-7 h-7 rounded cursor-pointer border-2 transition-all hover:scale-110 hover:shadow-md ${
                    section.color === color.value ? 'border-gray-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SectionHeader;
