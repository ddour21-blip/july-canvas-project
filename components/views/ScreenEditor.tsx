'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { addDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { col, docRef } from '@/lib/firestore';
import { getPermissions } from '@/lib/auth';
import { createComment, migrateScreenComments, parseMentions, subscribeScreenComments } from '@/lib/comments';
import { formatDateTime, generateId, getPageContext, getCssSelector, getTime, hashCode, nowMs, showToast } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';
import { generateHtmlBoilerplate } from '@/lib/htmlRenderer';
import { exportScreenMarkdown } from '@/lib/export/exportMarkdown';
import { exportScreenPdf } from '@/lib/export/exportPdf';
import { exportScreenPptx } from '@/lib/export/exportPptx';
import { Button } from '@/components/common/Button';
import { ConfirmModal, type ConfirmState } from '@/components/common/ConfirmModal';
import { CommentInputBox } from '@/components/common/CommentInputBox';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { ExportDocModal } from '@/components/modals/ExportDocModal';
import { ShareState } from '@/components/modals/ShareModal';
import {
  ArrowLeft,
  Bold,
  CheckSquare,
  Code,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  GripVertical,
  History,
  Indent,
  Link2,
  List,
  MessageCircle,
  MessageSquarePlus,
  Save,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import type {
  Annotation,
  AnnotationHistory,
  CommentDoc,
  Member,
  Project,
  Screen,
  TrackedAnnotation,
} from '@/types';

interface DraftPosition {
  x: number;
  y: number;
  absoluteX: number;
  absoluteY: number;
  targetSelector: string;
  offsetX: number;
  offsetY: number;
  pageContext: string;
}

interface ScreenEditorProps {
  screenId: string | null;
  extraParam: string | null;
  projects: Project[];
  screens: Screen[];
  navigate: (hash: string) => void;
  setShareState: (s: ShareState) => void;
  user: User | null;
  globalMembers: Member[];
  workspaceId: string;
}

/** 댓글 표시용 뷰모델 (comments 컬렉션 + 레거시 병합 결과) */
interface ViewReply {
  id: string;
  author: string | null;
  text: string;
  createdAt: number;
}
interface ViewComment extends ViewReply {
  replies: ViewReply[];
}

/** 프로젝트 전체 정책 히스토리 1건 (히스토리 대시보드용) */
interface HistoryRow {
  version: string;
  title: string;
  description: string;
  createdAt: AnnotationHistory['updatedAt'];
  screenName: string;
  screenId: string;
  annId: string;
}

export default function ScreenEditor({
  screenId,
  extraParam,
  projects,
  screens,
  navigate,
  setShareState,
  user,
  globalMembers,
  workspaceId,
}: ScreenEditorProps) {
  const [mode, setMode] = useState<'interact' | 'annotate'>('interact');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, title: '', msg: '', action: null });
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [showDraftForm, setShowDraftForm] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'edit' | 'history'>('edit');
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [draftPosition, setDraftPosition] = useState<DraftPosition>({
    x: 0,
    y: 0,
    absoluteX: 0,
    absoluteY: 0,
    targetSelector: '',
    offsetX: 0,
    offsetY: 0,
    pageContext: '',
  });
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftVersion, setDraftVersion] = useState('1.0');
  const [exportDocModalOpen, setExportDocModalOpen] = useState(false);

  const [trackedAnnotations, setTrackedAnnotations] = useState<TrackedAnnotation[]>([]);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<{ isOpen: boolean; pendingAction: (() => void) | null }>({
    isOpen: false,
    pendingAction: null,
  });
  const [screenComments, setScreenComments] = useState<CommentDoc[]>([]);
  const migratedScreens = useRef<Set<string>>(new Set());

  const screen = screens.find((s) => s.id === screenId);
  const project = projects.find((p) => p.id === screen?.projectId);
  // 권한 기반 편집 가능 여부 (owner|editor). viewer는 읽기 전용.
  const isEditor = getPermissions(project, user?.uid).canEdit;
  const annotations = useMemo(() => screen?.annotations || [], [screen]);

  // comments 컬렉션 실시간 구독 (현재 화면)
  useEffect(() => {
    if (!screenId) return;
    return subscribeScreenComments(screenId, setScreenComments);
  }, [screenId]);

  // 레거시 annotation.comments → comments 컬렉션 자동 마이그레이션 (화면당 1회, idempotent)
  useEffect(() => {
    if (!screen || !screenId || migratedScreens.current.has(screenId)) return;
    const hasLegacy = (screen.annotations || []).some((a) => (a.comments || []).length > 0);
    if (!hasLegacy) {
      migratedScreens.current.add(screenId);
      return;
    }
    migratedScreens.current.add(screenId);
    const existing = new Set(screenComments.map((c) => c.id));
    migrateScreenComments(screen, existing).catch((e) => console.warn('comment migration:', e));
  }, [screen, screenId, screenComments]);

  // 화면의 댓글을 주석(annotation)별로 묶고 레거시 fallback 병합 (중복 제거)
  const commentsByAnnotation = useMemo(() => {
    const migratedLegacyIds = new Set(
      screenComments.map((c) => c.migratedFrom?.legacyCommentId).filter(Boolean) as string[],
    );
    const map: Record<string, ViewComment[]> = {};
    for (const a of annotations) {
      const collTop = screenComments
        .filter((c) => c.annotationId === a.id && !c.parentCommentId)
        .map((c) => ({
          id: c.id,
          author: c.authorName || c.authorEmail || '익명',
          text: c.body,
          createdAt: getTime(c.createdAt),
          replies: screenComments
            .filter((r) => r.parentCommentId === c.id)
            .sort((x, y) => getTime(x.createdAt) - getTime(y.createdAt))
            .map((r) => ({ id: r.id, author: r.authorName || r.authorEmail || '익명', text: r.body, createdAt: getTime(r.createdAt) })),
        }));
      const legacyTop = (a.comments || [])
        .filter((c) => !migratedLegacyIds.has(c.id))
        .map((c) => ({
          id: c.id,
          author: c.author,
          text: c.text,
          createdAt: getTime(c.createdAt),
          replies: (c.replies || [])
            .filter((r) => !migratedLegacyIds.has(r.id))
            .map((r) => ({ id: r.id, author: r.author, text: r.text, createdAt: getTime(r.createdAt) })),
        }));
      map[a.id] = [...collTop, ...legacyTop].sort((x, y) => x.createdAt - y.createdAt);
    }
    return map;
  }, [screenComments, annotations]);

  // --- 버그 수정: 프로젝트 전체 히스토리 (sortedVersions / groupedHistory) 도출 ---
  const groupedHistory = useMemo<Record<string, HistoryRow[]>>(() => {
    if (!project) return {};
    const projectScreens = screens.filter((s) => s.projectId === project.id);
    const rows: HistoryRow[] = [];
    projectScreens.forEach((s) => {
      (s.annotations || []).forEach((ann) => {
        const hist: AnnotationHistory[] =
          ann.history && ann.history.length > 0
            ? ann.history
            : [{ version: ann.version || '1.0', title: ann.title, description: ann.description, updatedAt: ann.createdAt }];
        hist.forEach((h) => {
          rows.push({
            version: h.version || '1.0',
            title: h.title,
            description: h.description,
            createdAt: h.updatedAt,
            screenName: s.name,
            screenId: s.id,
            annId: ann.id,
          });
        });
      });
    });
    return rows.reduce<Record<string, HistoryRow[]>>((acc, row) => {
      (acc[row.version] ||= []).push(row);
      return acc;
    }, {});
  }, [screens, project]);

  const sortedVersions = useMemo(() => {
    return Object.keys(groupedHistory).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      return b.localeCompare(a);
    });
  }, [groupedHistory]);

  // 각 버전 그룹을 최신순 정렬
  const groupedHistorySorted = useMemo(() => {
    const out: Record<string, HistoryRow[]> = {};
    for (const v of Object.keys(groupedHistory)) {
      out[v] = [...groupedHistory[v]].sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    }
    return out;
  }, [groupedHistory]);

  // 라우트의 ann 딥링크(extraParam)를 선택 상태 + 주석 모드로 동기화.
  // 외부 시스템(URL)→상태 동기화이므로 effect가 적합하다.
  useEffect(() => {
    if (!extraParam) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveAnnotationId(extraParam);
    setMode('annotate');
  }, [extraParam]);

  // 마커 가시성 추적
  useEffect(() => {
    if (mode !== 'annotate') return;
    const checkVisibility = () => {
      try {
        const iframe = iframeContainerRef.current?.querySelector('iframe');
        if (!iframe || !iframe.contentDocument) return;
        const doc = iframe.contentDocument;
        const currentContext = getPageContext(doc);
        const updated: TrackedAnnotation[] = annotations.map((ann) => {
          let isVisible = false;
          let currentX = ann.x;
          let currentY = ann.y;
          const isSameContext = !ann.pageContext || ann.pageContext === currentContext;
          if (isSameContext && ann.targetSelector) {
            const el = doc.querySelector(ann.targetSelector) as HTMLElement | null;
            if (el) {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              isVisible =
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                rect.right >= 0 &&
                rect.bottom >= 0 &&
                rect.left <= (iframe.clientWidth || doc.documentElement.clientWidth) &&
                rect.top <= (iframe.clientHeight || doc.documentElement.clientHeight);
              if (isVisible && ann.offsetX !== undefined && ann.offsetY !== undefined) {
                currentX = rect.left + ann.offsetX;
                currentY = rect.top + ann.offsetY;
              }
            }
          } else if (!ann.targetSelector) {
            isVisible = true;
          }
          return { ...ann, isVisible, currentX, currentY };
        });
        setTrackedAnnotations((prev) => {
          // 가시성/위치뿐 아니라 내용(정책 텍스트·댓글/답글) 변경도 감지해야
          // 새 댓글이 즉시 렌더된다. (내용 변경 미감지 시 재로드 전까지 안 보이는 버그 수정)
          const changed =
            prev.length !== updated.length ||
            updated.some((u, i) => {
              const p = prev[i];
              if (!p) return true;
              return (
                p.isVisible !== u.isVisible ||
                Math.abs((p.currentX ?? 0) - (u.currentX ?? 0)) > 1 ||
                Math.abs((p.currentY ?? 0) - (u.currentY ?? 0)) > 1 ||
                p.title !== u.title ||
                p.description !== u.description ||
                p.version !== u.version ||
                JSON.stringify(p.comments) !== JSON.stringify(u.comments)
              );
            });
          return changed ? updated : prev;
        });
      } catch {
        /* noop */
      }
    };
    checkVisibility();
    const interval = setInterval(checkVisibility, 200);
    return () => clearInterval(interval);
  }, [annotations, mode]);

  // 툴바 드래그
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, startX: toolbarPos.x, startY: toolbarPos.y };
  };
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setToolbarPos({
        x: dragStart.current.startX + (e.clientX - dragStart.current.x),
        y: dragStart.current.startY + (e.clientY - dragStart.current.y),
      });
    };
    const handleDragEnd = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  if (!screen || !project) {
    return (
      <div className="h-[calc(100vh-61px)] flex items-center justify-center bg-[var(--surface-page)]">
        <div className="w-8 h-8 border-4 border-[var(--brand-100)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  const insertFormatting = (format: string) => {
    const textarea = descRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = draftDesc.substring(start, end);
    let newText = '';
    switch (format) {
      case 'bold':
        newText = `**${selectedText || '텍스트'}**`;
        break;
      case 'code':
        newText = `\`${selectedText || '코드'}\``;
        break;
      case 'bullet':
        newText = start === 0 ? `- ${selectedText}` : `\n- ${selectedText}`;
        break;
      case 'link':
        newText = `[${selectedText || '링크명'}](https://url)`;
        break;
      case 'indent':
        newText = start === 0 ? `  ${selectedText}` : `\n  ${selectedText}`;
        break;
      default:
        break;
    }
    setDraftDesc(draftDesc.substring(0, start) + newText + draftDesc.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    }, 0);
  };

  const captureScreenImage = (pageContext: string) => {
    try {
      const iframe = iframeContainerRef.current?.querySelector('iframe');
      if (!iframe || !iframe.contentDocument) return;
      import('html2canvas').then(({ default: html2canvas }) => {
        const body = iframe.contentDocument!.body;
        const htmlEl = iframe.contentDocument!.documentElement;
        const iframeW = Math.max(body.scrollWidth, body.offsetWidth, htmlEl.clientWidth, htmlEl.scrollWidth, htmlEl.offsetWidth);
        const iframeH = Math.max(body.scrollHeight, body.offsetHeight, htmlEl.clientHeight, htmlEl.scrollHeight, htmlEl.offsetHeight);
        html2canvas(body, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f8fafc',
          width: iframeW,
          height: iframeH,
          windowWidth: iframeW,
          windowHeight: iframeH,
          logging: false,
          scale: 1,
        }).then((canvas) => {
          let destCanvas = canvas;
          if (canvas.width > 1200) {
            destCanvas = document.createElement('canvas');
            const ratio = canvas.height / canvas.width;
            destCanvas.width = 1200;
            destCanvas.height = 1200 * ratio;
            destCanvas.getContext('2d')?.drawImage(canvas, 0, 0, destCanvas.width, destCanvas.height);
          }
          const imgData = destCanvas.toDataURL('image/jpeg', 0.7);
          const imageDocId = `${screenId}_${hashCode(pageContext)}`;
          setDoc(docRef('screen_images', imageDocId), {
            data: imgData,
            width: destCanvas.width,
            height: destCanvas.height,
            updatedAt: nowMs(),
          }).catch((err) => console.warn('Image save error', err));
        });
      });
    } catch {
      /* noop */
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (mode !== 'annotate' || !isEditor) return;
    const iframeRect = e.currentTarget.getBoundingClientRect();
    const iframeX = e.clientX - iframeRect.left;
    const iframeY = e.clientY - iframeRect.top;

    let autoName = '';
    let targetSelector = '';
    let pageContext = '';
    let offsetX = 0;
    let offsetY = 0;
    let fullX = iframeX;
    let fullY = iframeY;

    try {
      const iframe = iframeContainerRef.current?.querySelector('iframe');
      if (iframe && iframe.contentDocument && iframe.contentWindow) {
        pageContext = getPageContext(iframe.contentDocument);
        const clickedEl = iframe.contentDocument.elementFromPoint(iframeX, iframeY) as HTMLElement | null;
        fullX = iframeX + iframe.contentWindow.scrollX;
        fullY = iframeY + iframe.contentWindow.scrollY;

        if (clickedEl && clickedEl.tagName !== 'HTML' && clickedEl.tagName !== 'BODY') {
          const targetEl = (clickedEl.closest('button, a, input, select, textarea, img') as HTMLElement | null) || clickedEl;
          targetSelector = getCssSelector(targetEl);
          const targetRect = targetEl.getBoundingClientRect();
          offsetX = iframeX - targetRect.left;
          offsetY = iframeY - targetRect.top;

          const tagName = targetEl.tagName.toLowerCase();
          const el = targetEl as HTMLImageElement & HTMLInputElement;
          const extractedText =
            targetEl.getAttribute('aria-label') || el.alt || el.placeholder || targetEl.innerText || targetEl.textContent || '';
          const textContent = extractedText.trim().replace(/\s+/g, ' ').substring(0, 20);

          if (tagName === 'button') autoName = textContent ? `${textContent} 버튼` : '버튼 요소';
          else if (tagName === 'a') autoName = textContent ? `${textContent} 링크` : '링크 요소';
          else if (tagName === 'input') autoName = textContent ? `${textContent} 입력창` : '입력창 요소';
          else if (tagName === 'img') autoName = textContent ? `${textContent} 이미지` : '이미지 요소';
          else autoName = textContent ? `${textContent} 영역` : 'UI 요소';
        }
      }
    } catch {
      /* noop */
    }

    captureScreenImage(pageContext);

    setDraftPosition({ x: iframeX, y: iframeY, absoluteX: fullX, absoluteY: fullY, targetSelector, offsetX, offsetY, pageContext });
    setDraftVersion('1.0');
    setDraftTitle(autoName);
    setDraftDesc('[기능 정의]\n\n[동작]\n\n[정책]\n\n[예외 사항]');
    setActiveRightTab('edit');
    setEditingAnnotationId(null);
    setShowDraftForm(true);
    setActiveAnnotationId(null);
    setReplyingToCommentId(null);
  };

  const handleEditClick = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation();
    setDraftTitle(ann.title);
    setDraftDesc(ann.description);

    const currentV = ann.version || '1.0';
    let nextV = currentV;
    if (!isNaN(parseFloat(currentV))) nextV = (parseFloat(currentV) + 0.1).toFixed(1);
    setDraftVersion(nextV);

    const tracked = trackedAnnotations.find((t) => t.id === ann.id);
    setDraftPosition({
      x: tracked?.currentX ?? ann.x,
      y: tracked?.currentY ?? ann.y,
      absoluteX: ann.absoluteX ?? ann.x,
      absoluteY: ann.absoluteY ?? ann.y,
      targetSelector: ann.targetSelector || '',
      offsetX: ann.offsetX ?? 0,
      offsetY: ann.offsetY ?? 0,
      pageContext: ann.pageContext || '',
    });

    setActiveRightTab('edit');
    setEditingAnnotationId(ann.id);
    setShowDraftForm(true);
    setActiveAnnotationId(ann.id);
  };

  const saveAnnotation = async () => {
    if (!draftTitle.trim()) return;
    let updatedAnnotations: Annotation[];
    let activeId: string;

    const historyEntry: AnnotationHistory = {
      version: draftVersion,
      title: draftTitle,
      description: draftDesc,
      updatedAt: nowMs(),
    };

    if (editingAnnotationId) {
      updatedAnnotations = annotations.map((a) => {
        if (a.id === editingAnnotationId) {
          const prevHistory =
            a.history || [{ version: a.version || '1.0', title: a.title, description: a.description, updatedAt: a.createdAt }];
          return {
            ...a,
            title: draftTitle,
            description: draftDesc,
            version: draftVersion,
            history: [...prevHistory, historyEntry],
            absoluteX: draftPosition.absoluteX,
            absoluteY: draftPosition.absoluteY,
          };
        }
        return a;
      });
      activeId = editingAnnotationId;
    } else {
      const newAnnotation: Annotation = {
        id: generateId(),
        x: draftPosition.x,
        y: draftPosition.y,
        absoluteX: draftPosition.absoluteX,
        absoluteY: draftPosition.absoluteY,
        targetSelector: draftPosition.targetSelector,
        offsetX: draftPosition.offsetX,
        offsetY: draftPosition.offsetY,
        pageContext: draftPosition.pageContext,
        title: draftTitle,
        description: draftDesc,
        version: draftVersion,
        history: [historyEntry],
        comments: [],
        number: annotations.length + 1,
        createdAt: nowMs(),
      };
      updatedAnnotations = [...annotations, newAnnotation];
      activeId = newAnnotation.id;
    }
    try {
      await setDoc(docRef('screens', screen.id), { ...screen, annotations: updatedAnnotations });
      setShowDraftForm(false);
      setEditingAnnotationId(null);
      setActiveAnnotationId(activeId);
      showToast(editingAnnotationId ? '정책 버전이 업데이트되었습니다.' : '새로운 정책이 저장되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (annId: string, text: string, parentCommentId: string | null = null) => {
    // 작성자명: Google displayName 우선, 없으면(익명) 저장된 닉네임, 둘 다 없으면 ProfileModal
    const authorName = user?.displayName || localStorage.getItem('axure_username');
    if (!authorName) {
      setProfileState({ isOpen: true, pendingAction: () => handleCommentSubmit(annId, text, parentCommentId) });
      return;
    }
    if (!user?.uid) return;

    const mentions = parseMentions(text, globalMembers);

    try {
      // 신규 댓글은 comments 컬렉션에 저장 (screens 문서 update 없음 → viewer 작성 가능)
      await createComment({
        projectId: project.id,
        screenId: screen.id,
        annotationId: annId,
        parentCommentId,
        body: text,
        author: { uid: user.uid, email: user.email, displayName: authorName, photoURL: user.photoURL },
        mentions,
        source: 'annotation',
      });
      setReplyingToCommentId(null);

      if (mentions.length > 0) {
        // 앱 내부 멘션 알림 (mockEmails). 6단계에서 notifications/이메일 발송으로 확장 예정.
        const baseUrl = window.location.origin + window.location.pathname;
        const linkUrl = `${baseUrl}#screen_${screen.id}_ann_${annId}`;
        const targetAnn = annotations.find((a) => a.id === annId);
        const receivers = mentions.map((m) => m.name).filter(Boolean) as string[];
        await addDoc(col('mockEmails'), {
          author: authorName,
          receivers,
          screenName: screen.name,
          projectName: project.name,
          uiTitle: targetAnn ? targetAnn.title : '알 수 없음',
          text,
          isReply: !!parentCommentId,
          linkUrl,
          createdAt: nowMs(),
          isRead: false,
        });
        showToast(`[알림 발송] ${receivers.join(', ')}님에게 멘션 알림이 전송되었습니다.`);
      }
    } catch (err) {
      console.error(err);
      showToast('댓글 저장에 실패했습니다.', 'error');
    }
  };

  const executeClearAllHistory = async () => {
    try {
      const batch = writeBatch(db);
      const allProjectScreens = screens.filter((s) => s.projectId === project.id);
      allProjectScreens.forEach((s) => batch.update(docRef('screens', s.id), { annotations: [] }));
      await batch.commit();
      setShowHistory(false);
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      showToast('모든 히스토리가 초기화되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteHistoryItem = async (targetScreenId: string, targetAnnId: string) => {
    const targetScreen = screens.find((s) => s.id === targetScreenId);
    if (!targetScreen) return;
    const updated = (targetScreen.annotations || []).filter((a) => a.id !== targetAnnId);
    updated.forEach((a, i) => (a.number = i + 1));
    await setDoc(docRef('screens', targetScreenId), { ...targetScreen, annotations: updated });
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    showToast('해당 정책이 삭제되었습니다.');
  };

  const executeDeleteAnnotation = async (idToDelete: string) => {
    const updatedAnnotations = annotations.filter((a) => a.id !== idToDelete);
    updatedAnnotations.forEach((a, i) => (a.number = i + 1));
    try {
      await setDoc(docRef('screens', screen.id), { ...screen, annotations: updatedAnnotations });
      if (activeAnnotationId === idToDelete) setActiveAnnotationId(null);
      if (editingAnnotationId === idToDelete) {
        setShowDraftForm(false);
        setEditingAnnotationId(null);
      }
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      showToast('정책이 삭제되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const iframeEl = () => iframeContainerRef.current?.querySelector('iframe') ?? null;

  const visibleAnnotations = trackedAnnotations
    .filter((a) => a.isVisible)
    .sort((a, b) => (a.absoluteY ?? a.y) - (b.absoluteY ?? b.y));

  const renderedHtml = generateHtmlBoilerplate(screen.code || '');

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col relative bg-[var(--surface-page)] overflow-hidden">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.msg}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
      <ProfileModal
        isOpen={profileState.isOpen}
        members={globalMembers}
        onConfirm={(name) => {
          localStorage.setItem('axure_username', name.trim());
          setProfileState({ ...profileState, isOpen: false });
          profileState.pendingAction?.();
        }}
        onCancel={() => setProfileState({ ...profileState, isOpen: false })}
      />
      <ExportDocModal
        isOpen={exportDocModalOpen}
        onClose={() => setExportDocModalOpen(false)}
        handleExportPPTX={() => exportScreenPptx(project, screen, annotations, iframeEl())}
        handleExportPDF={() => exportScreenPdf(project, screen, annotations)}
        handleExportMD={() => exportScreenMarkdown(project, screen, annotations)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 flex flex-col relative bg-[var(--surface-page)] transition-all duration-300 ${mode === 'annotate' ? 'mr-[420px]' : ''}`}>
          <div className="absolute top-4 left-6 z-20 flex items-center gap-3 bg-[var(--surface-card)] px-4 py-2.5 rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--border-default)]">
            <button
              onClick={() => navigate(`#project_${project.id}`)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-strong)] transition-colors"
              title="프로젝트로 돌아가기"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-px h-8 bg-[var(--border-default)]" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap">
                {project.name}
              </span>
              <span className="text-sm font-extrabold text-[var(--text-strong)] whitespace-nowrap">{screen.name}</span>
            </div>
            <span
              className={`ml-1 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-[var(--radius-pill)] whitespace-nowrap ${
                isEditor
                  ? 'bg-[var(--surface-active)] text-[var(--color-primary-text)]'
                  : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
              }`}
            >
              {isEditor ? '편집 가능' : <><Eye size={12} /> 보기 전용</>}
            </span>
          </div>
          <div className="absolute top-4 right-6 z-20 flex gap-2">
            <Button variant="outline" className="shadow-[var(--shadow-sm)]" icon={Download} onClick={() => setExportDocModalOpen(true)}>
              문서 다운로드
            </Button>
            <Button
              variant="outline"
              className="shadow-[var(--shadow-sm)]"
              icon={ExternalLink}
              onClick={() => setShareState({ isOpen: true, type: 'screen', id: screen.id })}
            >
              공유 및 초대
            </Button>
          </div>
          {mode === 'annotate' && (
            <div
              className={`absolute top-0 left-0 right-0 text-center py-2 text-sm z-30 font-bold shadow-md backdrop-blur ${
                isEditor ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--ink-soft)] text-[var(--text-on-ink)]'
              }`}
            >
              {isEditor
                ? '👆 기능을 정의할 UI 요소를 마우스로 클릭하세요'
                : '👁️ 보기 모드입니다. 등록된 아이콘을 클릭하여 정책을 확인하고 댓글을 달 수 있습니다.'}
            </div>
          )}

          <div ref={iframeContainerRef} className="relative w-full h-full overflow-auto bg-[var(--surface-sunken)] p-8 pt-24 pb-40 flex justify-center">
            <div className="relative shadow-[var(--shadow-xl)] border border-[var(--border-default)] bg-[var(--surface-card)] rounded-[var(--radius-lg)] mx-auto shrink-0" style={{ width: '100%', minWidth: '1280px', height: '850px' }}>
              <iframe srcDoc={renderedHtml} className="w-full h-full border-0 bg-transparent rounded-[var(--radius-lg)] pointer-events-auto" sandbox="allow-scripts allow-same-origin" />
              {mode === 'annotate' && (
                <div className={`absolute inset-0 z-10 rounded-[var(--radius-lg)] ${isEditor ? 'cursor-crosshair bg-[var(--brand-400)]/5' : 'cursor-default'}`} onClick={handleCanvasClick} />
              )}
              {mode === 'annotate' &&
                visibleAnnotations.map((ann, idx) => (
                  <div
                    key={ann.id}
                    className={`absolute z-20 flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all border-2 border-white ${
                      activeAnnotationId === ann.id
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] scale-125 z-30 ring-4 ring-[var(--color-focus-ring)]'
                        : 'bg-rose-500 text-white hover:bg-rose-600'
                    }`}
                    style={{ left: ann.currentX ?? ann.x, top: ann.currentY ?? ann.y }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAnnotationId(ann.id);
                      setMode('annotate');
                    }}
                  >
                    <span className="text-[14px] font-black">{idx + 1}</span>
                  </div>
                ))}
              {showDraftForm && mode === 'annotate' && isEditor && (
                <div
                  className="absolute z-30 flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] border-2 border-white shadow-lg text-[var(--color-on-primary)] font-bold transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
                  style={{ left: draftPosition.x, top: draftPosition.y }}
                >
                  <CheckSquare size={16} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div
          className={`absolute top-0 bottom-0 right-0 w-[420px] bg-[var(--surface-card)] border-l border-[var(--border-default)] shadow-[var(--shadow-2xl)] flex flex-col transition-transform duration-300 z-40 ${
            mode === 'annotate' ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-extrabold text-[var(--text-strong)] text-xl flex items-center gap-2">
                <FileText className="text-[var(--color-primary-text)]" /> 기능 정책 / 기획서 <span className="text-[var(--text-tertiary)] font-light">| Policy</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">화면에 정의된 모든 UI 정책과 스펙</p>
            </div>
            <button
              onClick={() => {
                setMode('interact');
                setShowDraftForm(false);
              }}
              className="p-2 bg-[var(--surface-sunken)] rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[var(--surface-page)]">
            {showDraftForm && isEditor && (
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex flex-col mb-6 overflow-hidden animate-in fade-in slide-in-from-right-4 z-10 relative">
                <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('edit')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${
                      activeRightTab === 'edit' ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--surface-card)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-body)]'
                    }`}
                  >
                    📝 정책 편집
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('history')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                      activeRightTab === 'history' ? 'border-[var(--color-primary)] text-[var(--color-primary-text)] bg-[var(--surface-card)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-body)]'
                    }`}
                  >
                    🕒 버전 히스토리{' '}
                    <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] px-1.5 py-0.5 rounded-full text-[10px]">
                      {editingAnnotationId ? annotations.find((a) => a.id === editingAnnotationId)?.history?.length || 1 : 0}
                    </span>
                  </button>
                </div>

                {activeRightTab === 'edit' ? (
                  <div className="p-5 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-primary-text)] mb-1.5">컴포넌트 명칭</label>
                      <input
                        type="text"
                        placeholder="요소 이름 (예: 로그인 버튼)"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full text-lg font-extrabold text-[var(--text-strong)] p-3 border border-[var(--border-default)] rounded-[var(--radius-md)] outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] bg-[var(--surface-sunken)] focus:bg-[var(--surface-card)] transition-colors"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-primary-text)] mb-1.5">상세 정책 및 인터랙션 디스크립션</label>
                      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)] overflow-hidden flex flex-col">
                        <div className="flex items-center gap-1 p-1.5 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                          <button type="button" onClick={() => insertFormatting('bold')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--color-primary-text)] hover:bg-[var(--surface-active)] rounded" title="굵게">
                            <Bold size={15} />
                          </button>
                          <button type="button" onClick={() => insertFormatting('code')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--color-primary-text)] hover:bg-[var(--surface-active)] rounded" title="인라인 코드">
                            <Code size={15} />
                          </button>
                          <div className="w-px h-4 bg-[var(--border-strong)] mx-1" />
                          <button type="button" onClick={() => insertFormatting('bullet')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--color-primary-text)] hover:bg-[var(--surface-active)] rounded" title="글머리 기호">
                            <List size={15} />
                          </button>
                          <button type="button" onClick={() => insertFormatting('indent')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--color-primary-text)] hover:bg-[var(--surface-active)] rounded" title="들여쓰기">
                            <Indent size={15} />
                          </button>
                          <div className="w-px h-4 bg-[var(--border-strong)] mx-1" />
                          <button type="button" onClick={() => insertFormatting('link')} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--color-primary-text)] hover:bg-[var(--surface-active)] rounded" title="링크 추가">
                            <Link2 size={15} />
                          </button>
                        </div>
                        <textarea
                          ref={descRef}
                          placeholder="상세 정책을 입력하세요."
                          value={draftDesc}
                          onChange={(e) => setDraftDesc(e.target.value)}
                          className="w-full text-[13px] p-4 min-h-[200px] resize-y outline-none bg-transparent text-[var(--text-body)] leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-3 mt-2">
                      <div className="w-24 shrink-0">
                        <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">버전 지정</label>
                        <div className="flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2.5">
                          <span className="text-[var(--text-tertiary)] font-bold mr-1 text-sm">v</span>
                          <input
                            type="text"
                            value={draftVersion}
                            onChange={(e) => setDraftVersion(e.target.value)}
                            className="w-full bg-transparent outline-none text-sm font-bold text-[var(--text-body)]"
                          />
                        </div>
                      </div>
                      <Button onClick={saveAnnotation} className="flex-1 py-2.5 h-[42px] shadow-[var(--shadow-sm)]">
                        <Save size={16} /> 정책 저장 및 공유
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowDraftForm(false);
                          setEditingAnnotationId(null);
                        }}
                        className="px-4 h-[42px]"
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex flex-col gap-4 max-h-[450px] overflow-y-auto bg-[var(--surface-sunken)]">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-2">업데이트 내역</h3>
                    {editingAnnotationId && (annotations.find((a) => a.id === editingAnnotationId)?.history?.length ?? 0) > 0 ? (
                      [...(annotations.find((a) => a.id === editingAnnotationId)?.history ?? [])]
                        .sort((a, b) => getTime(b.updatedAt) - getTime(a.updatedAt))
                        .map((h, i) => (
                          <div key={i} className="border border-[var(--border-default)] rounded-[var(--radius-lg)] p-5 bg-[var(--surface-card)] shadow-[var(--shadow-xs)]">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--border-subtle)]">
                              <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] font-bold text-xs px-3 py-1 rounded-[var(--radius-md)]">v{h.version}</span>
                              <span className="text-xs text-[var(--text-tertiary)] font-medium flex items-center gap-1">
                                <History size={12} /> {formatDateTime(h.updatedAt)}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-[15px] text-[var(--text-strong)] mb-3">{h.title}</h4>
                            <div className="text-[13px] text-[var(--text-body)] leading-relaxed bg-[var(--surface-sunken)] p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)]" dangerouslySetInnerHTML={{ __html: renderMarkdown(h.description) }} />
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-10 text-sm text-[var(--text-tertiary)]">히스토리 내역이 없습니다.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showDraftForm && visibleAnnotations.length === 0 && (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-full flex items-center justify-center mb-4">
                  <MessageSquarePlus size={28} className="text-[var(--text-tertiary)]" />
                </div>
                <p className="text-sm font-bold text-[var(--text-secondary)]">정의된 기능이 없습니다</p>
                <p className="text-xs mt-2 text-[var(--text-tertiary)]">{isEditor ? '좌측 화면 요소를 클릭하여 정책을 추가하세요.' : '아직 작성된 정책이 없습니다.'}</p>
              </div>
            )}

            {visibleAnnotations.map((ann, idx) => (
              <div key={ann.id} className="relative transition-all">
                <div
                  onClick={() => {
                    if (!showDraftForm) setActiveAnnotationId(ann.id);
                  }}
                  className={`relative p-5 rounded-[var(--radius-lg)] border-2 bg-[var(--surface-card)] overflow-hidden group transition-all ${
                    activeAnnotationId === ann.id && !showDraftForm
                      ? 'border-[var(--color-primary)] shadow-[var(--shadow-md)] ring-4 ring-[var(--surface-active)]'
                      : 'border-[var(--border-subtle)] shadow-[var(--shadow-xs)] cursor-pointer hover:border-[var(--brand-300)]'
                  }`}
                >
                  <div
                    className={`absolute -left-3.5 top-5 w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center text-[13px] font-extrabold border-2 border-[var(--surface-card)] shadow-md transition-colors ${
                      activeAnnotationId === ann.id && !showDraftForm ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex justify-between items-start ml-2 mb-3 pr-12">
                    <div className="flex items-center gap-2">
                      <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] font-bold text-[10px] px-2 py-0.5 rounded-full">v{ann.version || '1.0'}</span>
                      <h3 className="font-extrabold text-[var(--text-strong)] text-[15px]">{ann.title}</h3>
                    </div>
                    {isEditor && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEditClick(e, ann)} className="text-[var(--text-tertiary)] hover:text-[var(--color-primary-text)] p-1.5 bg-[var(--surface-card)] rounded shadow-[var(--shadow-xs)] border border-[var(--border-subtle)]" title="수정">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmState({ isOpen: true, title: '정책 삭제', msg: '이 기획 내용을 삭제하시겠습니까?', action: () => executeDeleteAnnotation(ann.id) });
                          }}
                          className="text-[var(--text-tertiary)] hover:text-[var(--red-600)] p-1.5 bg-[var(--surface-card)] rounded shadow-[var(--shadow-xs)] border border-[var(--border-subtle)]"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className="ml-2 text-[13px] text-[var(--text-body)] whitespace-pre-wrap leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.description) || '<span class="text-gray-400 italic font-normal">상세 설명 없음</span>' }}
                  />
                </div>

                {activeAnnotationId === ann.id && !showDraftForm && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-[var(--border-default)] space-y-4 py-3 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
                      <MessageCircle size={14} /> 댓글 및 논의
                    </h4>

                    {(commentsByAnnotation[ann.id] || []).length === 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] py-1">아직 댓글이 없습니다. 첫 번째 의견을 남겨보세요.</p>
                    )}

                    {(commentsByAnnotation[ann.id] || []).map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        <div className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] text-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-[var(--text-strong)]">{comment.author}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">{formatDateTime(comment.createdAt)}</span>
                          </div>
                          <div className="text-[var(--text-body)] font-medium leading-relaxed text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.text) }} />
                          <div className="mt-3 flex">
                            <button
                              onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                              className="text-xs text-[var(--color-primary-text)] font-bold hover:bg-[var(--brand-100)] transition-colors bg-[var(--surface-active)] px-2 py-1 rounded-[var(--radius-sm)]"
                            >
                              {replyingToCommentId === comment.id ? '답글 닫기' : '↳ 답글 달기'}
                            </button>
                          </div>
                        </div>

                        {(comment.replies || []).map((reply) => (
                          <div key={reply.id} className="ml-6 bg-[var(--surface-sunken)] p-3.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] text-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-[var(--text-strong)] flex items-center gap-1.5">
                                <ArrowLeft size={12} className="rotate-[225deg] text-[var(--text-tertiary)]" />
                                {reply.author}
                              </span>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{formatDateTime(reply.createdAt)}</span>
                            </div>
                            <div className="text-[var(--text-body)] font-medium leading-relaxed text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.text) }} />
                          </div>
                        ))}

                        {replyingToCommentId === comment.id && (
                          <div className="ml-6">
                            <CommentInputBox onSubmit={(text) => handleCommentSubmit(ann.id, text, comment.id)} members={globalMembers} placeholder="답글을 입력하세요 ( @멘션 가능 )" />
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="pt-3">
                      <CommentInputBox onSubmit={(text) => handleCommentSubmit(ann.id, text)} members={globalMembers} placeholder="이 정책에 대한 새로운 댓글을 남겨주세요." />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 플로팅 툴바 */}
      <div
        className="fixed z-50 transition-shadow duration-300 hover:shadow-xl w-max"
        style={{
          bottom: '40px',
          left: '50%',
          transform: `translate(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px)`,
          marginLeft: mode === 'annotate' ? '-210px' : '0',
          transitionProperty: isDragging ? 'none' : 'margin-left',
        }}
      >
        <div className="bg-[var(--surface-card)] rounded-full shadow-[var(--shadow-xl)] border border-[var(--border-default)] p-2 pl-3 flex items-center gap-2 flex-nowrap w-max max-w-none">
          <div
            className="cursor-grab active:cursor-grabbing p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-md)] flex items-center justify-center whitespace-nowrap"
            onMouseDown={handleDragStart}
            title="드래그하여 툴바 이동"
          >
            <GripVertical size={20} />
          </div>
          <div className="w-px h-6 bg-[var(--border-default)] mx-1" />
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--green-50)] rounded-full mr-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-[var(--green-500)] rounded-full shrink-0 animate-pulse" />
            <span className="text-sm font-bold text-[var(--green-700)] tracking-tight whitespace-nowrap">실시간 공유 켜짐</span>
          </div>
          <div className="w-px h-8 bg-[var(--border-default)] mx-2" />
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-active)] text-[var(--color-primary-text)] rounded-full hover:bg-[var(--brand-100)] transition-colors mr-2 group whitespace-nowrap"
          >
            <History size={18} className="group-hover:-rotate-45 transition-transform shrink-0" />
            <span className="text-sm font-extrabold tracking-tight whitespace-nowrap">전체 히스토리</span>
          </button>
          <div className="flex items-center gap-4 px-4 py-1.5 whitespace-nowrap">
            <span className={`text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${mode === 'interact' ? 'text-[var(--text-strong)]' : 'text-[var(--text-tertiary)]'}`}>프로토타입</span>
            <button
              onClick={() => {
                setMode(mode === 'interact' ? 'annotate' : 'interact');
                setShowDraftForm(false);
                setEditingAnnotationId(null);
                setReplyingToCommentId(null);
              }}
              className={`w-[60px] h-[32px] rounded-full relative transition-colors duration-300 ease-in-out shadow-inner shrink-0 ${
                mode === 'annotate' ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-[var(--surface-card)] rounded-full transition-transform duration-300 ease-in-out shadow-md ${
                  mode === 'annotate' ? 'translate-x-[32px]' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${mode === 'annotate' ? 'text-[var(--color-primary-text)]' : 'text-[var(--text-tertiary)]'}`}>기획/문서 모드</span>
          </div>
        </div>
      </div>

      {/* 전체 히스토리 대시보드 */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-[var(--surface-page)] flex flex-col animate-in slide-in-from-bottom-4">
          <div className="bg-[var(--surface-card)] px-8 py-5 flex items-center justify-between border-b border-[var(--border-default)] shadow-[var(--shadow-sm)] shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-primary)] rounded-[var(--radius-lg)] flex items-center justify-center text-[var(--color-on-primary)] shadow-[var(--shadow-brand)]">
                <History size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[var(--text-strong)] tracking-tight">전체 버전 히스토리 대시보드</h1>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">프로젝트 내 모든 기획 및 정책의 버전 업데이트 이력을 최신순으로 확인하세요.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditor && (
                <button
                  onClick={() => setConfirmState({ isOpen: true, title: '전체 히스토리 초기화', msg: '프로젝트 내 모든 기획/정책 이력을 삭제합니다. 복구할 수 없습니다. 진행하시겠습니까?', action: executeClearAllHistory })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[var(--red-600)] font-bold hover:bg-[var(--red-50)] transition-colors border border-transparent hover:border-[var(--red-100)] whitespace-nowrap"
                >
                  <AlertCircle size={18} /> 전체 초기화
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-body)] font-bold hover:bg-[var(--border-default)] transition-colors whitespace-nowrap">
                <X size={18} /> 대시보드 닫기
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 bg-[var(--surface-page)]">
            <div className="max-w-7xl mx-auto w-full">
              {sortedVersions.length === 0 ? (
                <div className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xs)] border border-[var(--border-default)] p-16 text-center text-[var(--text-tertiary)] font-medium">히스토리 내역이 없습니다.</div>
              ) : (
                sortedVersions.map((version) => (
                  <div key={version} className="bg-[var(--surface-card)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xs)] border border-[var(--border-default)] overflow-hidden mb-8">
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary-text)] flex items-center justify-center font-extrabold text-sm">v</span>
                        <h2 className="text-xl font-extrabold text-[var(--color-primary-text)]">버전 {version}</h2>
                      </div>
                      <div className="px-4 py-1.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-full text-sm font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] whitespace-nowrap">
                        {groupedHistorySorted[version].length}개의 업데이트 내역
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6 px-8 py-4 border-b border-[var(--border-subtle)] text-xs font-bold text-[var(--text-secondary)] tracking-wider bg-[var(--surface-card)]">
                      <div className="col-span-2">업데이트 일시</div>
                      <div className="col-span-3">화면 / 컴포넌트명</div>
                      <div className="col-span-6">정책 상세 내용 미리보기</div>
                      <div className="col-span-1 text-center">관리</div>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-card)]">
                      {groupedHistorySorted[version].map((h, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-6 px-8 py-5 hover:bg-[var(--surface-hover)] transition-colors items-start">
                          <div className="col-span-2 text-[13px] font-bold text-[var(--text-secondary)] font-mono mt-1">{formatDateTime(h.createdAt)}</div>
                          <div className="col-span-3 pr-4">
                            <div className="text-[11px] font-extrabold text-[var(--color-primary-text)] uppercase tracking-widest mb-1.5 truncate">{h.screenName}</div>
                            <div className="text-[15px] font-extrabold text-[var(--text-strong)] leading-tight">{h.title}</div>
                          </div>
                          <div className="col-span-6 pr-4">
                            <div className="text-[13px] font-medium text-[var(--text-body)] leading-relaxed bg-[var(--surface-sunken)] border border-[var(--border-subtle)] p-3 rounded-[var(--radius-md)] max-h-[100px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(h.description) || '-' }} />
                          </div>
                          <div className="col-span-1 flex flex-col items-center justify-center pt-1 gap-2">
                            <button
                              onClick={() => {
                                setShowHistory(false);
                                navigate(`#ws_${workspaceId}_screen_${h.screenId}_ann_${h.annId}`);
                              }}
                              className="flex items-center justify-center gap-1.5 w-[68px] py-1.5 border border-[var(--border-default)] rounded-full text-xs font-bold text-[var(--text-body)] hover:bg-[var(--surface-card)] hover:border-[var(--brand-300)] shadow-[var(--shadow-xs)] transition-all whitespace-nowrap bg-[var(--surface-card)]"
                              title="해당 정책으로 이동"
                            >
                              이동 <ExternalLink size={12} className="text-[var(--text-tertiary)]" />
                            </button>
                            {isEditor && (
                              <button
                                onClick={() => setConfirmState({ isOpen: true, title: '정책 삭제', msg: '해당 정책 전체가 삭제됩니다. 삭제하시겠습니까?', action: () => executeDeleteHistoryItem(h.screenId, h.annId) })}
                                className="w-[30px] h-[30px] flex items-center justify-center border border-[var(--border-default)] rounded-full text-[var(--text-tertiary)] hover:text-[var(--red-600)] hover:bg-[var(--red-50)] hover:border-[var(--red-100)] transition-all bg-[var(--surface-card)]"
                                title="삭제"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
