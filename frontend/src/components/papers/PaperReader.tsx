import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import fetchWithAuth from '../../hooks/fetchWithAuth';
import config from '../../config';
import PDFViewer from './PDFViewer';
import { NotesPanel, OutlinePanel, ReferencesPanel } from './PaperPanels';
import ReactMarkdown from 'react-markdown';
import { paperPersistenceApi } from '../../services/paperPersistenceApi';
import ReasoningSteps, { ReasoningStep } from './ReasoningSteps';

// Interfaces (Paper, Annotation, Highlight, Message) remain the same
interface Paper {
    id: string;
    title: string;
    authors: string[];
    venue: string;
    year: number;
    abstract: string;
    file_url: string;
    citations: number;
    tags: string[];
  }
  
  interface Annotation {
    id: string;
    type: 'highlight' | 'note' | 'question';
    page: number;
    position: { x: number; y: number; width: number; height: number };
    content: string;
    color: string;
    created_at: string;
  }
  
  interface Highlight {
    id: string;
    page: number;
    startOffset: number;
    endOffset: number;
    text: string;
    color: string;
    note?: string;
  }
  
  interface MessageVersion {
    content: string;
    timestamp: string;
  }

  interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    versions?: MessageVersion[];  // Array of previous versions
    currentVersionIndex?: number; // Index of currently displayed version
    isEditing?: boolean;          // Track if message is being edited
  }

  interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
  }

// Add interfaces for API responses
interface Note {
  id: string;
  paper_id: string;
  user_id: string;
  page: number;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface OutlineSection {
  title: string;
  page_number: number;
  level: number;
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

const PaperReader: React.FC = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const { t } = useTranslation();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [mode, setMode] = useState<'read' | 'analyze' | 'implement'>('read');
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [visiblePage, setVisiblePage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [selectedText, setSelectedText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Generate initial session ID once
  const initialSessionId = useMemo(() => crypto.randomUUID(), []);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: initialSessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId);
  const [notes, setNotes] = useState<Note[]>([]);
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [activeTab, setActiveTab] = useState<'assistant' | 'notes' | 'outline' | 'references'>('assistant');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paperAnalysis, setPaperAnalysis] = useState<any>(null);
  const [isResource, setIsResource] = useState(false); // Track if this is a resource, not a paper
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingReferences, setIsGeneratingReferences] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  // Reasoning mode states
  const [enableReasoningMode, setEnableReasoningMode] = useState(true); // Default to Deep Analysis mode
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [currentReasoningStep, setCurrentReasoningStep] = useState<number>(0);
  const [prefilledNoteData, setPrefilledNoteData] = useState<{
    text: string;
    page: number;
    quote?: string;
    startOffset?: number;
    endOffset?: number;
  } | null>(null);
  const [referencesProgress, setReferencesProgress] = useState<string>('');
  const [referencesTotalCount, setReferencesTotalCount] = useState<number>(0);
  const [referencesCurrentProgress, setReferencesCurrentProgress] = useState<number>(0);
  const [showSessionsSidebar, setShowSessionsSidebar] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Ref for chat messages container to enable auto-scroll
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [scrollToPage, setScrollToPage] = useState<number | undefined>(undefined);
  const [highlightAnnotation, setHighlightAnnotation] = useState<{
    page: number;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isCropMode, setIsCropMode] = useState(false);

  useEffect(() => {
    const initializePaper = async () => {
      await fetchPaper();

      // Load saved outline, references, and notes from database
      if (paperId && user?.id) {
        // Load outline
        try {
          const savedOutline = await paperPersistenceApi.getOutline(paperId);
          if (savedOutline) {
            setOutline(savedOutline.sections);
          }
        } catch (error) {
          console.log('No saved outline found');
        }

        // Load references
        try {
          const savedReferences = await paperPersistenceApi.getReferences(paperId);
          if (savedReferences && savedReferences.length > 0) {
            setReferences(savedReferences);
          }
        } catch (error) {
          console.log('[References] No saved references found:', error);
        }

        // Load notes
        await fetchNotes();
      }
    };

    initializePaper();
  }, [paperId, user?.id]);

  const fetchNotes = async () => {
    if (!user?.id) return;

    try {
      const fetchedNotes = await paperPersistenceApi.getNotes(paperId, String(user.id));
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      // Silently fail - notes are optional
    }
  };

