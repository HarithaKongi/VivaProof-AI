import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Activity, ArrowRight, ArrowUpRight, Bot, CheckCircle2, FileText, FolderOpen, Loader2, LogOut, MessageSquare, Paperclip, Plus, Send, Settings, ShieldCheck, Sparkles, Layers3, Trash2, UploadCloud, UserRound, X, Menu, Clock3 } from "lucide-react";
import { AuthScreen } from "./AuthScreen";
import { LandingPage } from "./LandingPage";
import { Onboarding } from "./Onboarding";
import { supabase } from "./supabase";

const API = (import.meta.env.VITE_API_URL || "https://vivaproof-ai-api.onrender.com").replace(/\/$/, "");
type Doc = { document_id: string; filename: string; chunks: number; characters: number };
type Citation = { document_id: string; filename: string; page?: number | null; chunk_index: number; score: number; excerpt: string };
type Message = { role: "user" | "assistant"; content: string; citations?: Citation[]; mode?: string; timings_ms?: { retrieval?: number; generation?: number; total?: number } };
type Page = "dashboard" | "workspace" | "settings";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<"signin" | "signup" | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load(accessToken: string) {
    try {
      const h = await fetch(`${API}/api/health`);
      if (!h.ok) throw new Error("API unavailable");
      const status = await h.json();
      setHealth("online"); setStorageConfigured(Boolean(status.vector_store_configured));
      const d = await fetch(`${API}/api/documents`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!d.ok) throw new Error("Could not load your documents");
      setDocuments(await d.json());
    } catch { setHealth("offline"); setDocuments([]); }
  }
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(nextSession); setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    const fullName = String(session.user.user_metadata?.full_name || "");
    setProfileName(fullName); setProfileEmail(session.user.email || "");
    const onboarded = session.user.user_metadata?.onboarding_completed === true;
    if (!onboarded) setPage("dashboard");
    void load(session.access_token);
  }, [session?.access_token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (!session) { setDocuments([]); setMessages([]); setPage("dashboard"); } }, [session]);

  async function upload(files: FileList | null) {
    if (!files?.length || !session) return;
    setUploading(true); setNotice("");
    const data = new FormData(); Array.from(files).forEach(file => data.append("files", file));
    try {
      const response = await fetch(`${API}/api/documents/upload`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: data });
      const body = await response.json(); if (!response.ok) throw new Error(body.detail || "Upload failed");
      setNotice(body.message || "Files indexed successfully."); await load(session.access_token);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function remove(id: string) {
    if (!session) return;
    try {
      const response = await fetch(`${API}/api/documents/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error("Could not remove document"); await load(session.access_token);
      setNotice("Document removed from your workspace.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Delete failed."); }
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault(); const text = question.trim();
    if (!text || busy || !session) return;
    setMessages(prev => [...prev, { role: "user", content: text }]); setQuestion(""); setBusy(true);
    try {
      const response = await fetch(`${API}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ question: text }) });
      const body = await response.json(); if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Could not get an answer");
      setMessages(prev => [...prev, { role: "assistant", content: body.answer, citations: body.citations, mode: body.mode, timings_ms: body.timings_ms }]);
    } catch (error) { setMessages(prev => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." }]); }
    finally { setBusy(false); }
  }
  async function completeOnboarding() {
    if (supabase) await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    setPage("dashboard");
  }
  async function sendPasswordReset() {
    if (!supabase || !session.user.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, { redirectTo: window.location.origin });
    setNotice(error ? "Could not send a password reset email. Please try again." : "If your account email is eligible, a secure password reset link has been sent.");
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || !session) return;
    setSavingProfile(true); setNotice("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profileName.trim() } });
      if (error) throw error; setNotice("Profile updated successfully.");
      const { data } = await supabase.auth.getUser(); if (data.user) setSession(current => current ? { ...current, user: data.user! } : current);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update profile."); }
    finally { setSavingProfile(false); }
  }

  if (authLoading) return <main className="loading-screen"><span className="logo-symbol"><ShieldCheck/></span><p>Preparing your private workspace…</p></main>;
  if (recoveryMode) return <AuthScreen recovery onBack={() => setRecoveryMode(false)}/>;
  if (!session) return authView ? <AuthScreen initialMode={authView} onBack={() => setAuthView(null)}/> : <LandingPage onSignIn={() => setAuthView("signin")} onSignUp={() => setAuthView("signup")}/>;
  if (session.user.user_metadata?.onboarding_completed !== true) return <Onboarding name={profileName.split(" ")[0]} onComplete={() => void completeOnboarding()}/>;

  const name = profileName || session.user.email?.split("@")[0] || "there";
  const totalChunks = documents.reduce((n, d) => n + d.chunks, 0);
  const initials = (profileName || session.user.email || "VP").split(/[\s@]/).filter(Boolean).slice(0, 2).map(v => v[0]).join("").toUpperCase();
  const navigate = (next: Page) => { setPage(next); setMobileNav(false); setShowProfileMenu(false); };

  return <main className="app-shell">
    <aside className={mobileNav ? "sidebar mobile-open" : "sidebar"}>
      <a className="wordmark sidebar-brand" href="#" onClick={e => {e.preventDefault(); navigate("dashboard");}}><span className="logo-symbol"><ShieldCheck size={19}/></span><span>VIVA<span className="wordmark-light">PROOF</span></span></a>
      <div className="sidebar-caption">WORKSPACE</div>
      <button className={page === "dashboard" ? "side-link active" : "side-link"} onClick={() => navigate("dashboard")}><Activity size={17}/> Overview</button>
      <button className={page === "workspace" ? "side-link active" : "side-link"} onClick={() => navigate("workspace")}><MessageSquare size={17}/> Evidence workspace</button>
      <button className="side-link" onClick={() => {navigate("workspace"); inputRef.current?.click();}}><FolderOpen size={17}/> Knowledge base</button>
      <div className="sidebar-bottom"><div className="sidebar-promise"><Sparkles size={17}/><b>Evidence, not guesses.</b><p>Answers grounded in the project files you provide.</p></div>
        <div className="sidebar-user"><div className="user-avatar">{initials}</div><div className="sidebar-user-info"><b>{profileName || "Your account"}</b><small>Private workspace</small></div><button aria-label="Account settings" title="Account settings" onClick={() => navigate("settings")}><Settings size={16}/></button><button aria-label="Sign out" title="Sign out" onClick={() => void supabase?.auth.signOut()}><LogOut size={16}/></button></div>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-panel">
      <header className="app-topbar"><button className="mobile-menu app-menu" onClick={() => setMobileNav(v => !v)} aria-label="Open navigation"><Menu/></button><div><div className="section-eyebrow">YOUR PRIVATE PROJECT INTELLIGENCE</div><h1>{page === "dashboard" ? "Overview" : page === "workspace" ? "Evidence workspace" : "Account settings"}</h1></div>
        <div className="topbar-actions"><div className={`connection-status ${health}`}><i/>{health === "online" ? "Services connected" : health === "checking" ? "Connecting…" : "Service unavailable"}</div>
          <div className="profile-menu-wrap"><button className="topbar-avatar" onClick={() => setShowProfileMenu(v => !v)} aria-label="Open profile menu">{initials}</button>{showProfileMenu && <div className="profile-dropdown"><b>{profileName || "Your account"}</b><small>{session.user.email}</small><button onClick={() => navigate("settings")}><Settings size={14}/> Account settings</button><button onClick={() => void supabase?.auth.signOut()}><LogOut size={14}/> Sign out</button></div>}</div>
        </div>
      </header>
      <div className="app-content">
        {notice && <div className="app-notice"><CheckCircle2 size={16}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}
        {page === "dashboard" && <div className="dashboard-page">
          <div className="dashboard-greeting"><div><span className="section-eyebrow">YOUR PROJECT, IN FOCUS</span><h2>Good to see you, {name.split(" ")[0]}.</h2><p>Your project knowledge, ready when you are. Start by adding a source or asking a question.</p></div><button className="button-primary" onClick={() => navigate("workspace")}>Open workspace <ArrowUpRight size={16}/></button></div>
          <div className="metric-grid"><article><span className="metric-icon"><FileText/></span><small>YOUR DOCUMENTS</small><strong>{documents.length}</strong><p>Indexed project files</p></article><article><span className="metric-icon"><Layers3/></span><small>SEARCHABLE CHUNKS</small><strong>{totalChunks}</strong><p>Passages available for retrieval</p></article><article><span className="metric-icon"><ShieldCheck/></span><small>WORKSPACE STATUS</small><strong className="metric-word">{health === "online" ? "Connected" : health === "checking" ? "Checking" : "Offline"}</strong><p>API connection status</p></article></div>
          <div className="dashboard-lower"><section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">GET STARTED</span><h3>Make your first evidence query</h3></div><Sparkles/></div><p>Upload a project document, then ask VivaProof to explain a requirement, architecture decision or implementation detail.</p><button className="button-primary" onClick={() => navigate("workspace")}>Go to evidence chat <ArrowRight size={16}/></button></section>
            <section className="dashboard-panel"><div className="panel-title"><div><span className="section-eyebrow">RECENT SOURCES</span><h3>Your knowledge base</h3></div><button className="text-link" onClick={() => navigate("workspace")}>View all <ArrowUpRight size={14}/></button></div>
              {documents.length ? <div className="recent-docs">{documents.slice(0,4).map(doc => <div key={doc.document_id}><span><FileText size={16}/></span><section><b>{doc.filename}</b><small>{doc.chunks} indexed passages</small></section></div>)}</div> : <div className="dashboard-empty"><FileText size={20}/><b>No documents yet</b><span>Upload project files to see them here.</span></div>}
            </section></div>
          <div className="dashboard-footnote"><Clock3 size={14}/> Recent activity isn't available yet. Your dashboard shows live document and service data only.</div>
        </div>}
        {page === "workspace" && <div className="workspace-page">
          <div className="workspace-intro"><div><span className="section-eyebrow">PROJECT INTELLIGENCE</span><h2>Ask questions. See the evidence.</h2><p>VivaProof retrieves relevant passages from your uploaded files and explains what they support.</p></div><div className="workspace-count"><b>{documents.length}</b><span>sources indexed</span></div></div>
          {health === "offline" && <div className="inline-alert"><Activity size={16}/> The API is waking up or temporarily unavailable. Refresh in a moment.</div>}
          {health === "online" && !storageConfigured && <div className="inline-alert"><Activity size={16}/> Connect your Qdrant Cloud cluster to enable document indexing and semantic search.</div>}
          <div className="workspace-grid"><section className="chat-column">
            <div className="conversation">{messages.length === 0 ? <div className="empty-state"><div className="empty-orbit"><Sparkles size={22}/></div><h3>Your evidence conversation starts here</h3><p>Upload your SRS, design documents, reports or source files, then ask a question.</p><div className="suggestions">{["What problem does this project solve?","Which technologies are used?","What evidence describes the system architecture?"].map(item=><button key={item} onClick={() => setQuestion(item)}>{item}<ArrowUpRight size={14}/></button>)}</div></div> : messages.map((message,index)=><article className={`message ${message.role}`} key={index}><div className="message-avatar">{message.role === "assistant" ? <Bot size={17}/> : "You"}</div><div className="message-body"><div className="message-label">{message.role === "assistant" ? "VIVAPROOF AI" : "YOU"}</div><p className="message-text">{message.content}</p>
              {message.citations?.length ? <div className="sources"><div className="sources-heading"><ShieldCheck size={14}/> RETRIEVED EVIDENCE <span>{message.citations.length} SOURCES</span></div>{message.citations.map(citation=><details className="source-card" key={`${citation.document_id}-${citation.chunk_index}`}><summary><FileText size={15}/><span>{citation.filename}</span><small>{citation.page ? `Page ${citation.page}` : `Chunk ${citation.chunk_index+1}`}</small><b>{(citation.score*100).toFixed(0)}%</b></summary><p>{citation.excerpt}</p></details>)}</div> : null}
              {message.mode && <div className="mode-label">{message.mode === "gemini_rag" ? "Gemini grounded generation" : message.mode === "retrieval_only" ? "Evidence retrieval mode" : "No evidence found"}{message.timings_ms?.total !== undefined && <span> · {(message.timings_ms.total/1000).toFixed(1)}s total (retrieval {((message.timings_ms.retrieval??0)/1000).toFixed(2)}s · generation {((message.timings_ms.generation??0)/1000).toFixed(2)}s)</span>}</div>}</div></article>)}
              {busy && <div className="typing"><Loader2 size={16}/> Searching evidence and generating a grounded answer…</div>}<div ref={bottomRef}/></div>
            <form className="composer" onSubmit={ask}><button type="button" className="attach-button" onClick={() => inputRef.current?.click()} aria-label="Attach files"><Paperclip size={18}/></button><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask something about your project…" disabled={busy}/><button type="submit" className="send-button" disabled={!question.trim()||busy}><Send size={17}/></button></form><div className="composer-foot">Verify important claims against your original sources.</div>
          </section>
          <aside className="knowledge-panel"><div className="panel-heading"><div><span className="section-eyebrow">YOUR KNOWLEDGE</span><h3>Project sources</h3></div><button className="icon-button" onClick={()=>inputRef.current?.click()} aria-label="Add files"><Plus size={18}/></button></div>
            <div className="stats-row"><div><strong>{documents.length}</strong><span>Documents</span></div><div><strong>{totalChunks}</strong><span>Chunks indexed</span></div></div>
            <button className="upload-zone" onClick={()=>inputRef.current?.click()} disabled={uploading}>{uploading?<Loader2 className="spin" size={23}/>:<UploadCloud size={23}/>}<strong>{uploading?"Indexing files…":"Add project files"}</strong><span>PDF, DOCX, TXT, MD · up to 15 MB each</span></button>
            
            <div className="file-list-heading">INDEXED FILES <span>{documents.length}</span></div><div className="file-list">{documents.length===0?<div className="no-files"><FileText size={22}/><span>No files indexed yet</span><small>Your sources will appear here.</small></div>:documents.map(doc=><div className="file-item" key={doc.document_id}><div className="file-icon"><FileText size={17}/></div><div className="file-info"><strong title={doc.filename}>{doc.filename}</strong><span>{doc.chunks} chunks · {doc.characters.toLocaleString()} chars</span></div><button onClick={()=>void remove(doc.document_id)} className="delete-button" aria-label={`Delete ${doc.filename}`}><Trash2 size={15}/></button></div>)}</div>
            <div className="pipeline-card"><div className="pipeline-title"><Activity size={15}/> RAG PIPELINE</div>{["Document extraction","Semantic embeddings","Qdrant retrieval","Gemini generation"].map((label,i)=><div className="pipeline-step" key={label}><span className="step-number">0{i+1}</span><div><b>{label}</b><small>{["PDF · DOCX · TXT · MD","Sentence Transformers","Vector similarity search","Grounded response"][i]}</small></div><CheckCircle2 size={14}/></div>)}</div>
          </aside></div>
        </div>}
        {page === "settings" && <div className="settings-page"><div className="settings-heading"><span className="section-eyebrow">YOUR ACCOUNT</span><h2>Profile & settings</h2><p>Manage the details associated with your VivaProof account.</p></div><div className="settings-card"><div className="settings-card-title"><span className="settings-icon"><UserRound/></span><div><b>Profile information</b><small>Update how your name appears in your workspace.</small></div></div><form className="settings-form" onSubmit={saveProfile}><label htmlFor="profile-name">Full name</label><input id="profile-name" value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="Your full name"/><label htmlFor="profile-email">Email address</label><input id="profile-email" value={profileEmail} disabled/><small className="field-help">Email changes are managed through your authentication provider.</small><button className="button-primary" disabled={savingProfile}>{savingProfile?"Saving…":"Save profile"} <ArrowRight size={15}/></button></form></div>
          <div className="settings-card"><div className="settings-card-title"><span className="settings-icon"><ShieldCheck/></span><div><b>Security & session</b><small>Your account is protected by Supabase authentication.</small></div></div><div className="settings-row"><span>Signed in as</span><b>{session.user.email}</b></div><div className="settings-row"><span>Session status</span><b className="secure-label">Authenticated</b></div><button className="button-secondary settings-logout" onClick={()=>void sendPasswordReset()}><ShieldCheck size={15}/> Send password reset link</button><button className="button-secondary settings-logout" onClick={()=>void supabase?.auth.signOut()}><LogOut size={15}/> Sign out of VivaProof</button></div>
        </div>}
      </div>
      <footer className="app-footer"><span>VIVA<span>PROOF</span> · EVIDENCE-GROUNDED PROJECT KNOWLEDGE</span><span>YOUR SOURCES. YOUR ANSWERS.</span></footer>
    </section>
    <input ref={inputRef} className="global-file-input" type="file" accept=".pdf,.docx,.txt,.md" multiple hidden onChange={e=>void upload(e.target.files)}/>
  </main>;
}
