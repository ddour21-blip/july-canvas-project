import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  Folder, 
  Plus, 
  FileCode2, 
  ArrowLeft, 
  MessageSquarePlus, 
  Save, 
  Trash2, 
  Layout,
  ExternalLink,
  ChevronRight,
  History,
  AlertCircle,
  X,
  GripVertical,
  CheckCircle2,
  Bold,
  Code,
  List,
  Link2,
  Indent,
  Copy,
  CheckSquare,
  Edit2,
  Users,
  MessageCircle,
  Send,
  AtSign,
  BellRing,
  MailOpen,
  Database,
  Download,
  Upload,
  FileText,
  Share2,
  Globe
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCK4Hc8Bz5lhDTdKRCuAUbDwhUOMwO0bJ0",
  authDomain: "my-prototype-app-67dc5.firebaseapp.com",
  projectId: "my-prototype-app-67dc5",
  storageBucket: "my-prototype-app-67dc5.firebasestorage.app",
  messagingSenderId: "778244963354",
  appId: "1:778244963354:web:809e81e919fdb4d21525a3",
  measurementId: "G-4NT45V452W"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'prototype-manager-app'; // <-- 지워졌던 캔버스 데이터베이스 폴더명 복구 완료!

// --- Utils & Global Toast ---
const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getTime = (ts) => ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : (typeof ts === 'number' ? ts : 0));

const formatDateTime = (ts) => {
  if (!ts) return '방금 전';
  const d = new Date(getTime(ts));
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const showToast = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

const renderMarkdown = (text) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 text-[13px] font-mono border border-gray-200">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline hover:text-blue-700 font-bold">$1</a>')
    .replace(/@([^\s]+)/g, '<span class="text-blue-600 font-bold bg-blue-50 px-1 rounded">@$1</span>'); 
  return html;
};

// UI 스마트 추적용 헬퍼 함수
const getCssSelector = (el) => {
  if (!el) return '';
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName.toLowerCase() !== 'html' && el.tagName.toLowerCase() !== 'body') {
    let selector = el.tagName.toLowerCase();
    if (el.id) { selector += '#' + el.id; path.unshift(selector); break; } 
    else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) { if (sib.tagName.toLowerCase() === selector) nth++; }
      selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector); el = el.parentNode;
  }
  return path.join(" > ");
};

// 화면 컨텍스트 지문 추출
const getPageContext = (doc) => {
  try {
    return (doc.body.innerText || '').replace(/[\d\s\W_]/g, '').substring(0, 150);
  } catch (e) {
    return '';
  }
};

// --- Shared Components ---
const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled, type = 'button' }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />} {children}
    </button>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-full bg-red-100 text-red-600"><AlertCircle size={24} /></div><h3 className="text-xl font-bold text-gray-900">{title}</h3></div>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onCancel}>취소</Button><Button variant="danger" onClick={onConfirm}>확인</Button></div>
      </div>
    </div>
  );
};

const ProfileModal = ({ isOpen, onConfirm, onCancel, members = [] }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <h3 className="text-xl font-bold text-gray-900 mb-2">닉네임 설정</h3>
        <p className="text-sm text-gray-500 mb-4">댓글 작성자로 표시될 이름(닉네임)을 직접 입력하거나 아래 팀원 목록에서 선택해주세요.</p>
        
        {members && members.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 mb-2">등록된 팀원 선택</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 -ml-1">
              {members.map(m => (
                <button 
                  key={m.id} 
                  type="button"
                  onClick={() => setName(m.nickname)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-all border ${name === m.nickname ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  {m.nickname}
                </button>
              ))}
            </div>
          </div>
        )}

        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="직접 입력 (예: 김기획)" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-sm" autoFocus />
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onCancel}>취소</Button><Button onClick={() => onConfirm(name)} disabled={!name.trim()}>확인</Button></div>
      </div>
    </div>
  );
};

// 공유/초대 모달 (리다이렉트 없는 고유 링크 모달)
const ShareModal = ({ isOpen, type, id, onClose, workspaceId }) => {
  if (!isOpen) return null;
  const displayHash = `${type}_${id}`;
  const fullUrl = `${window.location.origin}${window.location.pathname}#ws_${workspaceId}_${type}_${id}`;

  const handleCopy = (text, msg) => {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(msg); } catch(e) { showToast('복 세 실패', 'error'); }
    document.body.removeChild(ta);
  };

  const handleCopyMessage = () => {
    const text = `🚀 July 캔버스 프로젝트\n\n🔑 접속 코드: ${displayHash}\n\n* 안내: July 캔버스 메인 화면의 '접속 코드' 입력란에 코드를 붙여넣고 [바로 입장]을 클릭해주세요. (Vercel 등에 배포된 상태라면 접속 링크: ${fullUrl} 를 통해 직접 접근할 수 있습니다)`;
    handleCopy(text, '접속 코드가 복사되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Share2 className="text-blue-600"/> 프로젝트 공유</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500"><X size={20}/></button>
        </div>
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 text-center">
            <label className="block text-sm font-bold text-blue-800 mb-3">고유 접속 코드</label>
            <div className="bg-white border border-blue-200 rounded-xl px-4 py-3 font-mono font-bold text-gray-800 text-lg shadow-inner select-all overflow-hidden text-ellipsis whitespace-nowrap mb-4">
              {displayHash}
            </div>
            <Button onClick={handleCopyMessage} className="w-full py-3.5 text-base font-bold shadow-md">
              접속 코드 복사하기
            </Button>
            <p className="text-[11px] text-blue-600 mt-4 font-medium leading-relaxed">
              💡 제미나이 캔버스 환경에서는 코드가 갱신될 때마다 URL 도메인이 변경됩니다. 안정적인 영구 링크를 원하신다면 대시보드의 <b>[내보내기]</b> 기능을 통해 Vercel 등에 배포하세요!
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-xs font-bold text-gray-500 text-center">
              💡 팀원 직접 입장 가이드
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="flex bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm h-[40px] w-full max-w-[300px] mb-4 pointer-events-none">
                <div className="px-4 py-2 text-sm font-medium text-gray-800 flex-1 text-left bg-blue-50/20 font-mono select-none truncate">
                  {displayHash}
                </div>
                <div className="bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600 border-l border-gray-300 select-none whitespace-nowrap">
                  바로 입장
                </div>
              </div>
              <p className="text-[13px] font-bold text-gray-700 leading-relaxed">
                공유 받은 접속 코드를 복사한 뒤<br/>
                메인화면에서 <span className="text-blue-600">바로 입장</span>을 클릭해주세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Vercel / GitHub 배포용 ZIP 다운로드 성공 모달
const ExportZipModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Globe className="text-gray-800"/> 외부 호스팅 배포 준비 완료!</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500"><X size={20}/></button>
        </div>
        <div className="space-y-5">
          <p className="text-gray-600 text-sm">Vite + React 기반의 표준 프로젝트 ZIP 파일이 다운로드 되었습니다. 아래 단계를 따라 호스팅을 완료하세요.</p>
          
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
              <div className="text-sm text-gray-700">다운로드된 <b>july-canvas-project.zip</b> 파일의 압축을 풀고, 터미널에서 <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">npm install</code> 을 실행합니다.</div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
              <div className="text-sm text-gray-700">제미나이 화면 우측 상단의 <b>[콘텐츠 복사]</b> 버튼을 눌러 전체 코드를 복사한 뒤, 프로젝트 폴더의 <code className="bg-gray-200 px-1 py-0.5 rounded text-blue-600 font-mono">src/App.jsx</code> 파일 내용을 전부 지우고 덮어씌웁니다.</div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
              <div className="text-sm text-gray-700">코드를 GitHub에 푸시(Push)하고, Vercel에서 레포지토리를 연결하여 배포합니다. Firebase 및 모든 기획 데이터가 즉시 연동됩니다!</div>
            </div>
          </div>
          
          <Button onClick={onClose} className="w-full py-3.5">확인했습니다</Button>
        </div>
      </div>
    </div>
  );
};

