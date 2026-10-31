import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import { motion, AnimatePresence } from 'framer-motion';

interface Note {
  id: string;
  paper_id: string;
  user_id: string;
  page: number;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  position?: string; // JSON string containing quote, offsets, color, category, imageUrl
}

interface OutlineSection {
  title: string;
  page_number: number;
  level: number;
  description?: string;
  subsections?: OutlineSection[];
}

interface Reference {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  url?: string;
}

const NOTE_COLORS = [
  { name: 'Yellow', value: '#FEF3C7' },
  { name: 'Green', value: '#D1FAE5' },
  { name: 'Blue', value: '#DBEAFE' },
  { name: 'Pink', value: '#FCE7F3' },
  { name: 'Purple', value: '#E9D5FF' },
];

const NOTE_CATEGORIES = [
  'Important',
  'Question',
  'Idea',
  'TODO',
  'Reference',
  'Summary'
];

// Notes Panel Component
export const NotesPanel: React.FC<{
  notes: Note[];
  paperId?: string;
  onNotesUpdate: () => void;
  prefilledAnnotation?: {
    text: string;
    page: number;
    quote?: string;
    startOffset?: number;
    endOffset?: number;
    imageUrl?: string;
  } | null;
  onClearPrefill?: () => void;
  onNoteClick?: (page: number, startOffset?: number, endOffset?: number) => void;
}> = ({ notes, paperId, onNotesUpdate, prefilledAnnotation, onClearPrefill, onNoteClick }) => {
  const { t } = useTranslation();
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Annotation note states
  const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationColor, setAnnotationColor] = useState(NOTE_COLORS[0].value);
  const [annotationCategory, setAnnotationCategory] = useState(NOTE_CATEGORIES[0]);

  // Update note when annotation prefill changes
  React.useEffect(() => {
    if (prefilledAnnotation) {
      console.log('[Prefilled Annotation] Received:', {
        text: prefilledAnnotation.text.substring(0, 50) + '...',
        page: prefilledAnnotation.page,
        hasQuote: !!prefilledAnnotation.quote,
        hasImageUrl: !!prefilledAnnotation.imageUrl,
        imageUrl: prefilledAnnotation.imageUrl
      });
      setIsCreatingAnnotation(true);
      setAnnotationText(prefilledAnnotation.text);
      setAnnotationColor(NOTE_COLORS[0].value);
      setAnnotationCategory(NOTE_CATEGORIES[0]);
    }
  }, [prefilledAnnotation]);

  const createNote = async () => {
    if (!newNote.trim() || !paperId) return;

    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          type: 'text',
          page: 1
        })
      });

      if (response.ok) {
        setNewNote('');
        setShowAddNote(false);
        onNotesUpdate();
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const createAnnotation = async () => {
    if (!annotationText.trim() || !paperId || !prefilledAnnotation) return;

    try {
      const positionData = {
        quote: prefilledAnnotation.quote,
        start_offset: prefilledAnnotation.startOffset,
        end_offset: prefilledAnnotation.endOffset,
        color: annotationColor,
        category: annotationCategory,
        imageUrl: prefilledAnnotation.imageUrl
      };

      console.log('[Create Annotation] Sending to backend:', {
        content: annotationText,
        type: 'annotation',
        page: prefilledAnnotation.page,
        positionData,
        positionString: JSON.stringify(positionData)
      });

      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: annotationText,
          type: 'annotation',
          page: prefilledAnnotation.page,
          position: JSON.stringify(positionData)
        })
      });

      if (response.ok) {
        console.log('[Create Annotation] Success, clearing form');
        setIsCreatingAnnotation(false);
        setAnnotationText('');
        setAnnotationColor(NOTE_COLORS[0].value);
        setAnnotationCategory(NOTE_CATEGORIES[0]);
        onClearPrefill?.();
        onNotesUpdate();
      } else {
        console.error('[Create Annotation] Failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  const updateNote = async (noteId: string, note: Note) => {
    if (!editContent.trim() || !paperId) return;

    try {
      const updateData: any = { content: editContent };

      // If it's an annotation, update position with new color/category
      if (note.type === 'annotation' && note.position) {
        const position = JSON.parse(note.position);
        updateData.position = JSON.stringify({
          ...position,
          color: editColor,
          category: editCategory
        });
      }

      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/papers/${paperId}/notes/${noteId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        }
      );

      if (response.ok) {
        setEditingNote(null);
        setEditContent('');
        setEditColor('');
        setEditCategory('');
        onNotesUpdate();
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!paperId) return;

    try {
      const response = await fetchWithAuth(
        `${config.API_BASE_URL}/api/papers/${paperId}/notes/${noteId}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        onNotesUpdate();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Filter notes based on search and category
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchFilter === '' ||
      note.content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (note.position && JSON.parse(note.position).quote?.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' ||
      (note.position && JSON.parse(note.position).category === categoryFilter) ||
      (categoryFilter === 'Text' && note.type === 'text');

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Annotation Creation Form */}
      {isCreatingAnnotation && prefilledAnnotation && (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
              Add Annotation
            </h3>
            <button
              onClick={() => {
                setIsCreatingAnnotation(false);
                onClearPrefill?.();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quote and Image */}
          <div className="mb-3 p-3 bg-white/70 rounded-lg border-l-4 border-blue-400 space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Selected text (Page {prefilledAnnotation.page}):</p>
              <p className="text-sm text-gray-700 italic">"{prefilledAnnotation.quote}"</p>
            </div>
            {prefilledAnnotation.imageUrl && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Cropped Image:</p>
                <img
                  src={prefilledAnnotation.imageUrl}
                  alt="Cropped region"
                  className="max-w-full rounded border border-gray-200 shadow-sm"
                  style={{ maxHeight: '150px' }}
                />
              </div>
            )}
          </div>

          {/* Comment */}
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add your comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            rows={3}
          />

          {/* Color Selection */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Color:</p>
            <div className="flex gap-2">
              {NOTE_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setAnnotationColor(color.value)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    annotationColor === color.value
                      ? 'border-gray-800 scale-110 shadow-md'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Category:</p>
            <div className="flex flex-wrap gap-2">
              {NOTE_CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setAnnotationCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    annotationCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={createAnnotation}
            disabled={!annotationText.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Annotation
          </button>
        </div>
      )}

      {/* Search, Filter and Add Note Section */}
      {!isCreatingAnnotation && (
        <div className="bg-white border-b border-gray-200">
          <div className="p-4">
            {!showAddNote ? (
              <>
                {/* Search and Filter Bar */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search notes..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Add new note"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCategoryFilter('All')}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      categoryFilter === 'All'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {NOTE_CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setCategoryFilter(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        categoryFilter === category
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    onClick={() => setCategoryFilter('Text')}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      categoryFilter === 'Text'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Text Notes
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Add Note Form */}
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Add Quick Note
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createNote()}
                    placeholder="Type your note..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={createNote}
                    disabled={!newNote.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNote('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>{notes.length === 0 ? t('paperReader.notesPanel.empty') : 'No notes match your search'}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotes.map((note) => {
              const isAnnotation = note.type === 'annotation';
              const position = note.position ? JSON.parse(note.position) : null;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white rounded-lg border-l-4 border-gray-200 p-4 hover:shadow-md transition-shadow ${
                    isAnnotation && onNoteClick ? 'cursor-pointer' : ''
                  }`}
                  style={isAnnotation && position?.color ? { borderLeftColor: position.color } : {}}
                  onClick={() => {
                    if (isAnnotation && onNoteClick && position) {
                      onNoteClick(note.page, position.start_offset, position.end_offset);
                    }
                  }}
                >
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />

                      {isAnnotation && (
                        <>
                          {/* Color Selection for Edit */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Color:</p>
                            <div className="flex gap-2">
                              {NOTE_COLORS.map(color => (
                                <button
                                  key={color.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditColor(color.value);
                                  }}
                                  className={`w-6 h-6 rounded border-2 transition-all ${
                                    editColor === color.value
                                      ? 'border-gray-800 scale-110'
                                      : 'border-gray-300'
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Category Selection for Edit */}
                          <div>
                            <p className="text-xs text-gray-600 mb-2">Category:</p>
                            <div className="flex flex-wrap gap-2">
                              {NOTE_CATEGORIES.map(category => (
                                <button
                                  key={category}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditCategory(category);
                                  }}
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    editCategory === category
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {category}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNote(note.id, note);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          {t('paperReader.notesPanel.save')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNote(null);
                            setEditContent('');
                            setEditColor('');
                            setEditCategory('');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                        >
                          {t('paperReader.notesPanel.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Category Badge */}
                      {isAnnotation && position?.category && (
                        <div className="mb-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {position.category}
                          </span>
                        </div>
                      )}

                      {/* Quote and Image */}
                      {isAnnotation && (position?.quote || position?.imageUrl) && (
                        <div className="mb-3 p-2 bg-gray-50 rounded border-l-2 border-gray-300 space-y-2">
                          {position?.quote && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Selected text:</p>
                              <p className="text-sm text-gray-700 italic">
                                "{position.quote.length > 100 ? position.quote.substring(0, 100) + '...' : position.quote}"
                              </p>
                            </div>
                          )}
                          {position?.imageUrl && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Cropped Image:</p>
                              <img
                                src={position.imageUrl}
                                alt="Cropped region"
                                className="max-w-full rounded border border-gray-200 shadow-sm"
                                style={{ maxHeight: '200px' }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Note Content */}
                      <p className="text-gray-800 mb-2">{note.content}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {t('paperReader.notesPanel.page')} {note.page} • {new Date(note.created_at).toLocaleDateString()}
                          {isAnnotation && ' • Click to jump to location'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNote(note.id);
                              setEditContent(note.content);
                              if (isAnnotation && position) {
                                setEditColor(position.color || NOTE_COLORS[0].value);
                                setEditCategory(position.category || NOTE_CATEGORIES[0]);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {t('paperReader.notesPanel.edit')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNote(note.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            {t('paperReader.notesPanel.delete')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Outline Panel Component
export const OutlinePanel: React.FC<{
  sections: OutlineSection[];
  onSectionClick: (pageNumber: number) => void;
  onGenerateOutline?: () => void;
  isGenerating?: boolean;
}> = ({ sections, onSectionClick, onGenerateOutline, isGenerating = false }) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const toggleDescription = (title: string) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedDescriptions(newExpanded);
  };

  const renderSection = (section: OutlineSection, index: number) => {
    const hasSubsections = section.subsections && section.subsections.length > 0;
    const isExpanded = expandedSections.has(section.title);
    const isDescriptionExpanded = expandedDescriptions.has(section.title);
    const hasDescription = section.description && section.description.trim().length > 0;

    // Use inline style for dynamic padding since Tailwind doesn't support dynamic classes
    const paddingLeft = section.level > 1 ? `${section.level * 1}rem` : '1rem';

    return (
      <div key={`${section.title}-${index}`}>
        <button
          onClick={() => {
            if (hasSubsections) {
              toggleSection(section.title);
            }
            onSectionClick(section.page_number);
          }}
          style={{ paddingLeft }}
          className="w-full text-left py-2 hover:bg-gray-100 flex items-center justify-between group pr-4"
        >
          <div className="flex items-center gap-2">
            {hasSubsections && (
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className={`text-sm ${section.level === 1 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {section.title}
            </span>
          </div>
          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {t('paperReader.outlinePanel.page')} {section.page_number}
          </span>
        </button>

        {/* Description */}
        {hasDescription && (
          <div style={{ paddingLeft }} className="pr-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDescription(section.title);
              }}
              className="w-full text-left text-xs text-gray-600 py-1 hover:text-gray-800 flex items-start gap-1"
            >
              <svg
                className={`w-3 h-3 mt-0.5 flex-shrink-0 transition-transform ${isDescriptionExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                {section.description}
              </span>
            </button>
          </div>
        )}

        {hasSubsections && isExpanded && (
          <div>
            {section.subsections!.map((subsection, subIndex) =>
              renderSection(subsection, subIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t('paperReader.outlinePanel.title')}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <p className="mb-4">{t('paperReader.outlinePanel.empty')}</p>
            {onGenerateOutline && (
              <button
                onClick={onGenerateOutline}
                disabled={isGenerating}
                className="mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('paperReader.outlinePanel.generating')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {t('paperReader.outlinePanel.generate')}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          sections.map((section, index) => renderSection(section, index))
        )}
      </div>
    </div>
  );
};

// References Panel Component
export const ReferencesPanel: React.FC<{
  references: Reference[];
  onGenerateReferences?: () => void;
  isGenerating?: boolean;
  progressMessage?: string;
  totalCount?: number;
  currentProgress?: number;
}> = ({ references, onGenerateReferences, isGenerating = false, progressMessage = '', totalCount = 0, currentProgress = 0 }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReferences = references.filter(ref =>
    ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {t('paperReader.referencesPanel.title')} ({references.length})
        </h3>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('paperReader.referencesPanel.search')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* References List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Show progress message when generating */}
        {isGenerating && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <svg className="animate-spin h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{progressMessage}</p>
                {totalCount > 0 && (
                  <p className="text-xs text-blue-700 mt-1">
                    Total references found: {totalCount}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar when analyzing references */}
            {totalCount > 0 && currentProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-blue-700">
                  <span>Analyzing references and finding PDF links...</span>
                  <span className="font-medium">{currentProgress}/{totalCount}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(currentProgress / totalCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 text-center">
                  {Math.round((currentProgress / totalCount) * 100)}% complete
                </p>
              </div>
            )}
          </div>
        )}

        {references.length === 0 && !searchTerm && !isGenerating ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="mb-4">{t('paperReader.referencesPanel.empty')}</p>
            {onGenerateReferences && (
              <button
                onClick={onGenerateReferences}
                disabled={isGenerating}
                className="mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('paperReader.referencesPanel.generating')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    {t('paperReader.referencesPanel.generate')}
                  </>
                )}
              </button>
            )}
          </div>
        ) : filteredReferences.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('paperReader.referencesPanel.noResults')}
          </div>
        ) : (
          filteredReferences.map((ref, index) => (
            <div
              key={ref.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{ref.title}</h4>
                  <p className="text-sm text-gray-600 mb-1">
                    {ref.authors.join(', ')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ref.venue} • {ref.year}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Paper
                      </a>
                    )}
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        DOI: {ref.doi}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default { NotesPanel, OutlinePanel, ReferencesPanel };