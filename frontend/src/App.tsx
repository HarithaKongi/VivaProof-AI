import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { AuthScreen } from "./AuthScreen";
import { supabase } from "./supabase";
import { Activity, ArrowUpRight, Bot, CheckCircle2, FileText, FolderOpen, Loader2, MessageSquare, Paperclip, Plus, Send, ShieldCheck, Sparkles, Trash2, UploadCloud, X } from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "https://vivaproof-ai-api.onrender.com").replace(/\/$/, "");
type Doc = { document_id: string; filename: string; chunks: number; characters: number };
type Citation = { document_id: string; filename: string; page?: number | null; chunk_index: number; score: number; excerpt: string };
type Message = { role: "user" | "assistant"; content: string; citations?: Citation[]; mode?: string; timings_ms?: { retrieval?: number; generation?: number; total?: number } };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load(accessToken: string) {
    try {
      const h = await fetch(`${API}/api/health`);
      if (!h.ok) throw new Error("API unavailable");
      const status = await h.json();
      setHealth("online");
      setStorageConfigured(Boolean(status.vector_store_configured));
      const d = await fetch(`${API}/api/documents`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setDocuments(d.ok ? await d.json() : []);
    } catch { setHealth("offline"); setDocuments([]); }
  }
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session?.access_token) void load(session.access_token);
    else { setDocuments([]); setMessages([]); }
  }, [session?.access_token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setNotice("");
    const data = new FormData();
    Array.from(files).forEach(file => data.append("files", file));
    try {
      const response = await fetch(`${API}/api/documents/upload`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token || ""}` }, body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Upload failed");
      setNotice(body.message || "Files indexed successfully."); if (session) await load(session.access_token);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function remove(id: string) {
    try {
      const response = await fetch(`${API}/api/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
      if (!response.ok) throw new Error("Could not remove document");
      if (session) await load(session.access_token);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Delete failed."); }
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setMessages(prev => [...prev, { role: "user", content: text }]); setQuestion(""); setBusy(true);
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ question: text }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Could not get an answer");
      setMessages(prev => [...prev, { role: "assistant", content: body.answer, citations: body.citations, mode: body.mode, timings_ms: body.timings_ms }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally { setBusy(false); }
  }

  if (authLoading) return <main className="auth-shell"><div className="auth-loading"><span className="brand-mark"><ShieldCheck size={22}/></span><p>Securing your workspace…</p></div></main>;
  if (recoveryMode) return <AuthScreen recovery />;
  if (!session) return <AuthScreen />;

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark"><ShieldCheck size={21}/></span><span>VivaProof<span className="brand-ai">.AI</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <button className="nav-item active"><MessageSquare size={17}/> Evidence Chat <span className="nav-dot"/></button>
      <button className="nav-item" onClick={() => inputRef.current?.click()}><FolderOpen size={17}/> Knowledge base</button>
      <div className="side-spacer"/>
      <div className="side-card">
        <div className="side-card-icon"><Sparkles size={17}/></div>
        <strong>Evidence, not guesses.</strong>
        <p>Every answer is grounded in the project files you provide.</p>
      </div>
      <div className="profile"><div className="avatar">{(session.user.email || "VP").slice(0, 2).toUpperCase()}</div><div className="profile-email"><strong>{session.user.email || "Your account"}</strong><span>Private workspace</span></div><button className="logout-button" title="Sign out" aria-label="Sign out" onClick={() => void supabase?.auth.signOut()}><LogOut size={16}/></button></div>
    </aside>

    <section className="main-panel">
      <header className="topbar">
        <div><div className="eyebrow">PROJECT INTELLIGENCE</div><h1>Evidence workspace</h1></div>
        <div className={`status-pill ${health}`}><span/>{health === "online" ? "API connected" : health === "checking" ? "Connecting…" : "API offline"}</div>
      </header>

      <div className="content-grid">
        <section className="chat-column">
          <div className="welcome">
            <div className="welcome-icon"><Bot size={25}/></div>
            <div><div className="eyebrow">YOUR PROJECT, UNDERSTOOD</div><h2>Ask questions. See the evidence.</h2><p>VivaProof retrieves relevant passages from your uploaded project files and explains what they support.</p></div>
          </div>
          {health === "offline" && <div className="alert"><Activity size={16}/> The API is waking up or temporarily unavailable. Please refresh in a moment.</div>}
          {health === "online" && !storageConfigured && <div className="alert"><Activity size={16}/> Backend is online. Connect a free Qdrant Cloud cluster to enable persistent document uploads and semantic search.</div>}
          {notice && <div className="notice"><CheckCircle2 size={15}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
          <div className="conversation">
            {messages.length === 0 ? <div className="empty-state">
              <div className="empty-orbit"><Sparkles size={22}/></div><h3>Your evidence conversation starts here</h3>
              <p>Upload your SRS, design documents, reports or source files, then ask a question.</p>
              <div className="suggestions">
                {["What problem does this project solve?", "Which technologies are used?", "What evidence describes the system architecture?"].map(item =>
                  <button key={item} onClick={() => setQuestion(item)}>{item}<ArrowUpRight size={14}/></button>)}
              </div>
            </div> : messages.map((message, index) => <article className={`message ${message.role}`} key={index}>
              <div className="message-avatar">{message.role === "assistant" ? <Bot size={17}/> : "You"}</div>
              <div className="message-body"><div className="message-label">{message.role === "assistant" ? "VIVAPROOF AI" : "YOU"}</div>
                <p className="message-text">{message.content}</p>
                {message.citations && message.citations.length > 0 && <div className="sources"><div className="sources-heading"><ShieldCheck size={14}/> RETRIEVED EVIDENCE <span>{message.citations.length} SOURCES</span></div>
                  {message.citations.map(citation => <details className="source-card" key={`${citation.document_id}-${citation.chunk_index}`}>
                    <summary><FileText size={15}/><span>{citation.filename}</span><small>{citation.page ? `Page ${citation.page}` : `Chunk ${citation.chunk_index + 1}`}</small><b>{(citation.score * 100).toFixed(0)}%</b></summary>
                    <p>{citation.excerpt}</p>
                  </details>)}
                </div>}
                {message.mode && <div className="mode-label">{message.mode === "gemini_rag" ? "✦ Gemini grounded generation" : message.mode === "retrieval_only" ? "Evidence retrieval mode · Gemini not configured" : "No evidence found"}{message.timings_ms?.total !== undefined && <span> · {message.timings_ms.total < 1000 ? `${message.timings_ms.total} ms` : `${(message.timings_ms.total / 1000).toFixed(1)} s`} total (retrieval {(message.timings_ms.retrieval ?? 0) / 1000}s · generation {(message.timings_ms.generation ?? 0) / 1000}s)</span>}</div>}
              </div>
            </article>)}
            {busy && <div className="typing"><Loader2 size={16}/> Searching evidence and generating a grounded answer… On a free server, the first request after inactivity may take longer.</div>}
            <div ref={bottomRef}/>
          </div>
          <form className="composer" onSubmit={ask}>
            <button type="button" className="attach-button" onClick={() => inputRef.current?.click()} aria-label="Attach files"><Paperclip size={18}/></button>
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask something about your project…" disabled={busy}/>
            <button type="submit" className="send-button" disabled={!question.trim() || busy}><Send size={17}/></button>
          </form>
          <div className="composer-foot">VivaProof AI can make mistakes. Verify important claims against original sources.</div>
        </section>

        <aside className="knowledge-panel">
          <div className="panel-heading"><div><div className="eyebrow">YOUR KNOWLEDGE</div><h3>Project sources</h3></div><button className="icon-button" onClick={() => inputRef.current?.click()} aria-label="Add files"><Plus size={18}/></button></div>
          <div className="stats-row"><div><strong>{documents.length}</strong><span>Documents</span></div><div><strong>{documents.reduce((n, d) => n + d.chunks, 0)}</strong><span>Chunks indexed</span></div></div>
          <button className="upload-zone" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="spin" size={23}/> : <UploadCloud size={23}/>}
            <strong>{uploading ? "Indexing files…" : "Add project files"}</strong>
            <span>PDF, DOCX, TXT, MD · up to 15 MB each</span>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md" multiple hidden onChange={e => void upload(e.target.files)}/>
          <div className="file-list-heading">INDEXED FILES <span>{documents.length}</span></div>
          <div className="file-list">
            {documents.length === 0 ? <div className="no-files"><FileText size={22}/><span>No files indexed yet</span><small>Your sources will appear here.</small></div> :
              documents.map(doc => <div className="file-item" key={doc.document_id}><div className="file-icon"><FileText size={17}/></div><div className="file-info"><strong title={doc.filename}>{doc.filename}</strong><span>{doc.chunks} chunks · {doc.characters.toLocaleString()} chars</span></div><button onClick={() => void remove(doc.document_id)} className="delete-button" aria-label={`Delete ${doc.filename}`}><Trash2 size={15}/></button></div>)}
          </div>
          <div className="pipeline-card"><div className="pipeline-title"><Activity size={15}/> RAG PIPELINE</div><div className="pipeline-step"><span className="step-number">01</span><div><b>Ingestion</b><small>Extract document text</small></div><CheckCircle2 size={14}/></div><div className="pipeline-step"><span className="step-number">02</span><div><b>Embeddings</b><small>Sentence Transformers</small></div><CheckCircle2 size={14}/></div><div className="pipeline-step"><span className="step-number">03</span><div><b>Vector retrieval</b><small>Qdrant similarity search</small></div><CheckCircle2 size={14}/></div><div className="pipeline-step"><span className="step-number">04</span><div><b>Generation</b><small>Gemini · optional</small></div><Sparkles size={14}/></div></div>
        </aside>
      </div>
      <footer className="footer"><span>VIVAPROOF AI <i>·</i> BUILT FOR EXPLAINABLE PROJECT KNOWLEDGE</span><span>PHASE 01 — RAG FOUNDATION</span></footer>
    </section>
  </main>;
}