const VirtualInboxModal = ({ isOpen, onClose, emails, onOpenEmail }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[80vh] animate-in zoom-in-95">
         <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl shrink-0">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BellRing className="text-blue-600"/> 알림 <span className="text-sm font-medium text-gray-400 ml-2">(수신된 멘션 내역)</span></h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {emails.length === 0 ? (
              <div className="text-center text-gray-400 py-20 flex flex-col items-center">
                <MailOpen size={48} className="mb-4 opacity-50"/>
                <p className="font-bold text-gray-500">수신된 알림이 없습니다.</p>
                <p className="text-sm mt-1">다른 사용자가 댓글에서 멘션하면 이곳에 알림이 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map(email => (
                   <div key={email.id} onClick={() => onOpenEmail(email)} className={`p-5 bg-white border rounded-xl cursor-pointer transition-all group ${email.isRead ? 'border-gray-200 opacity-70' : 'border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400'}`}>
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${email.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>{email.author.charAt(0)}</span>
                           <span className={`font-bold ${email.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{email.author}님이 멘션했습니다.</span>
                           {!email.isRead && <span className="w-2 h-2 rounded-full bg-red-500 ml-1"></span>}
                         </div>
                         <span className="text-xs font-medium text-gray-400">{formatDateTime(email.createdAt)}</span>
                      </div>
                      <div className="pl-10 flex flex-col gap-1.5">
                        <div className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded w-max">프로젝트명: {email.projectName || '알 수 없음'}</div>
                        <div className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded w-max">UI: {email.uiTitle || '알 수 없음'}</div>
                        <div className="text-sm text-gray-700 line-clamp-2 mt-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(email.text) }} />
                      </div>
                   </div>
                ))}
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const EmailSimulationModal = ({ isOpen, onClose, data, navigate }) => {
  if (!isOpen || !data) return null;
  const handleOpenLink = () => {
    const hash = data.linkUrl.split('#')[1];
    if (hash) navigate('#' + hash);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[10000] bg-bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-gray-200">
        <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center text-xs font-bold text-gray-500">
          <span>새 멘션 알림</span>
          <button onClick={onClose} className="hover:text-gray-800"><X size={16}/></button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[22px] text-gray-900 tracking-tight leading-snug">
              <b>{data.author}</b>님이 다음 문서의 댓글에 {data.isReply ? '답글을' : '댓글을'} 남김
            </h2>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center px-4 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-sm font-bold text-gray-700 shadow-sm w-max">
              프로젝트명: {data.projectName || '알 수 없음'}
            </div>
            <div className="inline-flex items-center px-4 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-sm font-bold text-gray-700 shadow-sm w-max">
              UI: {data.uiTitle || '알 수 없음'}
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="text-[13px] font-bold text-gray-800 mb-3 flex items-center gap-2">
                {data.author} <span className="text-gray-400 font-normal">• {formatDateTime(data.createdAt)}</span>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">신규</span>
              </div>
              <div className="text-[15px] text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.text) }} />
            </div>
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end items-center">
              <div className="flex gap-6 text-sm font-bold text-blue-600">
                <button onClick={handleOpenLink} className="hover:underline">열기</button>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 font-medium pt-4 border-t border-gray-100">수신자: {data.receivers.join(', ')}</div>
        </div>
      </div>
    </div>
  );
};

const CommentInputBox = ({ onSubmit, members, placeholder = "댓글 추가..." }) => {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value; setText(val);
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) { setShowMentions(true); setMentionFilter(lastWord.slice(1).toLowerCase()); } 
    else { setShowMentions(false); }
  };

  const handleMentionClick = (nickname) => {
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPosition);
    const textAfterCursor = text.slice(cursorPosition);
    const words = textBeforeCursor.split(/\s/); words.pop(); 
    const newTextBefore = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${nickname} `;
    setText(newTextBefore + textAfterCursor); setShowMentions(false); inputRef.current.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); if (!text.trim()) return; onSubmit(text); setText(''); setShowMentions(false); };
  const filteredMembers = (members || []).filter(m => m.nickname.toLowerCase().includes(mentionFilter));

  return (
    <form onSubmit={handleSubmit} className="relative mt-3">
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-64 bg-white border border-gray-200 shadow-xl rounded-xl mb-2 max-h-48 overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500">팀원 멘션하기</div>
          {filteredMembers.map(m => (
            <div key={m.id} onClick={() => handleMentionClick(m.nickname)} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors border-b border-gray-50 last:border-0">
              <span className="text-sm font-bold text-gray-900">{m.nickname}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl pl-3 pr-1 py-1 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-sm">
        <AtSign size={16} className="text-gray-400 shrink-0" />
        <input ref={inputRef} type="text" value={text} onChange={handleChange} placeholder={placeholder} className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-gray-800" />
        <button type="submit" disabled={!text.trim()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors shrink-0"><Send size={14} /></button>
      </div>
    </form>
  );
};

// 최적화된 안전한 HTML 렌더링 엔진 (데스크탑 해상도 강제 지정으로 반응형 사이드바 등 유지)
const generateHtmlBoilerplate = (rawCode) => {
  if (rawCode.trim().toLowerCase().startsWith('<!doctype html') || rawCode.trim().toLowerCase().startsWith('<html')) return rawCode;
  
  const isReact = rawCode.includes('import React') || rawCode.includes('from \'react\'') || rawCode.includes('from "react"') || rawCode.includes('export default');
  
  if (isReact) {
    let safeCode = rawCode
      .replace(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/g, 'const __AppComp = function $1')
      .replace(/export\s+default\s+function\s*\(/g, 'const __AppComp = function(')
      .replace(/export\s+default\s+([a-zA-Z0-9_]+);?/g, 'const __AppComp = $1;')
      .split('<' + '/script>').join('<\\/script>');

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          html, body { width: 100%; height: 100vh; margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Pretendard', sans-serif; }
          #root { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        </style>
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
              "lucide-react": "https://esm.sh/lucide-react@0.292.0?deps=react@18.2.0",
              "recharts": "https://esm.sh/recharts@2.10.3?deps=react@18.2.0,react-dom@18.2.0"
            }
          }
        </script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/plain" id="user-code">${safeCode}</script>
        <script>
          function renderApp() {
            const codeRaw = document.getElementById('user-code').textContent;
            try {
              const transformed = Babel.transform(codeRaw, { presets: ['react'] }).code;
              
              const script = document.createElement('script');
              script.type = 'module';
              
              script.textContent = transformed + '\\n\\n' +
                'import { createRoot as __createRoot } from "react-dom/client";\\n' +
                'import * as __React from "react";\\n' +
                'setTimeout(() => {\\n' +
                '  const rootEl = document.getElementById("root");\\n' +
                '  let Comp = typeof __AppComp !== "undefined" ? __AppComp : (typeof App !== "undefined" ? App : (typeof Main !== "undefined" ? Main : null));\\n' +
                '  if (Comp) {\\n' +
                '    __createRoot(rootEl).render(__React.createElement(Comp));\\n' +
                '  } else {\\n' +
                '    rootEl.innerHTML = \\'<div style="padding: 20px; color: #991b1b; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; margin: 20px;"><b>렌더링 에러:</b><br/>App 컴포넌트를 찾을 수 없습니다. (export default 구문 포함 여부를 확인해주세요)</div>\\';\\n' +
                '  }\\n' +
                '}, 100);';

              document.body.appendChild(script);
            } catch (err) {
              const safeErr = err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #991b1b; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; margin: 20px;"><b>컴파일 에러:</b><br/>' + safeErr + '</div>';
              console.error(err);
            }
          }

          const checkBabel = setInterval(() => {
            if (typeof Babel !== 'undefined') {
              clearInterval(checkBabel);
              renderApp();
            }
          }, 50);
        </script>
      </body>
      </html>
    `;
  }
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Pretendard', sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }</style></head><body>${rawCode}</body></html>`;
};

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [screens, setScreens] = useState([]);
  const [globalMembers, setGlobalMembers] = useState([]);
  const [mockEmails, setMockEmails] = useState([]); 
  
  const [toast, setToast] = useState(null);
  const [shareState, setShareState] = useState({ isOpen: false, type: '', id: '' });
  const [backupState, setBackupState] = useState({ isOpen: false });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('#');

  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash.replace('#', '');
      setCurrentRoute('#' + hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handler = (e) => { setToast(e.detail); setTimeout(() => setToast(null), 4000); };
    window.addEventListener('show-toast', handler); return () => window.removeEventListener('show-toast', handler);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Init Error:", err); }
    };
    initAuth(); 
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  const navigate = (hash) => { window.location.hash = hash; };

  useEffect(() => {
    if (!user) return;
    // 무조건 안전한 appId (Firebase Rule 호환)를 기반으로 데이터 구독
    const unsubProjects = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)); setProjects(data);
    }, (err) => console.error("Firestore Error:", err));
    const unsubScreens = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'screens'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt)); setScreens(data);
    }, (err) => console.error("Firestore Error:", err));
    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)); setGlobalMembers(data);
    }, (err) => console.error("Firestore Error:", err));
    const unsubEmails = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mockEmails'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt)); setMockEmails(data);
    }, (err) => console.error("Firestore Error:", err));
    
    return () => { unsubProjects(); unsubScreens(); unsubMembers(); unsubEmails(); };
  }, [user]);

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const unreadCount = mockEmails.filter(e => !e.isRead).length;

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  const routeParts = currentRoute.replace('#', '').split('_');
  
  let activeWorkspaceId = appId;
  let viewType = 'dashboard';
  let viewId = null;
  let extraParam = null;

  if (routeParts[0] === 'ws') {
    activeWorkspaceId = routeParts[1];
    viewType = routeParts[2] || 'dashboard';
    viewId = routeParts[3];
    extraParam = routeParts[4] === 'ann' ? routeParts[5] : null;
  } else {
    viewType = routeParts[0] || 'dashboard';
    viewId = routeParts[1];
    extraParam = routeParts[2] === 'ann' ? routeParts[3] : null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg bg-gray-800 text-white animate-in slide-in-from-top-4 fade-in font-medium whitespace-nowrap">
          {toast.type === 'success' ? <CheckCircle2 size={18} className="text-green-400"/> : <AlertCircle size={18} className="text-red-400"/>}
          {toast.message}
        </div>
      )}
      <ShareModal isOpen={shareState.isOpen} type={shareState.type} id={shareState.id} onClose={() => setShareState({ ...shareState, isOpen: false })} workspaceId={activeWorkspaceId} />
      <ExportZipModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />
      
      <VirtualInboxModal 
        isOpen={isInboxOpen} 
        onClose={() => setIsInboxOpen(false)} 
        emails={mockEmails} 
        onOpenEmail={async (email) => { 
          setSelectedEmail(email); 
          setIsInboxOpen(false); 
          if (!email.isRead) {
             try {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'mockEmails', email.id), { isRead: true });
             } catch(e) { console.error(e); }
          }
        }} 
      />
      <EmailSimulationModal isOpen={!!selectedEmail} data={selectedEmail} onClose={() => setSelectedEmail(null)} navigate={navigate} />

      {backupState.isOpen && (
         <div className="fixed inset-0 z-[9999] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Database className="text-blue-600"/> 데이터 백업 및 복원</h2>
               <button onClick={() => setBackupState({isOpen: false})} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500"><X size={20}/></button>
             </div>
             
             <div className="space-y-4">
               <div className="p-5 border border-gray-200 rounded-2xl bg-gray-50">
                  <h3 className="font-bold text-gray-800 mb-2">현재 작업 파일로 내보내기</h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">프로젝트, 화면, 작성된 모든 기획서를 JSON 파일 형태로 다운로드하여 영구 보관합니다. 캔버스가 새로고침되어도 데이터를 복구할 수 있습니다.</p>
                  <Button icon={Download} className="w-full" onClick={() => {
                     const exportData = { projects, screens, members: globalMembers, emails: mockEmails, timestamp: Date.now() };
                     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                     const a = document.createElement('a');
                     a.href = URL.createObjectURL(blob);
                     a.download = `july_canvas_backup_${formatDateTime(Date.now()).replace(/[:.\s]/g, '')}.json`;
                     a.click();
                     showToast('백업 파일이 다운로드 되었습니다.');
                  }}>백업 파일 다운로드</Button>
               </div>
               
               <div className="p-5 border border-blue-100 rounded-2xl bg-blue-50/30">
                  <h3 className="font-bold text-gray-800 mb-2">백업 파일 불러오기</h3>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">이전에 다운로드한 JSON 백업 파일을 업로드하여 현재 화면에 데이터를 복원합니다.</p>
                  <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 cursor-pointer w-full">
                     <Upload size={18}/> 백업 파일 업로드
                     <input type="file" accept=".json" className="hidden" onChange={(e) => {
                        const file = e.target.files[0];
                        if(!file) return;
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                           try {
                              const data = JSON.parse(event.target.result);
                              if(!data.projects || !data.screens) throw new Error('Invalid');
                              const batch = writeBatch(db);
                              data.projects.forEach(p => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'projects', p.id), p));
                              data.screens.forEach(s => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'screens', s.id), s));
                              data.members?.forEach(m => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'members', m.id), m));
                              await batch.commit();
                              setBackupState({isOpen: false});
                              showToast('데이터 복원이 성공적으로 완료되었습니다.');
                           } catch(err) { showToast('파일 형식이 잘못되었습니다.', 'error'); }
                        };
                        reader.readAsText(file);
                     }} />
                  </label>
               </div>
             </div>
           </div>
         </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 cursor-pointer" onClick={() => navigate('#')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Layout size={18} /></div>
          <span>July 캔버스</span>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-4 font-medium">
          <button onClick={() => setIsInboxOpen(true)} className="relative flex items-center gap-1.5 hover:bg-gray-200 transition-colors bg-gray-100 px-3 py-1.5 rounded-full text-gray-700">
             <BellRing size={16} className="text-blue-600" /> 알림
             {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span> 실시간 동기화 중</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px]">
        {viewType === 'dashboard' && <Dashboard projects={projects} screens={screens} navigate={navigate} user={user} globalMembers={globalMembers} setBackupState={setBackupState} setExportModalOpen={setExportModalOpen} db={db} />}
        {viewType === 'project' && <ProjectDetail projectId={viewId} projects={projects} screens={screens} navigate={navigate} setShareState={setShareState} user={user} db={db} />}
        {viewType === 'screen' && <ScreenEditor screenId={viewId} extraParam={extraParam} projects={projects} screens={screens} navigate={navigate} setShareState={setShareState} user={user} globalMembers={globalMembers} db={db} />}
      </main>
    </div>
  );
}