  const generateOutline = async () => {
    if (!paper?.file_url) return;

    setIsGeneratingOutline(true);
    try {
      // Get the PDF URL - if it's a resource, use the proxy URL with token
      const pdfUrl = paper.file_url;

      // Call AI agent directly to generate outline
      const response = await fetch(`${config.AI_AGENT_URL}/ai-api/papers/generate-outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          token: token || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedOutline = data.outline || [];
        setOutline(generatedOutline);

        // Save outline to database for persistence
        try {
          await paperPersistenceApi.saveOutline(
            crypto.randomUUID(),
            paperId!,
            generatedOutline
          );
        } catch (error) {
          console.error('Failed to save outline:', error);
          // Continue even if save fails - outline is still in memory
        }
      } else {
        console.error('Failed to generate outline:', await response.text());
      }
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const generateReferences = async () => {
    if (!paper?.file_url) return;

    console.log('=== REFERENCE EXTRACTION STARTED ===');
    console.log('[References] Paper URL:', paper.file_url);
    console.log('[References] Paper ID:', paperId);

    setIsGeneratingReferences(true);
    setReferences([]); // Clear existing references
    setReferencesProgress('Starting...');
    setReferencesTotalCount(0);
    setReferencesCurrentProgress(0);

    // Track collected references for partial saves
    let collectedReferences: Reference[] = [];

    try {
      // Get the PDF URL
      const pdfUrl = paper.file_url;

      console.log('[References] Sending request to AI agent...');
      console.log('[References] Request URL:', `${config.AI_AGENT_URL}/ai-api/papers/generate-references`);
      console.log('[References] Request payload:', { pdf_url: pdfUrl, token: token ? '***' : undefined });

      // Call AI agent directly to extract references with streaming
      const response = await fetch(`${config.AI_AGENT_URL}/ai-api/papers/generate-references`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          token: token || undefined
        })
      });

      console.log('[References] Response received:', response.status, response.statusText);

      if (response.ok && response.body) {
        console.log('[References] Starting to read stream...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let lineCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('[References] Stream reading complete');
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete JSON objects from the stream
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                lineCount++;
                console.log(`[References] Line ${lineCount}:`, line.substring(0, 200)); // Log first 200 chars

                try {
                  const data = JSON.parse(line);
                  console.log(`[References] Parsed data type:`, data.type);

                  if (data.type === 'status') {
                    console.log('[References] STATUS:', data.message);
                    setReferencesProgress(data.message);
                  } else if (data.type === 'count') {
                    console.log('[References] COUNT:', data.total, 'references found');
                    console.log('[References] COUNT message:', data.message);
                    setReferencesTotalCount(data.total);
                    setReferencesProgress(data.message);
                  } else if (data.type === 'progress') {
                    console.log('[References] PROGRESS:', data.current, '/', 'total');
                    setReferencesCurrentProgress(data.current);
                    setReferencesProgress(data.message);
                  } else if (data.type === 'reference') {
                    collectedReferences.push(data.reference);
                    console.log('[References] REFERENCE #' + collectedReferences.length + ':', {
                      id: data.reference.id,
                      title: data.reference.title?.substring(0, 60),
                      authors: data.reference.authors?.length || 0,
                      year: data.reference.year,
                      current: data.current,
                      total: data.total
                    });
                    setReferences(prev => [...prev, data.reference]);
                    if (data.current && data.total) {
                      setReferencesCurrentProgress(data.current);
                    }
                  } else if (data.type === 'complete') {
                    console.log('[References] COMPLETE - Total references in complete message:', data.references?.length || 0);
                    console.log('[References] Method used:', data.method);
                    console.log('[References] Previously collected:', collectedReferences.length);
                    if (data.references) {
                      collectedReferences = data.references;
                      setReferences(data.references);
                      console.log('[References] All references:', data.references.map((r: any) => ({
                        id: r.id,
                        title: r.title?.substring(0, 40),
                        authors: r.authors?.length
                      })));
                    }
                    setReferencesProgress('');
                  } else if (data.type === 'error') {
                    console.error('[References] ERROR from stream:', data.error);
                    setReferencesProgress(`Error: ${data.error}`);
                  } else {
                    console.log('[References] Unknown message type:', data.type, data);
                  }
                } catch (e) {
                  console.warn('[References] Failed to parse line as JSON:', line.substring(0, 100));
                  console.warn('[References] Parse error:', e);
                }
              }
            }
          }

          // Process any remaining data in buffer
          if (buffer.trim()) {
            console.log('[References] Processing remaining buffer:', buffer.substring(0, 200));
            try {
              const data = JSON.parse(buffer);
              console.log('[References] Parsed remaining buffer, type:', data.type);
              if (data.references) {
                collectedReferences = data.references;
                setReferences(data.references);
                console.log('[References] Updated references from buffer:', data.references.length);
              }
            } catch (e) {
              console.warn('[References] Failed to parse remaining buffer:', e);
            }
          }
        } catch (streamError) {
          console.error('[References] Stream interrupted:', streamError);
          console.log('[References] Collected references before interruption:', collectedReferences.length);
          console.log('[References] References collected so far:', collectedReferences.map(r => ({
            id: r.id,
            title: r.title?.substring(0, 40)
          })));
          setReferencesProgress('Stream interrupted - saving partial results...');
        }

        console.log('=== REFERENCE EXTRACTION STREAM COMPLETE ===');
        console.log('[References] Total collected references:', collectedReferences.length);
        console.log('[References] Summary:', collectedReferences.map((r, idx) => `${idx + 1}. ${r.title?.substring(0, 50)}`).join('\n'));

        // Save collected references to database (even if stream was interrupted)
        if (collectedReferences.length > 0 && paperId) {
          try {
            console.log('[References] Saving', collectedReferences.length, 'references to database for paper:', paperId);
            await paperPersistenceApi.saveReferences(paperId, collectedReferences);
            console.log('[References] Successfully saved all references to database');
            setReferencesProgress(`Saved ${collectedReferences.length} references`);
          } catch (error) {
            console.error('[References] Failed to save references:', error);
            setReferencesProgress('Extraction completed but save failed');
          }
        } else {
          console.warn('[References] No references to save. Count:', collectedReferences.length, 'Paper ID:', paperId);
        }
      } else if (response.ok) {
        console.log('[References] Fallback: Non-streaming response');
        // Fallback for non-streaming response
        const data = await response.json();
        console.log('[References] Fallback response data:', data);
        collectedReferences = data.references || [];
        console.log('[References] Fallback extracted', collectedReferences.length, 'references');
        setReferences(collectedReferences);

        if (collectedReferences.length > 0 && paperId) {
          try {
            console.log('[References] Fallback: Saving references');
            await paperPersistenceApi.saveReferences(paperId, collectedReferences);
            console.log('[References] Fallback: References saved successfully');
          } catch (error) {
            console.error('[References] Fallback: Failed to save references:', error);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('[References] Request failed:', response.status, response.statusText);
        console.error('[References] Error response:', errorText);
        setReferencesProgress('Failed to extract references');
      }
    } catch (error) {
      console.error('[References] Error generating references:', error);
      console.error('[References] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Save any collected references even if there was an error
      if (collectedReferences.length > 0 && paperId) {
        console.log('[References] Attempting to save', collectedReferences.length, 'partial references after error');
        try {
          await paperPersistenceApi.saveReferences(paperId, collectedReferences);
          console.log('[References] Partial references saved successfully');
          setReferencesProgress(`Error occurred - saved ${collectedReferences.length} partial references`);
        } catch (saveError) {
          console.error('[References] Failed to save partial references:', saveError);
          setReferencesProgress('Error occurred');
        }
      } else {
        console.log('[References] No partial references to save after error');
        setReferencesProgress('Error occurred');
      }
    } finally {
      console.log('=== REFERENCE EXTRACTION FINISHED ===');
      console.log('[References] Final count:', collectedReferences.length);
      setIsGeneratingReferences(false);
      setTimeout(() => {
        setReferencesProgress('');
        setReferencesTotalCount(0);
        setReferencesCurrentProgress(0);
      }, 3000); // Clear progress after 3s
    }
  };


  const fetchPaper = async (): Promise<boolean> => {
    try {
      // Try fetching as resource from backend
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/resources/${paperId}`);
      if (response.ok) {
        const resource = await response.json();

        // Use current token from Redux store (already available via useSelector)
        const proxyUrl = `${config.API_BASE_URL}/api/resources/${paperId}/proxy${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        // Convert resource to paper format
        const paperData = {
          id: paperId!,
          title: resource.title,
          authors: [],
          venue: '',
          year: new Date().getFullYear(),
          abstract: resource.description || '',
          file_url: proxyUrl,
          citations: 0,
          tags: resource.tags || []
        };
        setPaper(paperData);
        setIsResource(true);
        setLoading(false);
        return true; // It's a resource
      }
    } catch (error) {
      console.error('Failed to fetch paper:', error);
      setLoading(false);
      return false;
    }

    setLoading(false);
    return false;
  };
  
  const handleHighlightCreate = useCallback(async (highlight: Omit<Highlight, 'id'>) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: Date.now().toString(),
    };
    setHighlights(prev => [...prev, newHighlight]);
    
    try {
      await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'highlight',
          page: highlight.page,
          position: {
            x: highlight.startOffset,
            y: highlight.endOffset,
            width: 0,
            height: 0,
          },
          content: highlight.text,
          color: highlight.color,
        }),
      });
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }
  }, [paperId]);

  const handleHighlightUpdate = useCallback((id: string, startOffset: number, endOffset: number) => {
    // Implementation unchanged
  }, []);

  const handleHighlightDelete = useCallback((id: string) => {
    // Implementation unchanged
  }, []);

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    // Implementation unchanged
  }, []);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  // Sidebar resize handlers
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 300px and 800px
      setSidebarWidth(Math.max(300, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Load chat sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!paperId || !user?.id) return;

      try {
        const sessions = await paperPersistenceApi.getSessions(paperId, String(user.id));

        if (sessions.length > 0) {
          // Convert API sessions to local format and load messages
          const sessionsWithMessages = await Promise.all(
            sessions.map(async (s) => {
              const messages = await paperPersistenceApi.getSessionMessages(s.id);
              return {
                id: s.id,
                title: s.title,
                messages: messages.map(m => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  timestamp: m.created_at
                })),
                createdAt: s.created_at,
                updatedAt: s.updated_at
              };
            })
          );

          setChatSessions(sessionsWithMessages);
          setActiveSessionId(sessions[0].id);
        } else {
          // No sessions exist - create initial session in database
          try {
            const newSession = await paperPersistenceApi.createSession(initialSessionId, paperId, String(user.id), 'New Chat');
            console.log('Created initial session in database');

            // Update React state with the newly created session
            setChatSessions([{
              id: newSession.id,
              title: newSession.title,
              messages: [],
              createdAt: newSession.created_at,
              updatedAt: newSession.updated_at
            }]);
            setActiveSessionId(newSession.id);
          } catch (createError) {
            console.log('Could not create initial session, using in-memory');
          }
        }
      } catch (error) {
        console.log('Persistence not available, using in-memory sessions');
        // Continue with default in-memory session
      }
    };

    loadSessions();
  }, [paperId, user?.id]);

  // Auto-scroll to bottom when switching to assistant tab or when messages change
  useEffect(() => {
    if (activeTab === 'assistant' && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [activeTab, activeSessionId, chatSessions]);

  const sendMessage = async (message: string, options?: { regenerateForAssistantId?: string }) => {
    let assistantMessageId: string;

    // If regenerating, don't create a new user message
    if (!options?.regenerateForAssistantId) {
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };

      // Persist user message to database (optional - fails silently if DB not available)
      try {
        if (user?.id) {
          await paperPersistenceApi.addMessage(
            newMessage.id,
            activeSessionId,
            'user',
            message,
            selectedText || undefined
          );
        }
      } catch (error) {
        // Silently fail - persistence is optional
      }

      // Update the active session with the new user message
      setChatSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, newMessage],
              updatedAt: new Date().toISOString()
            }
          : session
      ));

      // Add placeholder assistant message for streaming
      assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };

      setChatSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, assistantMessage] }
          : session
      ));
    } else {
      // For regeneration, reuse the existing assistant message ID and clear its content
      assistantMessageId = options.regenerateForAssistantId;
      setChatSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: session.messages.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: '', timestamp: new Date().toISOString() }
                  : m
              )
            }
          : session
      ));
    }

    // Track full response at function scope so it's accessible in catch block
    let fullResponse = '';

    try {
      if (!paper?.file_url) return;

      // Set streaming state
      setIsStreamingResponse(true);
      setStreamingStatus('Connecting...');

      // Get PDF URL with token if needed
      let pdfUrl = paper.file_url;
      // Our own stored files go through the backend proxy; older records may still hold AWS URLs.
      if ((pdfUrl.startsWith(config.AWS_BASE_URL) || pdfUrl.includes('.amazonaws.com/')) && token) {
        pdfUrl = `${config.API_BASE_URL}/api/papers/proxy-pdf?url=${encodeURIComponent(pdfUrl)}&token=${encodeURIComponent(token)}`;
      }

      // Choose endpoint based on reasoning mode
      const endpoint = enableReasoningMode
        ? `${config.AI_AGENT_URL}/ai-api/papers/chat-with-reasoning`
        : `${config.AI_AGENT_URL}/ai-api/papers/chat`;

      // Clear reasoning steps if starting new reasoning session
      if (enableReasoningMode) {
        setReasoningSteps([]);
        setCurrentReasoningStep(0);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          token: token || undefined,
          message,
          context: selectedText || undefined,
          max_iterations: 5,
          enable_reflection: true,
          enable_web_search: true
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);

                if (data.type === 'status' && data.message) {
                  // Update status message
                  console.log('[Streaming] Status:', data.message);
                  setStreamingStatus(data.message);
                } else if (data.type === 'reasoning') {
                  // Handle reasoning events (thought, decision, etc.)
                  console.log('[Reasoning] Step:', data.step, 'Phase:', data.phase);
                  console.log('[Reasoning] Content:', data.content);
                  if (data.step) {
                    setCurrentReasoningStep(data.step);
                  }
                  // Update or create reasoning step
                  setReasoningSteps(prev => {
                    console.log('[Reasoning Steps] Current steps:', prev.length);
                    const stepIndex = prev.findIndex(s => s.iteration === data.step);
                    if (stepIndex >= 0) {
                      // Update existing step
                      const updated = [...prev];
                      if (data.phase === 'thought') {
                        updated[stepIndex] = { ...updated[stepIndex], thought: data.content };
                      }
                      console.log('[Reasoning Steps] Updated step', stepIndex);
                      return updated;
                    } else if (data.step) {
                      // Create new step
                      console.log('[Reasoning Steps] Created new step', data.step);
                      return [...prev, { iteration: data.step, thought: data.content }];
                    }
                    return prev;
                  });
                  // Auto-scroll to show reasoning steps
                  if (chatMessagesRef.current) {
                    setTimeout(() => {
                      if (chatMessagesRef.current) {
                        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
                      }
                    }, 100);
                  }
                } else if (data.type === 'tool_call') {
                  // Handle tool call events
                  console.log('[Tool Call] Tool:', data.tool, 'Args:', data.args);
                  setReasoningSteps(prev => {
                    const stepIndex = prev.findIndex(s => s.iteration === data.step);
                    if (stepIndex >= 0) {
                      const updated = [...prev];
                      updated[stepIndex] = {
                        ...updated[stepIndex],
                        action: data.tool,
                        tool: data.tool,
                        args: data.args
                      };
                      console.log('[Tool Call] Updated step', stepIndex, 'with tool', data.tool);
                      return updated;
                    }
                    return prev;
                  });
                  // Auto-scroll
                  if (chatMessagesRef.current) {
                    setTimeout(() => {
                      if (chatMessagesRef.current) {
                        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
                      }
                    }, 100);
                  }
                } else if (data.type === 'observation') {
                  // Handle observation events
                  console.log('[Observation] Result length:', data.result?.length);
                  console.log('[Observation] First 100 chars:', data.result?.substring(0, 100));
                  setReasoningSteps(prev => {
                    const stepIndex = prev.findIndex(s => s.iteration === data.step);
                    if (stepIndex >= 0) {
                      const updated = [...prev];
                      updated[stepIndex] = {
                        ...updated[stepIndex],
                        observation: data.result
                      };
                      console.log('[Observation] Updated step', stepIndex);
                      return updated;
                    }
                    return prev;
                  });
                  // Auto-scroll
                  if (chatMessagesRef.current) {
                    setTimeout(() => {
                      if (chatMessagesRef.current) {
                        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
                      }
                    }, 100);
                  }
                } else if (data.type === 'reflection') {
                  // Handle reflection events
                  console.log('[Reflection]', data.content);
                  setReasoningSteps(prev => {
                    const stepIndex = prev.findIndex(s => s.iteration === data.step);
                    if (stepIndex >= 0) {
                      const updated = [...prev];
                      updated[stepIndex] = {
                        ...updated[stepIndex],
                        reflection: data.content
                      };
                      console.log('[Reflection] Updated step', stepIndex);
                      return updated;
                    }
                    return prev;
                  });
                  // Auto-scroll
                  if (chatMessagesRef.current) {
                    setTimeout(() => {
                      if (chatMessagesRef.current) {
                        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
                      }
                    }, 100);
                  }
                } else if (data.type === 'final_answer' && data.content) {
                  // Handle final answer chunks (from reasoning mode)
                  fullResponse += data.content;
                  console.log('[Final Answer] Chunk received, total length:', fullResponse.length);
                  // Clear status once we start receiving content
                  if (streamingStatus) {
                    setStreamingStatus('');
                  }
                  // Update the assistant message with accumulated content
                  setChatSessions(prev => prev.map(session =>
                    session.id === activeSessionId
                      ? {
                          ...session,
                          messages: session.messages.map(msg =>
                            msg.id === assistantMessageId
                              ? { ...msg, content: fullResponse }
                              : msg
                          )
                        }
                      : session
                  ));
                } else if (data.type === 'chunk' && data.content) {
                  // Handle regular chat chunks (non-reasoning mode)
                  fullResponse += data.content;
                  console.log('[Streaming] Chunk received, total length:', fullResponse.length);
                  // Clear status once we start receiving content
                  if (streamingStatus) {
                    setStreamingStatus('');
                  }
                  // Update the assistant message with accumulated content
                  setChatSessions(prev => prev.map(session =>
                    session.id === activeSessionId
                      ? {
                          ...session,
                          messages: session.messages.map(msg =>
                            msg.id === assistantMessageId
                              ? { ...msg, content: fullResponse }
                              : msg
                          )
                        }
                      : session
                  ));
                } else if (data.type === 'complete') {
                  // Reasoning session completed
                  console.log('[Complete] Reasoning iterations:', data.iterations);
                  setStreamingStatus('');
                } else if (data.type === 'error') {
                  console.error('Chat error:', data.error);
                  // Use partial response if available, otherwise show error
                  const errorContent = data.partial_response
                    ? `${data.partial_response}\n\n[Response interrupted: ${data.error}]`
                    : `Error: ${data.error}`;

                  setChatSessions(prev => prev.map(session =>
                    session.id === activeSessionId
                      ? {
                          ...session,
                          messages: session.messages.map(msg =>
                            msg.id === assistantMessageId
                              ? { ...msg, content: errorContent }
                              : msg
                          )
                        }
                      : session
                  ));

                  // Update fullResponse to save partial content
                  if (data.partial_response) {
                    fullResponse = data.partial_response;
                  }
                }
              } catch (e) {
                console.error('Failed to parse streaming data:', e);
              }
            }
          }
        }

        // Persist assistant message to database after streaming completes (optional)
        // Skip persistence if regenerating (message already exists in DB)
        if (fullResponse && user?.id && !options?.regenerateForAssistantId) {
          try {
            await paperPersistenceApi.addMessage(
              assistantMessageId,
              activeSessionId,
              'assistant',
              fullResponse
            );

            // Update session title with AI-generated title if this is the first response
            const activeSession = chatSessions.find(s => s.id === activeSessionId);
            console.log('[Chat Title] Active session:', activeSession);
            console.log('[Chat Title] Message count:', activeSession?.messages.length);

            // Check if this is the first assistant response (messages contains 1 user + 1 assistant = 2 total)
            if (activeSession && activeSession.messages.length === 2) {
              // Get the user's first message
              const firstUserMessage = activeSession.messages[0];
              console.log('[Chat Title] First user message:', firstUserMessage.content.substring(0, 100));

              // Generate title using AI agent
              try {
                console.log('[Chat Title] Calling generate-chat-title API...');
                const titleResponse = await fetch(`${config.AI_AGENT_URL}/ai-api/papers/generate-chat-title`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_message: firstUserMessage.content,
                    ai_response: fullResponse
                  })
                });

                if (titleResponse.ok) {
                  const { title } = await titleResponse.json();
                  console.log('[Chat Title] Generated title:', title);

                  await paperPersistenceApi.updateSessionTitle(activeSessionId, title);
                  console.log('[Chat Title] Title updated in database');

                  // Update local state
                  setChatSessions(prev => prev.map(session =>
                    session.id === activeSessionId
                      ? { ...session, title }
                      : session
                  ));
                  console.log('[Chat Title] Title updated in local state');
                } else {
                  console.warn('[Chat Title] API returned error:', titleResponse.status);
                  // Fallback to truncated version if API fails
                  const fallbackTitle = fullResponse.slice(0, 50) + (fullResponse.length > 50 ? '...' : '');
                  await paperPersistenceApi.updateSessionTitle(activeSessionId, fallbackTitle);
                  setChatSessions(prev => prev.map(session =>
                    session.id === activeSessionId
                      ? { ...session, title: fallbackTitle }
                      : session
                  ));
                }
              } catch (titleError) {
                console.error('[Chat Title] Failed to generate AI title:', titleError);
                // Fallback to truncated version if title generation fails
                const fallbackTitle = fullResponse.slice(0, 50) + (fullResponse.length > 50 ? '...' : '');
                await paperPersistenceApi.updateSessionTitle(activeSessionId, fallbackTitle);
                setChatSessions(prev => prev.map(session =>
                  session.id === activeSessionId
                    ? { ...session, title: fallbackTitle }
                    : session
                ));
              }
            } else {
              console.log('[Chat Title] Not first message, skipping title generation');
            }
          } catch (error) {
            console.warn('Failed to persist message:', error);
            // Silently fail - persistence is optional
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // If we have partial response, show it with error message
      const errorMessage = fullResponse
        ? `${fullResponse}\n\n[Connection interrupted - partial response shown]`
        : 'Failed to get response from AI assistant.';

      setChatSessions(prev => prev.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: errorMessage }
                  : msg
              )
            }
          : session
      ));

      // Try to save partial response to database
      if (fullResponse && user?.id) {
        try {
          await paperPersistenceApi.addMessage(
            assistantMessageId,
            activeSessionId,
            'assistant',
            errorMessage
          );
        } catch (dbError) {
          console.error('Failed to save partial response:', dbError);
        }
      }
    } finally {
      // Always clear streaming state
      setIsStreamingResponse(false);
      setStreamingStatus('');
    }
  };

  const analyzePaper = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/analyze`, {
        method: 'POST'
      });

      if (response.ok) {
        const analysis = await response.json();
        setPaperAnalysis(analysis);
      }
    } catch (error) {
      console.error('Failed to analyze paper:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Toolbar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="font-medium">{t('paperReader.backToLibrary')}</span>
              </button>
              {paper && (
                <div className="border-l border-gray-300 pl-6">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{paper.title}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{paper.venue} {paper.year}</span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {paper.citations} {t('paperReader.citations')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title={t('paperReader.zoomOut')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                    <span className="px-3 font-medium text-gray-700 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title={t('paperReader.zoomIn')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                </div>
                <div className="h-6 w-px bg-gray-300"></div>
                <button
                  onClick={() => setIsCropMode(!isCropMode)}
                  className={`w-8 h-8 flex items-center justify-center ${isCropMode ? 'bg-blue-100 text-blue-600' : 'text-gray-600'} hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors`}
                  title={isCropMode ? "Crop Mode Active - Click to disable" : "Crop Tool - Select text by dragging a rectangle"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16V4h12M8 20h12V8M4 12h8M16 12v8" />
                  </svg>
                </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* AI Assistant Sessions Sidebar - positioned to the left */}
        <AnimatePresence>
          {showSessionsSidebar && activeTab === 'assistant' && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 224 }}
              exit={{ width: 0 }}
              className="bg-white border-r border-gray-200 flex flex-col shadow-lg z-30 overflow-hidden"
            >
              <div className="p-3 border-b border-gray-200">
                <button
                  onClick={async () => {
                    const newSession: ChatSession = {
                      id: crypto.randomUUID(),
                      title: 'New Chat',
                      messages: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };

                    // Persist to database (optional)
                    if (paperId && user?.id) {
                      try {
                        await paperPersistenceApi.createSession(
                          newSession.id,
                          paperId,
                          String(user.id),
                          'New Chat'
                        );
                      } catch (error) {
                        // Silently fail - persistence is optional
                      }
                    }

                    setChatSessions(prev => [...prev, newSession]);
                    setActiveSessionId(newSession.id);
                  }}
                  disabled={chatSessions.some(s => s.id === activeSessionId && s.messages.length === 0)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    chatSessions.some(s => s.id === activeSessionId && s.messages.length === 0)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatSessions.map(session => (
                  <div
                    key={session.id}
                    className={`group relative flex items-start px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                      session.id === activeSessionId
                        ? 'bg-blue-50 border-blue-600'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        session.id === activeSessionId ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {session.messages.length} msgs
                      </p>
                    </div>
                    {chatSessions.length > 1 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Delete from database (optional)
                          try {
                            await paperPersistenceApi.deleteSession(session.id);
                          } catch (error) {
                            // Silently fail - persistence is optional
                          }

                          setChatSessions(prev => prev.filter(s => s.id !== session.id));
                          if (activeSessionId === session.id) {
                            const remaining = chatSessions.filter(s => s.id !== session.id);
                            setActiveSessionId(remaining[0]?.id || '');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-1 p-1 hover:bg-red-100 rounded transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col bg-gray-50">
          {paper?.file_url ? (
            <PDFViewer
              fileUrl={paper.file_url}
              scale={scale}
              onLoadSuccess={(data) => setNumPages(data.numPages)}
              onPageChange={setVisiblePage}
              onTextSelection={handleTextSelection}
              highlights={highlights}
              onHighlightCreate={handleHighlightCreate}
              onHighlightUpdate={handleHighlightUpdate}
              onHighlightDelete={handleHighlightDelete}
              onHighlightClick={handleHighlightClick}
              scrollToPage={scrollToPage}
              highlightAnnotation={highlightAnnotation}
              isCropMode={isCropMode}
              onAskAI={(text, imageUrl) => {
                // Directly send message to AI instead of setting selectedText
                setActiveTab('assistant');
                // Send message with the selected text and image
                if (imageUrl) {
                  sendMessage(`${text}\n\n[Image: ${imageUrl}]`);
                } else {
                  sendMessage(text);
                }
              }}
              onAddNote={(data) => {
                // Create a new annotation note with the selected text
                setActiveTab('notes');
                setPrefilledNoteData({
                  text: data.text,
                  page: data.page,
                  quote: data.quote,
                  startOffset: data.startOffset,
                  endOffset: data.endOffset,
                  imageUrl: data.imageUrl
                });
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">{t('paperReader.noPdfAvailable')}</div>
          )}
        </div>

        {numPages && (
            <div className="absolute bottom-4 right-1/2 translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm font-medium z-20">
                {visiblePage} / {numPages}
            </div>
        )}

        <AnimatePresence>
          {sidePanelOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: sidebarWidth }}
              exit={{ width: 0 }}
              className="bg-white border-l border-gray-200 flex flex-col shadow-xl z-10 relative"
            >
              {/* Resize handle */}
              <div
                onMouseDown={handleResizeStart}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-50 group"
                style={{ marginLeft: '-2px' }}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded-full group-hover:bg-blue-500 transition-colors" />
              </div>
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex">
                  <button onClick={() => setActiveTab('assistant')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'assistant' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('paperReader.aiAssistant')}{activeTab === 'assistant' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />)}</button>
                  <button onClick={() => setActiveTab('notes')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'notes' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('paperReader.notes')}{activeTab === 'notes' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />)}</button>
                  <button onClick={() => setActiveTab('outline')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'outline' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('paperReader.outline')}{activeTab === 'outline' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />)}</button>
                  <button onClick={() => setActiveTab('references')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'references' ? 'text-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('paperReader.references')}{activeTab === 'references' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />)}</button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTab === 'assistant' && (
                  <ReadingAssistant
                    chatSessions={chatSessions}
                    activeSessionId={activeSessionId}
                    onSendMessage={sendMessage}
                    enableReasoningMode={enableReasoningMode}
                    onToggleReasoningMode={setEnableReasoningMode}
                    reasoningSteps={reasoningSteps}
                    currentReasoningStep={currentReasoningStep}
                    onUpdateMessage={(messageId, updates) => {
                      setChatSessions(prev => prev.map(session =>
                        session.id === activeSessionId
                          ? {
                              ...session,
                              messages: session.messages.map(m =>
                                m.id === messageId ? { ...m, ...updates } : m
                              )
                            }
                          : session
                      ));
                    }}
                    user={user}
                    onCreateSession={async () => {
                      const newSession: ChatSession = {
                        id: crypto.randomUUID(),
                        title: 'New Chat',
                        messages: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };

                      // Persist to database (optional)
                      if (paperId && user?.id) {
                        try {
                          await paperPersistenceApi.createSession(
                            newSession.id,
                            paperId,
                            String(user.id),
                            'New Chat'
                          );
                        } catch (error) {
                          // Silently fail - persistence is optional
                        }
                      }

                      setChatSessions(prev => [...prev, newSession]);
                      setActiveSessionId(newSession.id);
                    }}
                    onSelectSession={setActiveSessionId}
                    onDeleteSession={async (id) => {
                      // Delete from database (optional)
                      try {
                        await paperPersistenceApi.deleteSession(id);
                      } catch (error) {
                        // Silently fail - persistence is optional
                      }

                      setChatSessions(prev => prev.filter(s => s.id !== id));
                      if (activeSessionId === id) {
                        const remaining = chatSessions.filter(s => s.id !== id);
                        setActiveSessionId(remaining[0]?.id || '');
                      }
                    }}
                    paperId={paperId}
                    showSessionsSidebar={showSessionsSidebar}
                    setShowSessionsSidebar={setShowSessionsSidebar}
                    chatMessagesRef={chatMessagesRef}
                    isStreaming={isStreamingResponse}
                    streamingStatus={streamingStatus}
                  />
                )}
                {activeTab === 'notes' && (
                  <NotesPanel
                    notes={notes}
                    paperId={paperId}
                    onNotesUpdate={fetchNotes}
                    prefilledAnnotation={prefilledNoteData}
                    onClearPrefill={() => setPrefilledNoteData(null)}
                    onNoteClick={(page, startOffset, endOffset) => {
                      // Navigate to the page and scroll to the annotation
                      setScrollToPage(page);

                      // Highlight the annotation temporarily after scrolling completes
                      if (startOffset !== undefined && endOffset !== undefined) {
                        // Wait for scroll to complete, then show highlight for 2 seconds
                        setTimeout(() => {
                          setHighlightAnnotation({ page, startOffset, endOffset });

                          // Clear highlight after 2 seconds
                          setTimeout(() => {
                            setHighlightAnnotation(null);
                          }, 2000);
                        }, 600); // Wait for scroll animation to complete
                      }

                      // Clear scrollToPage after scrolling
                      setTimeout(() => setScrollToPage(undefined), 500);
                    }}
                  />
                )}
                {activeTab === 'outline' && <OutlinePanel sections={outline} onSectionClick={(pageNum) => setVisiblePage(pageNum)} onGenerateOutline={generateOutline} isGenerating={isGeneratingOutline} />}
                {activeTab === 'references' && <ReferencesPanel references={references} onGenerateReferences={generateReferences} isGenerating={isGeneratingReferences} progressMessage={referencesProgress} totalCount={referencesTotalCount} currentProgress={referencesCurrentProgress} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setSidePanelOpen(!sidePanelOpen)}
          className="absolute top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-lg hover:shadow-xl transition-all duration-300 z-20"
          style={{ right: sidePanelOpen ? sidebarWidth : 0 }}
          title={sidePanelOpen ? t('paperReader.hidePanel') : t('paperReader.showPanel')}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidePanelOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
          </svg>
        </button>
      </div>
    </div>
  );
};

const ReadingAssistant: React.FC<{
    chatSessions: ChatSession[];
    activeSessionId: string;
    onSendMessage: (message: string, options?: { regenerateForAssistantId?: string }) => void;
    onCreateSession: () => void;
    onSelectSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onUpdateMessage: (messageId: string, updates: Partial<Message>) => void;
    paperId?: string;
    showSessionsSidebar: boolean;
    setShowSessionsSidebar: (show: boolean) => void;
    chatMessagesRef: React.RefObject<HTMLDivElement>;
    user?: any;
    isStreaming?: boolean;
    streamingStatus?: string;
    enableReasoningMode?: boolean;
    onToggleReasoningMode?: (enabled: boolean) => void;
    reasoningSteps?: ReasoningStep[];
    currentReasoningStep?: number;
  }> = ({
    chatSessions,
    activeSessionId,
    onSendMessage,
    onCreateSession,
    onSelectSession,
    onDeleteSession,
    onUpdateMessage,
    paperId,
    showSessionsSidebar,
    setShowSessionsSidebar,
    chatMessagesRef,
    user,
    isStreaming,
    streamingStatus,
    enableReasoningMode = false,
    onToggleReasoningMode,
    reasoningSteps = [],
    currentReasoningStep = 0
  }) => {
    const [input, setInput] = useState('');
    const { t } = useTranslation();

    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    const messages = activeSession?.messages || [];

    // Helper function to update a specific message in the active session
    const updateMessage = (messageId: string, updates: Partial<Message>) => {
      onUpdateMessage(messageId, updates);
    };

    // Check if active session is empty (new session)
    const isActiveSessionEmpty = messages.length === 0;

    const handleCreateSession = () => {
      // Don't create new session if current one is already empty
      if (isActiveSessionEmpty) {
        return;
      }
      onCreateSession();
    };

    const quickActions = [
      { id: 'summarize', label: t('paperReader.readingAssistant.summarizePaper'), action: 'summarize', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id: 'insights', label: t('paperReader.readingAssistant.keyInsights'), action: 'extract_insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
      { id: 'math', label: t('paperReader.readingAssistant.explainMath'), action: 'explain_math', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { id: 'prerequisites', label: t('paperReader.readingAssistant.prerequisites'), action: 'find_prerequisites', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }
    ];

    // Generate contextual follow-up prompts based on the last message
    const getContextualPrompts = (lastUserMessage: string, lastAiMessage: string) => {
      const prompts: string[] = [];
      const aiLower = lastAiMessage.toLowerCase();
      const userLower = lastUserMessage.toLowerCase();

      // Check if AI failed to answer or couldn't access information
      const failureIndicators = [
        'unable to',
        'cannot',
        'could not',
        'not found',
        'no sections',
        'failed to',
        'error',
        'not available',
        'do not have',
        'not provide',
        'insufficient',
        'not informative'
      ];

      const hasFailed = failureIndicators.some(indicator => aiLower.includes(indicator));

      if (hasFailed) {
        // Don't show topic-specific prompts if AI couldn't answer
        // Instead show general retry/alternative prompts
        return [
          'Can you try searching the paper for specific keywords?',
          'What sections are available in this paper?',
          'Can you extract the abstract?'
        ];
      }

      // Analyze AI response content to generate smart follow-ups
      const topics = {
        cnn: aiLower.includes('cnn') || aiLower.includes('convolutional'),
        transformer: aiLower.includes('transformer') || aiLower.includes('attention'),
        dataset: aiLower.includes('dataset') || aiLower.includes('data'),
        architecture: aiLower.includes('architecture') || aiLower.includes('model') || aiLower.includes('network'),
        training: aiLower.includes('training') || aiLower.includes('optimization'),
        results: aiLower.includes('result') || aiLower.includes('accuracy') || aiLower.includes('performance'),
        methodology: aiLower.includes('method') || aiLower.includes('approach') || aiLower.includes('technique'),
        application: aiLower.includes('application') || aiLower.includes('use case'),
        limitation: aiLower.includes('limitation') || aiLower.includes('challenge') || aiLower.includes('drawback'),
        comparison: aiLower.includes('compare') || aiLower.includes('versus') || aiLower.includes('baseline'),
      };

      // Generate specific follow-ups based on detected topics
      if (topics.cnn || topics.transformer) {
        const modelType = topics.cnn ? 'CNN' : 'Transformer';
        prompts.push(`How does ${modelType} architecture work in this context?`);
        prompts.push(`What are the advantages of using ${modelType} here?`);
        prompts.push(`Are there alternative architectures that could work?`);
      } else if (topics.architecture && !userLower.includes('simple')) {
        prompts.push('Can you explain this architecture in simpler terms?');
        prompts.push('What are the key components and their roles?');
        prompts.push('How does this differ from previous approaches?');
      } else if (topics.methodology && !userLower.includes('result')) {
        prompts.push('What are the key results from this methodology?');
        prompts.push('What datasets were used to validate this?');
        prompts.push('How does this compare to prior work?');
      } else if (topics.dataset) {
        prompts.push('What preprocessing was applied to the data?');
        prompts.push('How was the dataset split for training/validation?');
        prompts.push('Are there any dataset limitations or biases?');
      } else if (topics.training) {
        prompts.push('What hyperparameters were used?');
        prompts.push('How long did training take?');
        prompts.push('Were there any convergence challenges?');
      } else if (topics.results) {
        prompts.push('What do these results imply for the field?');
        prompts.push('How significant is this improvement?');
        prompts.push('What are the practical applications?');
      } else if (topics.limitation) {
        prompts.push('How could these limitations be addressed?');
        prompts.push('What future work is suggested?');
        prompts.push('Do these limitations impact real-world use?');
      } else if (topics.comparison) {
        prompts.push('What makes this approach superior?');
        prompts.push('Are there trade-offs to consider?');
        prompts.push('Which scenarios favor this method?');
      } else if (userLower.includes('explain') && aiLower.length > 300) {
        prompts.push('Can you give a concrete example?');
        prompts.push('What are the mathematical foundations?');
        prompts.push('How would I implement this?');
      } else {
        // Smart defaults based on response length and structure
        if (aiLower.includes('•') || aiLower.includes('1.') || aiLower.includes('-')) {
          prompts.push('Can you elaborate on the first point?');
          prompts.push('Which of these is most important?');
        } else {
          prompts.push('Can you provide more details?');
          prompts.push('What are the practical implications?');
        }
        prompts.push('Are there related concepts I should know?');
      }

      return prompts.slice(0, 3); // Return max 3 prompts
    };

    const handleQuickAction = async (action: string) => {
      onSendMessage(`${t('paperReader.readingAssistant.pleaseAction')} ${action.replace('_', ' ')} ${t('paperReader.readingAssistant.thisPaper')}`);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) {
        onSendMessage(input);
        setInput('');
      }
    };
  
    return (
      <div className="flex h-full bg-gray-50 flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSessionsSidebar(!showSessionsSidebar)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={showSessionsSidebar ? 'Hide sessions' : 'Show sessions'}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 truncate">
              {activeSession?.title || 'New Chat'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleReasoningMode && onToggleReasoningMode(!enableReasoningMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                enableReasoningMode
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
              title={enableReasoningMode ? 'Disable deep reasoning mode' : 'Enable deep reasoning mode with chain-of-thought'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {enableReasoningMode ? 'Deep Analysis' : 'Quick Mode'}
            </button>
          </div>
        </div>

          {/* Chat Messages */}
          <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              {/* Quick Actions - shown when no messages */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('paperReader.readingAssistant.quickActions')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.action)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                      </svg>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const isAssistantMessage = msg.role === 'assistant';
            const previousUserMessage = index > 0 ? messages[index - 1] : null;
            const currentVersionIndex = msg.currentVersionIndex ?? (msg.versions?.length ?? 0);
            const hasVersions = msg.versions && msg.versions.length > 0;

            // Generate contextual prompts for the last AI message
            const contextualPrompts = isLastMessage && isAssistantMessage && previousUserMessage
              ? getContextualPrompts(previousUserMessage.content, msg.content)
              : [];

            return (
              <div key={msg.id}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* User/AI Avatar */}
                    {msg.role === 'user' ? (
                      user?.avatar ? (
                        <img
                          src={typeof user.avatar === 'string' ? user.avatar : URL.createObjectURL(user.avatar)}
                          alt={user.username || 'User'}
                          className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )
                    ) : (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow-md">
                        AI
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                        }`}
                      >
                        {msg.isEditing && msg.role === 'user' ? (
                          <div className="space-y-3 bg-blue-600 p-4 rounded-2xl">
                            <textarea
                              defaultValue={msg.content}
                              className="w-full px-3 py-2.5 bg-white text-gray-900 border-2 border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                              rows={4}
                              id={`edit-${msg.id}`}
                              placeholder="Edit your message..."
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  updateMessage(msg.id, { isEditing: false });
                                }}
                                className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const textarea = document.getElementById(`edit-${msg.id}`) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const newContent = textarea.value.trim();
                                    if (newContent && newContent !== msg.content) {
                                      // Find the next assistant message to regenerate
                                      const nextAssistantMsg = messages[index + 1];

                                      // Save current version before editing
                                      updateMessage(msg.id, {
                                        versions: [
                                          ...(msg.versions || []),
                                          { content: msg.content, timestamp: msg.timestamp }
                                        ],
                                        content: newContent,
                                        currentVersionIndex: (msg.versions?.length ?? 0) + 1,
                                        isEditing: false,
                                        timestamp: new Date().toISOString()
                                      });

                                      // If there's a following assistant message, regenerate it
                                      if (nextAssistantMsg && nextAssistantMsg.role === 'assistant') {
                                        // Save the assistant's current response as a version
                                        updateMessage(nextAssistantMsg.id, {
                                          versions: [
                                            ...(nextAssistantMsg.versions || []),
                                            { content: nextAssistantMsg.content, timestamp: nextAssistantMsg.timestamp }
                                          ],
                                          currentVersionIndex: (nextAssistantMsg.versions?.length ?? 0) + 1
                                        });

                                        // Regenerate with the edited user message
                                        onSendMessage(newContent, { regenerateForAssistantId: nextAssistantMsg.id });
                                      }
                                    } else {
                                      // Just cancel editing if no change
                                      updateMessage(msg.id, { isEditing: false });
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shadow-sm flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Regenerate
                              </button>
                            </div>
                          </div>
                        ) : msg.role === 'user' ? (
                          // User message - extract text only for bubble
                          (() => {
                            const imageMatch = msg.content.match(/\[Image: (https?:\/\/[^\]]+)\]/);
                            const textContent = imageMatch
                              ? msg.content.replace(imageMatch[0], '').trim()
                              : msg.content;
                            return <div className="whitespace-pre-wrap">{textContent}</div>;
                          })()
                        ) : (
                          // Assistant message - show content with streaming indicator
                          <div className="prose prose-sm max-w-none">
                            {!msg.content && isStreaming ? (
                              // Show typing indicator when streaming and no content yet
                              <div className="flex items-center gap-2 text-gray-500">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className="text-sm">{streamingStatus || 'Thinking...'}</span>
                              </div>
                            ) : (
                              <>
                                <ReactMarkdown
                                  components={{
                                    p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                    ul: ({children}) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
                                    ol: ({children}) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
                                    li: ({children}) => <li className="mb-0.5">{children}</li>,
                                    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                    code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                    pre: ({children}) => <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto my-2">{children}</pre>,
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                                {isStreaming && isLastMessage && (
                                  <span className="inline-block w-1 h-4 bg-blue-600 animate-pulse ml-0.5"></span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Image attachment (below message bubble) */}
                      {msg.role === 'user' && (() => {
                        const imageMatch = msg.content.match(/\[Image: (https?:\/\/[^\]]+)\]/);
                        if (imageMatch) {
                          const imageUrl = imageMatch[1];
                          return (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage(imageUrl);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-colors group max-w-xs shadow-sm"
                            >
                              <img
                                src={imageUrl}
                                alt="Cropped region"
                                className="w-12 h-12 object-cover rounded border border-gray-300"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium">Cropped Image</span>
                                </div>
                                <div className="text-xs text-gray-400 group-hover:text-blue-600">Click to view full size</div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Action buttons and version control */}
                      {!msg.isEditing && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          {/* Edit and Regenerate buttons */}
                          {msg.role === 'user' && (
                            <button
                              onClick={() => {
                                onUpdateMessage(msg.id, { isEditing: true });
                              }}
                              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                              title="Edit message"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}

                          {msg.role === 'assistant' && previousUserMessage && (
                            <button
                              onClick={() => {
                                // Save current response as a version
                                updateMessage(msg.id, {
                                  versions: [
                                    ...(msg.versions || []),
                                    { content: msg.content, timestamp: msg.timestamp }
                                  ],
                                  currentVersionIndex: (msg.versions?.length ?? 0) + 1
                                });

                                // Regenerate response - reuse the same assistant message bubble
                                onSendMessage(previousUserMessage.content, { regenerateForAssistantId: msg.id });
                              }}
                              className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1"
                              title="Regenerate response"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Regenerate
                            </button>
                          )}

                          {/* Version navigation for assistant messages with versions */}
                          {msg.role === 'assistant' && hasVersions && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 ml-2">
                              <button
                                onClick={() => {
                                  if (currentVersionIndex > 0) {
                                    const newIndex = currentVersionIndex - 1;
                                    const prevVersion = msg.versions![newIndex];
                                    updateMessage(msg.id, {
                                      content: prevVersion.content,
                                      currentVersionIndex: newIndex
                                    });
                                  }
                                }}
                                disabled={currentVersionIndex === 0}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Previous version"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <span className="text-[10px]">
                                {currentVersionIndex + 1}/{(msg.versions?.length ?? 0) + 1}
                              </span>
                              <button
                                onClick={() => {
                                  if (currentVersionIndex < (msg.versions?.length ?? 0)) {
                                    const newIndex = currentVersionIndex + 1;
                                    const nextContent = newIndex === msg.versions!.length
                                      ? msg.content
                                      : msg.versions![newIndex].content;
                                    updateMessage(msg.id, {
                                      content: nextContent,
                                      currentVersionIndex: newIndex
                                    });
                                  }
                                }}
                                disabled={currentVersionIndex === (msg.versions?.length ?? 0)}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next version"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contextual Follow-up Prompts */}
                {contextualPrompts.length > 0 && msg.content && !msg.isEditing && (
                  <div className="flex justify-start mt-2 mb-2">
                    <div className="ml-11 flex flex-wrap gap-2">
                      {contextualPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSendMessage(prompt)}
                          className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-all hover:shadow-sm"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
  
        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('paperReader.readingAssistant.askAnything')}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">{t('paperReader.readingAssistant.suggestions')}</span>
            <button
              onClick={() => setInput(t('paperReader.readingAssistant.whatIsMainContribution'))}
              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {t('paperReader.readingAssistant.mainContribution')}
            </button>
            <button
              onClick={() => setInput(t('paperReader.readingAssistant.whatAreLimitations'))}
              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {t('paperReader.readingAssistant.limitations')}
            </button>
          </div>
        </div>
      </div>
    );
  };

const AnalysisPanel: React.FC<{
    paperId?: string;
    analysis: any;
    onAnalyze: () => void;
    isAnalyzing: boolean;
  }> = ({ paperId, analysis, onAnalyze, isAnalyzing }) => {
    const { t } = useTranslation();
    return (
        <div className="h-full overflow-y-auto bg-gray-50">
        {!analysis ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('paperReader.analysisPanel.aiPoweredAnalysis')}</h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('paperReader.analysisPanel.analysisDescription')}
              </p>
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('paperReader.analysisPanel.analyzing')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{t('paperReader.analysisPanel.startAnalysis')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('paperReader.analysisPanel.paperOverview')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('paperReader.analysisPanel.innovationScore')}</p>
                  <p className="text-2xl font-bold text-gray-900">{analysis.innovation_score}/10</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('paperReader.analysisPanel.difficulty')}</p>
                  <p className="text-lg font-semibold text-gray-900">{analysis.difficulty}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('paperReader.analysisPanel.reproducibility')}</p>
                  <p className="text-lg font-semibold text-gray-900">{analysis.reproducibility}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('paperReader.analysisPanel.impact')}</p>
                  <p className="text-lg font-semibold text-gray-900">{analysis.impact}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('paperReader.analysisPanel.keyContributions')}</h3>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <ul className="space-y-3">
                  {analysis.contributions?.map((contrib: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      <span className="text-sm text-gray-700">{contrib}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('paperReader.analysisPanel.technicalApproach')}</h3>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-700">{analysis.technical_approach}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('paperReader.analysisPanel.resultsSummary')}</h3>
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-green-800">{analysis.results_summary}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('paperReader.analysisPanel.limitations')}</h3>
              <ul className="space-y-1">
                {analysis.limitations?.map((limitation: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600">• {limitation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

const ImplementationGuide: React.FC<{ paperId?: string }> = ({ paperId }) => {
    const [implementationSteps, setImplementationSteps] = useState<any[]>([]);
    const [generatingCode, setGeneratingCode] = useState(false);
    const { t } = useTranslation();

    const generateImplementation = async () => { 
        setGeneratingCode(true);
        try {
          const response = await fetchWithAuth(`${config.API_BASE_URL}/api/papers/${paperId}/implement`, {
            method: 'POST'
          });
    
          if (response.ok) {
            const data = await response.json();
            setImplementationSteps(data.steps);
          }
        } catch (error) {
          console.error('Failed to generate implementation:', error);
        } finally {
          setGeneratingCode(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-50">
            <div className="p-6 space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('paperReader.implementationGuide.roadmap')}</h3>
                {implementationSteps.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('paperReader.implementationGuide.generateGuide')}</h4>
                <p className="text-sm text-gray-600 mb-6">
                  {t('paperReader.implementationGuide.generateGuideDescription')}
                </p>
                <button
                  onClick={generateImplementation}
                  disabled={generatingCode}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {generatingCode ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('paperReader.implementationGuide.generating')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <span>{t('paperReader.implementationGuide.generateImplementation')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Step 1: Environment Setup */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <h4 className="font-semibold text-gray-900">{t('paperReader.implementationGuide.environmentSetup')}</h4>
                  <span className="ml-auto text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">{t('paperReader.implementationGuide.completed')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t('paperReader.implementationGuide.installDependencies')}</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>pip install torch transformers numpy pandas matplotlib</code>
                </pre>
              </div>

              {/* Step 2: Data Preparation */}
              <div className="bg-white border-2 border-blue-500 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <h4 className="font-semibold text-gray-900">{t('paperReader.implementationGuide.dataPreparation')}</h4>
                  <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{t('paperReader.implementationGuide.inProgress')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t('paperReader.implementationGuide.prepareDataset')}</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`import torch\nfrom torch.utils.data import Dataset, DataLoader\n\nclass PaperDataset(Dataset):\n    def __init__(self, data_path):\n        self.data = self.load_data(data_path)\n    \n    def __len__(self):\n        return len(self.data)\n    \n    def __getitem__(self, idx):\n        return self.data[idx]`}</code>
                </pre>
              </div>

              {/* Step 3: Model Architecture */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm">3</span>
                  <h4 className="font-medium">{t('paperReader.implementationGuide.modelArchitecture')}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t('paperReader.implementationGuide.implementArchitecture')}</p>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  {t('paperReader.implementationGuide.viewImplementationDetails')}
                </button>
              </div>

              {/* Step 4: Training */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm">4</span>
                  <h4 className="font-medium">{t('paperReader.implementationGuide.trainingLoop')}</h4>
                </div>
                <p className="text-sm text-gray-600">{t('paperReader.implementationGuide.setupTraining')}</p>
              </div>
            </div>
          )}
            </div>
            </div>

        {/* Image Viewer Modal */}
        <AnimatePresence>
          {viewingImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-90 z-[10000] flex items-center justify-center p-4"
              onClick={() => setViewingImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="relative max-w-7xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setViewingImage(null)}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* Image */}
                <img
                  src={viewingImage}
                  alt="Full size view"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
    )
}

export default PaperReader;
