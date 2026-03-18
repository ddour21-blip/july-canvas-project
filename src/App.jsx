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
  apiKey: "AIzaSyCK4Hc8Bz5lhDTdKRCUaUbDwhUOMwO0bJ0",
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
const appId = 'prototype-manager-app';

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

// 공유/초대 모달
const ShareModal = ({ isOpen, type, id, onClose, workspaceId }) => {
  if (!isOpen) return null;
  const displayHash = `${type}_${id}`;
  const fullUrl = `${window.location.origin}${window.location.pathname}#ws_${workspaceId}_${type}_${id}`;

  const handleCopy = (text, msg) => {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast(msg); } catch(e) { showToast('복사 실패', 'error'); }
    document.body.removeChild(ta);
  };

  const handleCopyMessage = () => {
    const text = `🚀 July 캔버스 프로젝트\n\n🔑 접속 코드: ${displayHash}\n\n* 안내: July 캔버스 메인 화면의 '접속 코드' 입력란에 코드를 붙여넣고 [바로 입장]을 클릭해주세요. (배포 링크: ${fullUrl})`;
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
          </div>
        </div>
      </div>
    </div>
  );
};

// ZIP 다운로드 모달
const ExportZipModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Globe className="text-gray-800"/> 외부 호스팅 배포 준비 완료!</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 text-gray-500"><X size={20}/></button>
        </div>
        <Button onClick={onClose} className="w-full py-3.5">확인했습니다</Button>
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
            <h2 className="text-2xl font-bold flex items-center gap-2"><BellRing className="text-blue-600"/> 알림</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20}/></button>
         </div>
         <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {emails.length === 0 ? (
              <div className="text-center text-gray-400 py-20 flex flex-col items-center">
                <MailOpen size={48} className="mb-4 opacity-50"/>
                <p className="font-bold text-gray-500">수신된 알림이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emails.map(email => (
                   <div key={email.id} onClick={() => onOpenEmail(email)} className={`p-5 bg-white border rounded-xl cursor-pointer transition-all group ${email.isRead ? 'border-gray-200 opacity-70' : 'border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400'}`}>
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${email.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>{email.author.charAt(0)}</span>
                           <span className={`font-bold ${email.isRead ? 'text-gray-600' : 'text-gray-900'}`}>{email.author}님이 멘션했습니다.</span>
                         </div>
                         <span className="text-xs font-medium text-gray-400">{formatDateTime(email.createdAt)}</span>
                      </div>
                      <div className="pl-10 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(email.text) }} />
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
    <div className="fixed inset-0 z-[10000] bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-gray-200">
        <div className="p-8">
          <h2 className="text-[22px] text-gray-900 font-bold mb-6">{data.author}님이 댓글을 남겼습니다.</h2>
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-6 text-[15px] text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(data.text) }} />
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end">
               <button onClick={handleOpenLink} className="text-blue-600 font-bold hover:underline">열기</button>
            </div>
          </div>
          <Button onClick={onClose} className="w-full">닫기</Button>
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

  const handleSubmit = (e) => { e.preventDefault(); if (!text.trim()) return; onSubmit(text); setText(''); };
  const filteredMembers = (members || []).filter(m => m.nickname.toLowerCase().includes(mentionFilter));

  return (
    <form onSubmit={handleSubmit} className="relative mt-3">
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-64 bg-white border border-gray-200 shadow-xl rounded-xl mb-2 max-h-48 overflow-y-auto z-50">
          {filteredMembers.map(m => (
            <div key={m.id} onClick={() => handleMentionClick(m.nickname)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm font-bold">{m.nickname}</div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl pl-3 pr-1 py-1">
        <AtSign size={16} className="text-gray-400" />
        <input ref={inputRef} type="text" value={text} onChange={handleChange} placeholder={placeholder} className="flex-1 bg-transparent border-none outline-none text-sm py-1.5" />
        <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg"><Send size={14} /></button>
      </div>
    </form>
  );
};

const generateHtmlBoilerplate = (rawCode) => {
  if (rawCode.trim().toLowerCase().startsWith('<!doctype html')) return rawCode;
  return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700&display=swap" rel="stylesheet">
        <style>html, body { width: 100%; height: 100vh; margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Pretendard', sans-serif; }</style>
        <script type="importmap">{"imports": {"react": "https://esm.sh/react@18.2.0","react-dom/client": "https://esm.sh/react-dom@18.2.0/client","lucide-react": "https://esm.sh/lucide-react@0.292.0?deps=react@18.2.0"}}</script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/plain" id="user-code">${rawCode.replace(/export\s+default/g, 'const App = ')}</script>
        <script type="module">
          import { createRoot } from "react-dom/client";
          import React from "react";
          const codeRaw = document.getElementById('user-code').textContent;
          const transformed = Babel.transform(codeRaw, { presets: ['react'] }).code;
          const blob = new Blob([transformed + "\\nwindow.RenderedApp = App;"], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          import(url).then(() => { createRoot(document.getElementById('root')).render(React.createElement(window.RenderedApp)); });
        </script>
      </body>
      </html>
    `;
};

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
    const handleHashChange = () => setCurrentRoute('#' + window.location.hash.replace('#', ''));
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handler = (e) => { setToast(e.detail); setTimeout(() => setToast(null), 4000); };
    window.addEventListener('show-toast', handler); return () => window.removeEventListener('show-toast', handler);
  }, []);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProjects = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => getTime(b.createdAt)-getTime(a.createdAt)));
    });
    const unsubScreens = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'screens'), (snap) => {
      setScreens(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => {
      setGlobalMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubEmails = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'mockEmails'), (snap) => {
      setMockEmails(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProjects(); unsubScreens(); unsubMembers(); unsubEmails(); };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  const routeParts = currentRoute.replace('#', '').split('_');
  let viewType = routeParts[0] || 'dashboard';
  let viewId = routeParts[1];
  let extraParam = routeParts[2] === 'ann' ? routeParts[3] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-lg bg-gray-800 text-white animate-bounce">{toast.message}</div>}
      <ShareModal isOpen={shareState.isOpen} type={shareState.type} id={shareState.id} onClose={() => setShareState({ ...shareState, isOpen: false })} workspaceId={appId} />
      
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 cursor-pointer" onClick={() => window.location.hash = '#'}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Layout size={18} /></div>
          <span>July 캔버스</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px]">
        {viewType === 'dashboard' && <Dashboard projects={projects} screens={screens} user={user} globalMembers={globalMembers} db={db} />}
        {viewType === 'project' && <ProjectDetail projectId={viewId} projects={projects} screens={screens} user={user} db={db} />}
        {viewType === 'screen' && <ScreenEditor screenId={viewId} extraParam={extraParam} projects={projects} screens={screens} user={user} globalMembers={globalMembers} db={db} />}
      </main>
    </div>
  );
}

// --- View 1: Dashboard ---
function Dashboard({ projects, screens, user, globalMembers, db }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // 🚨 여기를 수정했습니다: 오직 프로젝트 주인(ownerId)이 로그인한 유저(user.uid)와 같을 때만 편집자로 인정합니다.
  const isGlobalEditor = projects.length === 0 || projects.some(p => p.ownerId === user?.uid);
  const myProjects = projects.filter(p => p.ownerId === user?.uid);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), { 
      name: newProjectName, ownerId: user?.uid, createdAt: serverTimestamp() 
    });
    setIsModalOpen(false); window.location.hash = `#project_${docRef.id}`;
  };

  return (
    <div className="p-10">
      <div className="flex justify-between items-end mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900">내 프로젝트</h1>
        <div className="flex gap-4">
           <input type="text" value={accessCode} onChange={e=>setAccessCode(e.target.value)} placeholder="접속 코드" className="px-4 py-2 border rounded-xl" />
           <button onClick={() => window.location.hash = accessCode} className="bg-gray-100 px-5 py-2 rounded-xl font-bold">바로 입장</button>
           <Button icon={Plus} onClick={() => setIsModalOpen(true)}>새 프로젝트</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {myProjects.map(project => (
          <div key={project.id} onClick={() => window.location.hash = `#project_${project.id}`} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg cursor-pointer transition-all">
            <h2 className="text-xl font-bold mb-4">{project.name}</h2>
            <p className="text-sm text-blue-600 font-bold">입장하기 →</p>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject}>
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="w-full px-4 py-3 border rounded-xl mb-8" placeholder="프로젝트 이름" required autoFocus />
              <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>취소</Button><Button type="submit">생성하기</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View 2: Project Detail ---
function ProjectDetail({ projectId, projects, screens, user, db }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenName, setScreenName] = useState('');
  const [screenCode, setScreenCode] = useState('');
  const project = projects.find(p => p.id === projectId);
  const projectScreens = screens.filter(s => s.projectId === projectId);
  
  if (!project) return null;
  // 🚨 여기를 수정했습니다: 주인 정보가 명확하고 내 ID와 같을 때만 편집 가능
  const isEditor = project.ownerId && project.ownerId === user?.uid;

  const handleAddScreen = async (e) => {
    e.preventDefault();
    const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'screens'), {
      projectId, name: screenName, code: screenCode, annotations: [], ownerId: user?.uid, createdAt: serverTimestamp()
    });
    setIsModalOpen(false); window.location.hash = `#screen_${docRef.id}`;
  };

  return (
    <div className="p-10">
      <div className="flex justify-between items-end mb-10 border-b pb-8">
        <h1 className="text-4xl font-extrabold">{project.name} {!isEditor && '(보기 전용)'}</h1>
        {isEditor && <Button icon={Plus} onClick={() => setIsModalOpen(true)}>새 화면 추가</Button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {projectScreens.map(screen => (
          <div key={screen.id} onClick={() => window.location.hash = `#screen_${screen.id}`} className="bg-white rounded-2xl border p-6 hover:shadow-xl cursor-pointer">
            <h3 className="font-bold text-xl mb-2">{screen.name}</h3>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-5xl h-[85vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-6">새 화면 추가</h2>
            <form onSubmit={handleAddScreen} className="flex-1 flex flex-col gap-6">
              <input type="text" value={screenName} onChange={(e) => setScreenName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="화면 이름" required />
              <textarea value={screenCode} onChange={(e) => setScreenCode(e.target.value)} className="flex-1 p-5 border rounded-xl font-mono text-sm" placeholder="UI 코드" required />
              <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>취소</Button><Button type="submit">저장</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View 3: Screen Editor ---
function ScreenEditor({ screenId, extraParam, projects, screens, user, globalMembers, db }) {
  const [mode, setMode] = useState(extraParam ? 'annotate' : 'interact');
  const [activeAnnotationId, setActiveAnnotationId] = useState(extraParam);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const screen = screens.find(s => s.id === screenId);
  const project = projects.find(p => p.id === screen?.projectId);
  
  if (!screen || !project) return null;
  // 🚨 여기를 수정했습니다: 주인 정보가 명확하고 내 ID와 같을 때만 편집 가능
  const isEditor = project.ownerId && project.ownerId === user?.uid;
  const annotations = screen.annotations || [];

  const handleCanvasClick = (e) => {
    if (mode !== 'annotate' || !isEditor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDraftTitle(''); setDraftDesc(''); setShowDraftForm(true);
  };

  const handleCommentSubmit = async (annId, text) => {
    const authorName = localStorage.getItem('axure_username') || '방문자';
    const updatedAnnotations = annotations.map(a => {
      if (a.id === annId) return { ...a, comments: [...(a.comments || []), { id: generateId(), text, author: authorName, createdAt: Date.now() }] };
      return a;
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'screens', screenId), { annotations: updatedAnnotations });
  };

  return (
    <div className="h-[calc(100vh-61px)] flex">
      <div className={`flex-1 relative bg-white transition-all ${mode === 'annotate' ? 'mr-[420px]' : ''}`}>
        <iframe srcDoc={generateHtmlBoilerplate(screen.code)} className="w-full h-full border-0" />
        {mode === 'annotate' && <div className="absolute inset-0 z-10 cursor-crosshair" onClick={handleCanvasClick} />}
        {mode === 'annotate' && annotations.map(ann => (
          <div key={ann.id} className={`absolute z-20 w-8 h-8 rounded-md flex items-center justify-center text-white cursor-pointer ${activeAnnotationId === ann.id ? 'bg-blue-600 scale-125' : 'bg-rose-500'}`} style={{ left: ann.x, top: ann.y }} onClick={() => setActiveAnnotationId(ann.id)}>
             <CheckSquare size={16} />
          </div>
        ))}
      </div>
      <div className={`absolute top-0 bottom-0 right-0 w-[420px] bg-white border-l shadow-2xl transition-transform ${mode === 'annotate' ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 border-b flex justify-between items-center">
            <h2 className="font-bold text-xl">기획서 모드 {!isEditor && '(보기 전용)'}</h2>
            <button onClick={() => setMode('interact')} className="text-gray-400"><X size={20}/></button>
         </div>
         <div className="p-6 space-y-6 overflow-y-auto h-full pb-40">
            {annotations.map(ann => (
              <div key={ann.id} className={`p-5 rounded-xl border-2 transition-all ${activeAnnotationId === ann.id ? 'border-blue-500' : 'border-gray-100'}`} onClick={() => setActiveAnnotationId(ann.id)}>
                 <h3 className="font-bold mb-2">{ann.title}</h3>
                 <p className="text-sm text-gray-600 mb-4">{ann.description}</p>
                 {activeAnnotationId === ann.id && (
                   <div className="mt-4 border-t pt-4">
                      {(ann.comments || []).map(c => <div key={c.id} className="mb-2 text-xs"><b>{c.author}</b>: {c.text}</div>)}
                      <CommentInputBox onSubmit={(txt) => handleCommentSubmit(ann.id, txt)} members={globalMembers} />
                   </div>
                 )}
              </div>
            ))}
         </div>
      </div>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl p-2 flex gap-4 border items-center">
         <span className="text-sm font-bold ml-4">기획 모드</span>
         <button onClick={() => setMode(mode === 'interact' ? 'annotate' : 'interact')} className={`w-14 h-8 rounded-full transition-colors ${mode === 'annotate' ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`w-6 h-6 bg-white rounded-full transition-transform ${mode === 'annotate' ? 'translate-x-7' : 'translate-x-1'}`} />
         </button>
      </div>
    </div>
  );
}