// --- View 1: Dashboard ---
function Dashboard({ projects, screens, navigate, user, globalMembers, setBackupState, setExportModalOpen, db }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false); 
  const [newProjectName, setNewProjectName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  
  const [newMemberName, setNewMemberName] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', msg: '', action: null });

  const isGlobalEditor = projects.length === 0 || projects.some(p => !p.ownerId || p.ownerId === user?.uid);
  const myProjects = projects.filter(p => !p.ownerId || p.ownerId === user?.uid);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), { 
        name: newProjectName, ownerId: user?.uid || null, createdAt: serverTimestamp() 
      });
      setIsModalOpen(false); setNewProjectName(''); navigate(`#project_${docRef.id}`);
    } catch (err) { console.error(err); }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    let code = accessCode.trim().replace(/^#/, ''); 
    navigate(`#${code}`);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), {
        nickname: newMemberName.trim(), createdAt: serverTimestamp()
      });
      setNewMemberName('');
      showToast('팀원이 추가되었습니다. 이제 모든 프로젝트에서 멘션할 수 있습니다.');
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (memberId) => {
    setConfirmState({
      isOpen: true, title: '팀원 삭제', msg: '이 팀원을 삭제하시겠습니까?',
      action: async () => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', memberId));
        setConfirmState(prev => ({...prev, isOpen: false})); showToast('팀원이 삭제되었습니다.');
      }
    });
  };

  const handleDeleteProjectClick = (e, project) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: '프로젝트 삭제',
      msg: `'${project.name}' 프로젝트와 하위 화면이 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`,
      action: async () => {
        const projectScreens = screens.filter(s => s.projectId === project.id);
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', project.id));
        if (projectScreens.length > 0) {
           const batch = writeBatch(db);
           projectScreens.forEach(s => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'screens', s.id)));
           await batch.commit();
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        showToast('프로젝트가 삭제되었습니다.');
      }
    });
  };

  return (
    <div className="p-10">
      <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.msg} onConfirm={confirmState.action} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">내 프로젝트</h1>
          <p className="text-gray-500 mt-2">프로토타입과 기획서를 관리할 프로젝트를 선택하거나 접속 코드로 입장하세요.</p>
        </div>
        <div className="flex gap-4 items-center">
          <form onSubmit={handleJoinByCode} className="flex bg-white border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-sm h-[44px] transition-shadow">
            <input type="text" value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="접속 코드 (예: project_123)" className="px-4 py-2 outline-none w-56 text-sm font-medium text-gray-800" />
            <button type="submit" className="bg-gray-50 hover:bg-blue-50 hover:text-blue-600 px-5 py-2 text-sm font-bold text-gray-600 border-l border-gray-300 transition-colors">바로 입장</button>
          </form>
          {isGlobalEditor && (
            <>
              <Button variant="outline" icon={Download} onClick={() => setExportModalOpen(true)} className="h-[44px] px-5 shadow-sm text-gray-700 bg-white border-gray-300 hover:bg-gray-50">
                내보내기 (ZIP)
              </Button>
              <Button variant="secondary" icon={Database} onClick={() => setBackupState({isOpen: true})} className="h-[44px] px-5 shadow-sm">
                데이터 백업/복원
              </Button>
              <Button variant="secondary" icon={Users} onClick={() => setIsMemberModalOpen(true)} className="h-[44px] px-5 shadow-sm">
                팀원 관리 ({globalMembers.length})
              </Button>
              <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="h-[44px] px-6 shadow-sm">새 프로젝트</Button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {myProjects.map(project => (
          <div key={project.id} onClick={() => navigate(`#project_${project.id}`)} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 cursor-pointer transition-all group relative">
            <button 
              onClick={(e) => handleDeleteProjectClick(e, project)} 
              className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-100"
              title="프로젝트 삭제"
            >
              <Trash2 size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Folder size={28} /></div>
              <h2 className="text-xl font-bold truncate pr-12">{project.name}</h2>
            </div>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-1 group-hover:text-blue-600 transition-colors">프로젝트 입장 <ChevronRight size={16} /></p>
          </div>
        ))}
        {myProjects.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
            <Layout size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">등록된 프로젝트가 없습니다</h3>
            <p className="text-gray-500 mb-6">진행 중인 내 프로젝트가 없습니다. 위 입력창에 접속 코드를 입력하여 입장하세요.</p>
          </div>
        )}
      </div>

      {isModalOpen && isGlobalEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-6">새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject}>
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="프로젝트 이름 (예: 쇼핑몰 앱 리뉴얼)" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-8 text-lg" autoFocus required />
              <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>취소</Button><Button type="submit" disabled={!newProjectName.trim()}>생성하기</Button></div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && isGlobalEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="text-blue-600"/> 전체 팀원 관리 (멘션 대상)</h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">기획/문서 모드의 댓글에서 <b>@닉네임</b>으로 멘션할 팀원을 등록하세요. 이곳에 등록하면 모든 프로젝트에서 멘션할 수 있습니다.</p>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-2 mb-6">
              {globalMembers.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-sm font-medium">등록된 팀원이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {globalMembers.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center text-xs uppercase">{m.nickname.charAt(0)}</div>
                        <div><div className="text-sm font-bold text-gray-900">{m.nickname}</div></div>
                      </div>
                      <button onClick={() => handleRemoveMember(m.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={handleAddMember} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1"><Plus size={16}/> 팀원 추가하기</h4>
              <div className="flex gap-2">
                <input type="text" placeholder="닉네임 (예: 김기획)" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                <Button type="submit" className="shrink-0 px-6 py-2 text-sm" disabled={!newMemberName}>추가</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View 2: Project Detail ---
function ProjectDetail({ projectId, projects, screens, navigate, setShareState, user, db }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenName, setScreenName] = useState('');
  const [screenCode, setScreenCode] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', msg: '', action: null });

  const project = projects.find(p => p.id === projectId);
  const projectScreens = screens.filter(s => s.projectId === projectId);

  if (!project) return null;
  const isEditor = !project.ownerId || project.ownerId === user?.uid;

  const handleAddScreen = async (e) => {
    e.preventDefault();
    if (!screenName.trim() || !screenCode.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'screens'), {
        projectId, name: screenName, code: screenCode, annotations: [], ownerId: user?.uid || null, createdAt: serverTimestamp()
      });
      setIsModalOpen(false); setScreenName(''); setScreenCode(''); navigate(`#screen_${docRef.id}`);
      showToast('화면이 성공적으로 추가되었습니다.');
    } catch (err) { console.error(err); }
  };

  const executeDeleteProject = async () => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId));
    const batch = writeBatch(db);
    projectScreens.forEach(s => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'screens', s.id)));
    await batch.commit();
    setConfirmState({ ...confirmState, isOpen: false }); navigate('#');
    showToast('프로젝트가 삭제되었습니다.');
  };

  const executeDeleteScreen = async (screenId) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', screenId));
    setConfirmState({ ...confirmState, isOpen: false }); showToast('화면이 성공적으로 삭제되었습니다.');
  };

  return (
    <div className="p-10">
      <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.msg} onConfirm={confirmState.action} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center text-sm font-medium text-gray-500">
          <button onClick={() => navigate('#')} className="hover:text-blue-600 flex items-center gap-1 transition-colors"><Folder size={16} /> 프로젝트 목록</button>
          <ChevronRight size={16} className="mx-3 text-gray-300" />
          <span className="text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{project.name}</span>
          {!isEditor && <span className="ml-3 bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">👁️ 보기 전용 모드</span>}
        </div>
      </div>

      <div className="flex justify-between items-end mb-10 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
          <p className="text-gray-500 mt-3 text-lg">이 프로젝트에 포함된 화면(프로토타입) 목록입니다.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={ExternalLink} onClick={() => setShareState({isOpen: true, type: 'project', id: project.id})}>공유 및 초대</Button>
          {isEditor && (
            <>
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" icon={Trash2} onClick={() => setConfirmState({ isOpen: true, title: '프로젝트 삭제', msg: `'${project.name}' 프로젝트와 하위 화면이 모두 삭제됩니다. 복구할 수 없습니다. 진행하시겠습니까?`, action: executeDeleteProject })}>삭제</Button>
              <Button icon={Plus} onClick={() => setIsModalOpen(true)} className="shadow-md">새 화면 추가</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {projectScreens.map(screen => (
          <div key={screen.id} onClick={() => navigate(`#screen_${screen.id}`)} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col group relative">
            {isEditor && (
              <button onClick={(e) => { e.stopPropagation(); setConfirmState({ isOpen: true, title: '화면 삭제', msg: `'${screen.name}' 화면과 등록된 데이터가 삭제됩니다. 진행하시겠습니까?`, action: () => executeDeleteScreen(screen.id) }); }} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10 border border-gray-100"><Trash2 size={16} /></button>
            )}
            <div className="h-40 bg-gray-50 border-b border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-400 transition-colors"><FileCode2 size={48} /></div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xl text-gray-800 mb-2 truncate">{screen.name}</h3>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold"><MessageSquarePlus size={12} /> 기획/정책: {(screen.annotations || []).length}개</div>
              </div>
              <div className="mt-6 text-blue-600 font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">캔버스 열기 <ArrowLeft size={16} className="rotate-180" /></div>
            </div>
          </div>
        ))}
        {projectScreens.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
            <Layout size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">등록된 화면이 없습니다</h3>
            <p className="text-gray-500 mb-6">{isEditor ? "우측 상단의 '새 화면 추가' 버튼을 눌러 첫 번째 프로토타입을 등록해보세요." : "이 프로젝트에는 아직 등록된 화면이 없습니다."}</p>
          </div>
        )}
      </div>

      {isModalOpen && isEditor && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl flex flex-col h-[85vh] animate-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-6">새 화면(프로토타입) 추가</h2>
            <form onSubmit={handleAddScreen} className="flex flex-col flex-1 gap-6 overflow-hidden">
              <div><label className="block text-sm font-bold text-gray-700 mb-2">화면 이름</label><input type="text" value={screenName} onChange={(e) => setScreenName(e.target.value)} placeholder="예: 메인 랜딩 페이지, 로그인 모달" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg" required autoFocus /></div>
              <div className="flex flex-col flex-1 min-h-0"><label className="block text-sm font-bold text-gray-700 mb-2">UI 코드</label><textarea value={screenCode} onChange={(e) => setScreenCode(e.target.value)} className="w-full flex-1 p-5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none bg-gray-50" required /></div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-auto"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>취소</Button><Button type="submit" className="px-8">저장 및 생성</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View 3: Screen Editor & History Dashboard ---
function ScreenEditor({ screenId, extraParam, projects, screens, navigate, setShareState, user, globalMembers, db }) {
  const [mode, setMode] = useState('interact'); 
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', msg: '', action: null });
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const iframeContainerRef = useRef(null);
  const descRef = useRef(null);

  // 기능 정의 탭 상태 관리
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('edit'); 
  const [editingAnnotationId, setEditingAnnotationId] = useState(null); 
  const [draftPosition, setDraftPosition] = useState({ x: 0, y: 0, targetSelector: '' });
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftVersion, setDraftVersion] = useState('1.0'); 

  const [trackedAnnotations, setTrackedAnnotations] = useState([]);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);

  const [profileState, setProfileState] = useState({ isOpen: false, pendingAction: null });

  const screen = screens.find(s => s.id === screenId);
  const project = projects.find(p => p.id === screen?.projectId);
  const isEditor = !project?.ownerId || project.ownerId === user?.uid;
  const annotations = screen?.annotations || [];

  useEffect(() => { if (extraParam) { setActiveAnnotationId(extraParam); setMode('annotate'); } }, [extraParam]);

  useEffect(() => {
    if (mode !== 'annotate') return;
    const checkVisibility = () => {
      try {
        const iframe = iframeContainerRef.current?.querySelector('iframe');
        if (!iframe || !iframe.contentDocument) return;
        const doc = iframe.contentDocument;
        const currentContext = getPageContext(doc);
        const updated = annotations.map(ann => {
          let isVisible = false;
          let currentX = ann.x;
          let currentY = ann.y;

          const isSameContext = !ann.pageContext || ann.pageContext === currentContext;

          if (isSameContext && ann.targetSelector) {
              const el = doc.querySelector(ann.targetSelector);
              if (el) {
                 const rect = el.getBoundingClientRect();
                 isVisible = (
                     rect.width > 0 && rect.height > 0 && 
                     window.getComputedStyle(el).display !== 'none' &&
                     window.getComputedStyle(el).visibility !== 'hidden' &&
                     window.getComputedStyle(el).opacity !== '0' &&
                     rect.right >= 0 && rect.bottom >= 0 && 
                     rect.left <= (iframe.clientWidth || doc.documentElement.clientWidth) && 
                     rect.top <= (iframe.clientHeight || doc.documentElement.clientHeight)
                 );
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
        setTrackedAnnotations(prev => {
          const changed = updated.some((u, i) => !prev[i] || prev[i].isVisible !== u.isVisible || Math.abs(prev[i].currentX - u.currentX) > 1 || Math.abs(prev[i].currentY - u.currentY) > 1);
          return changed ? updated : prev;
        });
      } catch(e) {}
    };
    checkVisibility(); const interval = setInterval(checkVisibility, 200); return () => clearInterval(interval);
  }, [annotations, mode]);

  const handleDragStart = (e) => { setIsDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, startX: toolbarPos.x, startY: toolbarPos.y }; };
  useEffect(() => {
    const handleDragMove = (e) => { if (!isDragging) return; setToolbarPos({ x: dragStart.current.startX + (e.clientX - dragStart.current.x), y: dragStart.current.startY + (e.clientY - dragStart.current.y) }); };
    const handleDragEnd = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd); }
    return () => { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
  }, [isDragging]);

  if (!screen || !project) {
    return <div className="h-[calc(100vh-61px)] flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  const insertFormatting = (format) => {
    const textarea = descRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart; const end = textarea.selectionEnd; const selectedText = draftDesc.substring(start, end);
    let newText = '';
    switch(format) {
      case 'bold': newText = `**${selectedText || '텍스트'}**`; break;
      case 'code': newText = `\`${selectedText || '코드'}\``; break;
      case 'bullet': newText = start === 0 ? `- ${selectedText}` : `\n- ${selectedText}`; break;
      case 'link': newText = `[${selectedText || '링크명'}](https://url)`; break;
      case 'indent': newText = start === 0 ? `  ${selectedText}` : `\n  ${selectedText}`; break;
      default: break;
    }
    setDraftDesc(draftDesc.substring(0, start) + newText + draftDesc.substring(end));
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + newText.length, start + newText.length); }, 0);
  };

  const handleCanvasClick = (e) => {
    if (mode !== 'annotate' || !isEditor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let autoName = '', targetSelector = '', pageContext = '';
    let offsetX = 0, offsetY = 0;
    try {
      const iframe = iframeContainerRef.current.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        pageContext = getPageContext(iframe.contentDocument);
        const iframeRect = iframe.getBoundingClientRect();
        const iframeX = e.clientX - iframeRect.left;
        const iframeY = e.clientY - iframeRect.top;
        const clickedEl = iframe.contentDocument.elementFromPoint(iframeX, iframeY);
        
        if (clickedEl && clickedEl.tagName !== 'HTML' && clickedEl.tagName !== 'BODY') {
          // 스마트 명칭 추출을 위한 광범위 요소 스캔
          const targetEl = clickedEl.closest('button, a, input, select, textarea, img') || clickedEl;
          targetSelector = getCssSelector(targetEl);
          
          const targetRect = targetEl.getBoundingClientRect();
          offsetX = iframeX - targetRect.left;
          offsetY = iframeY - targetRect.top;

          const tagName = targetEl.tagName.toLowerCase();
          let extractedText = targetEl.getAttribute('aria-label') || targetEl.alt || targetEl.placeholder || targetEl.innerText || targetEl.textContent || '';
          const textContent = extractedText.trim().replace(/\s+/g, ' ').substring(0, 20);

          if (tagName === 'button') autoName = textContent ? `${textContent} 버튼` : '버튼 요소';
          else if (tagName === 'a') autoName = textContent ? `${textContent} 링크` : '링크 요소';
          else if (tagName === 'input') autoName = textContent ? `${textContent} 입력창` : '입력창 요소';
          else if (tagName === 'img') autoName = textContent ? `${textContent} 이미지` : '이미지 요소';
          else autoName = textContent ? `${textContent} 영역` : 'UI 요소';
        } else {
          offsetX = 0; offsetY = 0;
        }
      }
    } catch(err) {}
    
    setDraftPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetSelector, offsetX, offsetY, pageContext });
    setDraftVersion('1.0');
    setDraftTitle(autoName); 
    setDraftDesc('[기능 정의]\n\n[동작]\n\n[정책]\n\n[예외 사항]'); 
    setActiveRightTab('edit');
    setEditingAnnotationId(null); 
    setShowDraftForm(true); 
    setActiveAnnotationId(null); 
    setReplyingToCommentId(null);
  };

  const handleEditClick = (e, ann) => {
    e.stopPropagation(); 
    setDraftTitle(ann.title); 
    setDraftDesc(ann.description); 
    
    // 자동 버전 업데이트 추천 (1.0 -> 1.1)
    const currentV = ann.version || '1.0';
    let nextV = currentV;
    if (!isNaN(parseFloat(currentV))) {
      nextV = (parseFloat(currentV) + 0.1).toFixed(1);
    }
    setDraftVersion(nextV);

    const tracked = trackedAnnotations.find(t => t.id === ann.id);
    setDraftPosition({ x: tracked?.currentX ?? ann.x, y: tracked?.currentY ?? ann.y, targetSelector: ann.targetSelector || '', offsetX: ann.offsetX, offsetY: ann.offsetY, pageContext: ann.pageContext });
    
    setActiveRightTab('edit');
    setEditingAnnotationId(ann.id); 
    setShowDraftForm(true); 
    setActiveAnnotationId(ann.id);
  };

  const saveAnnotation = async () => {
    if (!draftTitle.trim()) return;
    let updatedAnnotations, activeId;
    
    const historyEntry = { version: draftVersion, title: draftTitle, description: draftDesc, updatedAt: Date.now() };

    if (editingAnnotationId) {
      updatedAnnotations = annotations.map(a => {
        if (a.id === editingAnnotationId) {
          const prevHistory = a.history || [{ version: a.version || '1.0', title: a.title, description: a.description, updatedAt: a.createdAt }];
          return { 
            ...a, 
            title: draftTitle, 
            description: draftDesc, 
            version: draftVersion,
            history: [...prevHistory, historyEntry]
          };
        }
        return a;
      });
      activeId = editingAnnotationId;
    } else {
      const newAnnotation = { 
        id: generateId(), 
        x: draftPosition.x, y: draftPosition.y, 
        targetSelector: draftPosition.targetSelector, offsetX: draftPosition.offsetX, offsetY: draftPosition.offsetY, pageContext: draftPosition.pageContext, 
        title: draftTitle, description: draftDesc, version: draftVersion, history: [historyEntry],
        comments: [], number: annotations.length + 1, createdAt: Date.now() 
      };
      updatedAnnotations = [...annotations, newAnnotation];
      activeId = newAnnotation.id;
    }
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', screenId), { ...screen, annotations: updatedAnnotations });
      setShowDraftForm(false); setEditingAnnotationId(null); setActiveAnnotationId(activeId);
      showToast(editingAnnotationId ? '정책 버전이 업데이트되었습니다.' : '새로운 정책이 저장되었습니다.');
    } catch (err) { console.error(err); }
  };

  const handleCommentSubmit = async (annId, text, parentCommentId = null) => {
    let authorName = localStorage.getItem('axure_username');
    if (!authorName) {
      setProfileState({ isOpen: true, pendingAction: () => handleCommentSubmit(annId, text, parentCommentId) });
      return;
    }

    const newComment = { id: generateId(), text, author: authorName, createdAt: Date.now(), replies: [] };
    
    let mentionedUsers = [];
    const words = text.split(/\s/);
    words.forEach(w => {
      if (w.startsWith('@')) {
        const nick = w.slice(1);
        const member = globalMembers.find(m => m.nickname === nick);
        if (member && !mentionedUsers.includes(member.nickname)) mentionedUsers.push(member.nickname);
      }
    });

    const updatedAnnotations = annotations.map(a => {
      if (a.id === annId) {
        const comments = a.comments || [];
        if (parentCommentId) {
          const updatedComments = comments.map(c => c.id === parentCommentId ? { ...c, replies: [...(c.replies||[]), newComment] } : c);
          return { ...a, comments: updatedComments };
        }
        return { ...a, comments: [...comments, newComment] };
      }
      return a;
    });

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', screenId), { ...screen, annotations: updatedAnnotations });
      setReplyingToCommentId(null);
      
      if (mentionedUsers.length > 0) {
        const baseUrl = window.location.origin + window.location.pathname;
        const linkUrl = `${baseUrl}#screen_${screenId}_ann_${annId}`;
        
        const targetAnn = annotations.find(a => a.id === annId);
        
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mockEmails'), {
           author: authorName, 
           receivers: mentionedUsers, 
           screenName: screen.name,
           projectName: project.name,
           uiTitle: targetAnn ? targetAnn.title : '알 수 없음',
           text: text, 
           isReply: !!parentCommentId, 
           linkUrl: linkUrl, 
           createdAt: Date.now(), 
           isRead: false
        });
        showToast(`[알림 발송] ${mentionedUsers.join(', ')}님에게 멘션 알림이 전송되었습니다.`);
      }
    } catch(err) { console.error(err); }
  };

  const executeClearAllHistory = async () => {
    try {
      const batch = writeBatch(db);
      allProjectScreens.forEach(s => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'screens', s.id), { annotations: [] }));
      await batch.commit(); setShowHistory(false); setConfirmState({ ...confirmState, isOpen: false }); showToast('모든 히스토리가 초기화되었습니다.');
    } catch(err) { console.error(err); }
  };

  const executeDeleteHistoryItem = async (targetScreenId, targetAnnId) => {
    const targetScreen = screens.find(s => s.id === targetScreenId);
    if(!targetScreen) return;
    const updated = targetScreen.annotations.filter(a => a.id !== targetAnnId);
    updated.forEach((a,i) => a.number = i+1);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', targetScreenId), { ...targetScreen, annotations: updated });
    setConfirmState({ ...confirmState, isOpen: false }); showToast('해당 정책이 삭제되었습니다.');
  };

  const executeDeleteAnnotation = async (idToDelete) => {
    const updatedAnnotations = annotations.filter(a => a.id !== idToDelete);
    updatedAnnotations.forEach((a, i) => a.number = i + 1);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', screenId), { ...screen, annotations: updatedAnnotations });
      if (activeAnnotationId === idToDelete) setActiveAnnotationId(null);
      if (editingAnnotationId === idToDelete) { setShowDraftForm(false); setEditingAnnotationId(null); }
      setConfirmState({ ...confirmState, isOpen: false }); showToast('정책이 삭제되었습니다.');
    } catch (err) { console.error(err); }
  };

  const renderedHtml = generateHtmlBoilerplate(screen?.code || '');
  const allProjectScreens = screens.filter(s => s.projectId === project.id);
  
  // 모든 버전 히스토리를 플랫하게 만들고, 버전별로 그룹핑
  const allHistory = allProjectScreens.flatMap(s => 
    (s.annotations || []).flatMap(a => {
      const hList = a.history && a.history.length > 0 ? a.history : [{ version: a.version || '1.0', title: a.title, description: a.description, updatedAt: a.createdAt }];
      return hList.map(h => ({
        ...h,
        screenId: s.id,
        screenName: s.name,
        annId: a.id,
        annNumber: a.number,
        createdAt: h.updatedAt 
      }));
    })
  );
  allHistory.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

  // 버전을 기준으로 그룹화 객체 생성
  const groupedHistory = allHistory.reduce((acc, curr) => {
    const v = curr.version || '1.0';
    if (!acc[v]) acc[v] = [];
    acc[v].push(curr);
    return acc;
  }, {});

  // 버전 번호 기준 내림차순 정렬 (1.1, 1.0, 0.9 ...)
  const sortedVersions = Object.keys(groupedHistory).sort((a, b) => parseFloat(b) - parseFloat(a));

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col relative bg-gray-100 overflow-hidden">
      <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.msg} onConfirm={confirmState.action} onCancel={() => setConfirmState({ ...confirmState, isOpen: false })} />
      <ProfileModal isOpen={profileState.isOpen} members={globalMembers} onConfirm={(name) => { localStorage.setItem('axure_username', name.trim()); setProfileState({ ...profileState, isOpen: false }); if (profileState.pendingAction) profileState.pendingAction(); }} onCancel={() => setProfileState({ ...profileState, isOpen: false })} />
      
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 flex flex-col relative bg-white transition-all duration-300 ${mode === 'annotate' ? 'mr-[420px]' : ''}`}>
          <div className="absolute top-4 left-6 z-20 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-gray-200">
             <button onClick={() => navigate(`#project_${project.id}`)} className="text-gray-400 hover:text-gray-800"><ArrowLeft size={20} /></button>
             <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">{project.name} {!isEditor && '(보기 전용)'}</span><span className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{screen.name}</span></div>
          </div>
          <div className="absolute top-4 right-6 z-20"><Button variant="outline" className="bg-white/90 backdrop-blur-md shadow-sm border-gray-200" icon={ExternalLink} onClick={() => setShareState({isOpen: true, type: 'screen', id: screen.id})}>공유 및 초대</Button></div>
          {mode === 'annotate' && <div className={`absolute top-0 left-0 right-0 text-white text-center py-2 text-sm z-30 font-bold shadow-md backdrop-blur ${isEditor?'bg-blue-600/90':'bg-gray-600/90'}`}>{isEditor ? "👆 기능을 정의할 UI 요소를 마우스로 클릭하세요" : "👁️ 보기 모드입니다. 등록된 아이콘(체크박스)을 클릭하여 정책을 확인하고 댓글을 달 수 있습니다."}</div>}

          {/* Iframe 렌더링 컨테이너: 가로폭 최소 1280px 이상을 보장하여 사이드바 등 데스크탑 뷰가 잘리지 않도록 강제 */}
          <div ref={iframeContainerRef} className="relative w-full h-full overflow-auto bg-gray-100 p-8 pt-24 pb-40 flex justify-center">
            <div className="relative shadow-2xl border border-gray-200 bg-white mx-auto shrink-0" style={{ width: '100%', minWidth: '1280px', height: '850px' }}>
              <iframe srcDoc={renderedHtml} className="w-full h-full border-0 bg-transparent pointer-events-auto" sandbox="allow-scripts allow-same-origin" />
              {mode === 'annotate' && <div className={`absolute inset-0 z-10 ${isEditor ? 'cursor-crosshair bg-blue-500/5' : 'cursor-default'}`} onClick={handleCanvasClick} />}
              {mode === 'annotate' && trackedAnnotations.map((ann) => {
                if (!ann.isVisible) return null;
                return (
                  <div key={ann.id} className={`absolute z-20 flex items-center justify-center w-8 h-8 rounded-md shadow-lg text-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all border-2 ${activeAnnotationId === ann.id ? 'bg-blue-600 border-white scale-125 z-30 ring-4 ring-blue-600/30' : 'bg-rose-500 border-white hover:bg-rose-600'}`} style={{ left: ann.currentX ?? ann.x, top: ann.currentY ?? ann.y }} onClick={(e) => { e.stopPropagation(); setActiveAnnotationId(ann.id); setMode('annotate'); }}>
                    <CheckSquare size={16} strokeWidth={3} />
                  </div>
                );
              })}
              {showDraftForm && mode === 'annotate' && isEditor && (
                <div className="absolute z-30 flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 border-2 border-white shadow-lg text-white font-bold transform -translate-x-1/2 -translate-y-1/2 animate-bounce" style={{ left: draftPosition.x, top: draftPosition.y }}><CheckSquare size={16} strokeWidth={3} /></div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Policy Details & Comments */}
        <div className={`absolute top-0 bottom-0 right-0 w-[420px] bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-300 z-40 ${mode === 'annotate' ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-extrabold text-gray-900 text-xl flex items-center gap-2"><FileText className="text-blue-600"/> 기능 정책 / 기획서 <span className="text-gray-300 font-light">| Policy</span></h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">화면에 정의된 모든 UI 정책과 스펙</p>
            </div>
            <button onClick={() => { setMode('interact'); setShowDraftForm(false); }} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50">
            
            {/* 드래프트 (작성/수정) 폼 및 히스토리 탭 (에디터 전용) */}
            {showDraftForm && isEditor && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col mb-6 overflow-hidden animate-in fade-in slide-in-from-right-4 z-10 relative">
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                  <button type="button" onClick={() => setActiveRightTab('edit')} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeRightTab === 'edit' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    📝 정책 편집
                  </button>
                  <button type="button" onClick={() => setActiveRightTab('history')} className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeRightTab === 'history' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    🕒 버전 히스토리 <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[10px]">{editingAnnotationId ? (annotations.find(a => a.id === editingAnnotationId)?.history?.length || 1) : 0}</span>
                  </button>
                </div>

                {activeRightTab === 'edit' ? (
                  <div className="p-5 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-600 mb-1.5">컴포넌트 명칭</label>
                      <input type="text" placeholder="요소 이름 (예: 1-2. 로그인 시작 버튼)" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} className="w-full text-lg font-extrabold text-gray-900 p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors" autoFocus />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-blue-600 mb-1.5">상세 정책 및 인터랙션 디스크립션</label>
                      <div className="bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-1 p-1.5 border-b border-gray-100 bg-gray-50/80">
                          <button type="button" onClick={() => insertFormatting('bold')} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded" title="굵게"><Bold size={15}/></button>
                          <button type="button" onClick={() => insertFormatting('code')} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded" title="인라인 코드"><Code size={15}/></button>
                          <div className="w-px h-4 bg-gray-300 mx-1"></div>
                          <button type="button" onClick={() => insertFormatting('bullet')} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded" title="글머리 기호"><List size={15}/></button>
                          <button type="button" onClick={() => insertFormatting('indent')} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded" title="들여쓰기"><Indent size={15}/></button>
                          <div className="w-px h-4 bg-gray-300 mx-1"></div>
                          <button type="button" onClick={() => insertFormatting('link')} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded" title="링크 추가"><Link2 size={15}/></button>
                        </div>
                        <textarea ref={descRef} placeholder="상세 정책을 입력하세요." value={draftDesc} onChange={e => setDraftDesc(e.target.value)} className="w-full text-[13px] p-4 min-h-[200px] resize-y outline-none bg-transparent text-gray-700 leading-relaxed" />
                      </div>
                    </div>

                    <div className="flex items-end gap-3 mt-2">
                      <div className="w-24 shrink-0">
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">버전 지정</label>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                          <span className="text-gray-400 font-bold mr-1 text-sm">v</span>
                          <input type="text" value={draftVersion} onChange={e => setDraftVersion(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-gray-800" />
                        </div>
                      </div>
                      <Button onClick={saveAnnotation} className="flex-1 py-2.5 h-[42px] shadow-sm"><Save size={16}/> 정책 저장 및 공유</Button>
                      <Button variant="secondary" onClick={() => { setShowDraftForm(false); setEditingAnnotationId(null); }} className="px-4 h-[42px]">취소</Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex flex-col gap-4 max-h-[450px] overflow-y-auto bg-gray-50">
                     <h3 className="text-xs font-bold text-gray-500 mb-2">업데이트 내역</h3>
                     {editingAnnotationId && annotations.find(a => a.id === editingAnnotationId)?.history?.length > 0 ? (
                       [...annotations.find(a => a.id === editingAnnotationId).history].sort((a,b) => getTime(b.updatedAt) - getTime(a.updatedAt)).map((h, i) => (
                         <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                           <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                             <span className="bg-blue-50 text-blue-600 font-bold text-xs px-3 py-1 rounded-md">v{h.version}</span>
                             <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><History size={12}/> {formatDateTime(h.updatedAt)}</span>
                           </div>
                           <h4 className="font-extrabold text-[15px] text-gray-900 mb-3">{h.title}</h4>
                           <div className="text-[13px] text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100" dangerouslySetInnerHTML={{ __html: renderMarkdown(h.description) }} />
                         </div>
                       ))
                     ) : (
                       <div className="text-center py-10 text-sm text-gray-400">히스토리 내역이 없습니다.</div>
                     )}
                  </div>
                )}
              </div>
            )}

            {!showDraftForm && annotations.length === 0 && (
              <div className="text-center text-gray-400 py-20 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><MessageSquarePlus size={28} className="text-gray-300" /></div>
                <p className="text-sm font-bold text-gray-500">정의된 기능이 없습니다</p>
                <p className="text-xs mt-2 text-gray-400">{isEditor ? "좌측 화면 요소를 클릭하여 정책을 추가하세요." : "아직 작성된 정책이 없습니다."}</p>
              </div>
            )}

            {/* 개별 정책 리스트 및 댓글 영역 */}
            {annotations.map((ann) => {
              const tracked = trackedAnnotations.find(t => t.id === ann.id);
              const isVisible = tracked ? tracked.isVisible : true;

              return (
                <div key={ann.id} className={`relative transition-all ${activeAnnotationId === ann.id && !showDraftForm ? '' : 'cursor-pointer hover:border-blue-200'}`}>
                  
                  <div onClick={() => { if(!showDraftForm) setActiveAnnotationId(ann.id); }} className={`relative p-5 rounded-xl border-2 bg-white overflow-hidden group
                      ${activeAnnotationId === ann.id && !showDraftForm ? 'border-blue-500 shadow-md ring-4 ring-blue-50' : 'border-gray-100 shadow-sm'}
                      ${!isVisible ? 'opacity-40 grayscale' : ''}
                    `}>
                    {!isVisible && <div className="absolute top-0 right-0 bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-bl-lg font-bold shadow-sm">현재 화면에 없음</div>}
                    <div className={`absolute -left-3.5 top-5 w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold border-2 border-white shadow-md transition-colors ${activeAnnotationId === ann.id && !showDraftForm ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'}`}><CheckSquare size={14} strokeWidth={3} /></div>
                    
                    <div className="flex justify-between items-start ml-2 mb-3 pr-12">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-600 font-bold text-[10px] px-2 py-0.5 rounded-full">v{ann.version || '1.0'}</span>
                        <h3 className="font-extrabold text-gray-900 text-[15px]">{ann.title}</h3>
                      </div>
                      {isEditor && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => handleEditClick(e, ann)} className="text-gray-400 hover:text-blue-500 p-1.5 bg-white rounded shadow-sm border border-gray-100" title="수정"><Edit2 size={14} /></button>
                          <button onClick={(e) => { 
                            e.stopPropagation(); 
                            setConfirmState({ isOpen: true, title: '정책 삭제', msg: '이 기획 내용을 삭제하시겠습니까?', action: () => executeDeleteAnnotation(ann.id) });
                          }} className="text-gray-400 hover:text-red-500 p-1.5 bg-white rounded shadow-sm border border-gray-100" title="삭제"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className="ml-2 text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: renderMarkdown(ann.description) || '<span class="text-gray-400 italic font-normal">상세 설명 없음</span>' }} />
                  </div>

                  {/* 댓글/답글 영역 */}
                  {activeAnnotationId === ann.id && !showDraftForm && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 space-y-4 py-3 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-xs font-bold text-gray-400 flex items-center gap-1"><MessageCircle size={14}/> 댓글 및 논의</h4>
                      
                      {(ann.comments || []).map(comment => (
                        <div key={comment.id} className="space-y-3">
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-gray-800">{comment.author}</span>
                              <span className="text-[10px] text-gray-400">{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <div className="text-gray-600 font-medium leading-relaxed text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.text) }} />
                            <div className="mt-3 flex">
                              <button onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)} className="text-xs text-blue-600 font-bold hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded">
                                {replyingToCommentId === comment.id ? '답글 닫기' : '↳ 답글 달기'}
                              </button>
                            </div>
                          </div>

                          {(comment.replies || []).map(reply => (
                            <div key={reply.id} className="ml-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5"><ArrowLeft size={12} className="rotate-[225deg] text-gray-400"/>{reply.author}</span>
                                <span className="text-[10px] text-gray-400">{formatDateTime(reply.createdAt)}</span>
                              </div>
                              <div className="text-gray-600 font-medium leading-relaxed text-[13px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.text) }} />
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div 
        className="fixed z-50 transition-shadow duration-300 hover:shadow-xl w-max"
        style={{ bottom: '40px', left: '50%', transform: `translate(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px)`, marginLeft: mode === 'annotate' ? '-210px' : '0', transitionProperty: isDragging ? 'none' : 'margin-left' }}
      >
        <div className="bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-2 pl-3 flex items-center gap-2 flex-nowrap w-max max-w-none">
          <div className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center whitespace-nowrap" onMouseDown={handleDragStart} title="드래그하여 툴바 이동"><GripVertical size={20} /></div>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full mr-2 whitespace-nowrap"><div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div><span className="text-sm font-bold text-green-700 tracking-tight whitespace-nowrap">실시간 공유 켜짐</span></div>
          <div className="w-px h-8 bg-gray-200 mx-2"></div>
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors mr-2 group whitespace-nowrap"><History size={18} className="group-hover:-rotate-45 transition-transform shrink-0" /><span className="text-sm font-extrabold tracking-tight whitespace-nowrap">전체 히스토리</span></button>
          <div className="flex items-center gap-4 px-4 py-1.5 whitespace-nowrap">
            <span className={`text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${mode === 'interact' ? 'text-gray-700' : 'text-gray-400'}`}>프로토타입</span>
            <button onClick={() => { setMode(mode === 'interact' ? 'annotate' : 'interact'); setShowDraftForm(false); setEditingAnnotationId(null); setReplyingToCommentId(null); }} className={`w-[60px] h-[32px] rounded-full relative transition-colors duration-300 ease-in-out shadow-inner shrink-0 ${mode === 'annotate' ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ease-in-out shadow-md ${mode === 'annotate' ? 'translate-x-[32px]' : 'translate-x-1'}`} /></button>
            <span className={`text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${mode === 'annotate' ? 'text-blue-600' : 'text-gray-400'}`}>기획/문서 모드</span>
          </div>
        </div>
      </div>

      {/* 전체 History Dashboard Modal (버전별 그룹핑) */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-in slide-in-from-bottom-4">
          <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-gray-200 shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md"><History size={24} /></div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">전체 버전 히스토리 대시보드</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">프로젝트 내 모든 기획 및 정책의 버전 업데이트 이력을 최신순으로 확인하세요.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditor && (
                <button onClick={() => setConfirmState({ isOpen: true, title: '전체 히스토리 초기화', msg: '프로젝트 내 모든 기획/정책 이력을 삭제합니다. 복구할 수 없습니다. 진행하시겠습니까?', action: executeClearAllHistory })} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-red-500 font-bold hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 whitespace-nowrap">
                  <AlertCircle size={18}/> 전체 초기화
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors whitespace-nowrap">
                <X size={18}/> 대시보드 닫기
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
            <div className="max-w-7xl mx-auto w-full">
              {sortedVersions.length === 0 ? (
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center text-gray-400 font-medium">
                   히스토리 내역이 없습니다.
                 </div>
              ) : (
                 sortedVersions.map(version => (
                   <div key={version} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                     
                     <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                       <div className="flex items-center gap-3">
                         <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-sm">v</span>
                         <h2 className="text-xl font-extrabold text-blue-600">버전 {version}</h2>
                       </div>
                       <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 shadow-sm whitespace-nowrap">
                         {groupedHistory[version].length}개의 업데이트 내역
                       </div>
                     </div>

                     <div className="grid grid-cols-12 gap-6 px-8 py-4 border-b border-gray-100 text-xs font-bold text-gray-500 tracking-wider bg-white">
                       <div className="col-span-2">업데이트 일시</div>
                       <div className="col-span-3">화면 / 컴포넌트명</div>
                       <div className="col-span-6">정책 상세 내용 미리보기</div>
                       <div className="col-span-1 text-center">관리</div>
                     </div>

                     <div className="divide-y divide-gray-100 bg-white">
                       {groupedHistory[version].map((h, idx) => (
                         <div key={idx} className="grid grid-cols-12 gap-6 px-8 py-5 hover:bg-gray-50/80 transition-colors items-start">
                           <div className="col-span-2 text-[13px] font-bold text-gray-600 font-mono mt-1">{formatDateTime(h.createdAt)}</div>
                           <div className="col-span-3 pr-4">
                             <div className="text-[11px] font-extrabold text-blue-500 uppercase tracking-widest mb-1.5 truncate">
                               {h.screenName}
                             </div>
                             <div className="text-[15px] font-extrabold text-gray-900 leading-tight">{h.title}</div>
                           </div>
                           <div className="col-span-6 pr-4">
                             <div className="text-[13px] font-medium text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-3 rounded-lg max-h-[100px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(h.description) || '-' }} />
                           </div>
                           <div className="col-span-1 flex flex-col items-center justify-center pt-1 gap-2">
                             <button onClick={() => { setShowHistory(false); navigate(`#screen_${h.screenId}_ann_${h.annId}`); }} className="flex items-center justify-center gap-1.5 w-[68px] py-1.5 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-white hover:border-blue-300 shadow-sm transition-all whitespace-nowrap bg-white" title="해당 정책으로 이동">
                               이동 <ExternalLink size={12} className="text-gray-400"/>
                             </button>
                             {isEditor && (
                               <button onClick={() => setConfirmState({ isOpen: true, title: '정책 삭제', msg: '해당 정책 전체가 삭제됩니다. 삭제하시겠습니까?', action: () => executeDeleteHistoryItem(h.screenId, h.annId) })} className="w-[30px] h-[30px] flex items-center justify-center border border-gray-200 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all bg-white" title="삭제">
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
