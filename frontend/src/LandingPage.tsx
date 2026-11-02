import { ArrowRight, ArrowUpRight, BookOpen, Check, FileSearch, Fingerprint, Layers3, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";

export function LandingPage({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="marketing">
    <header className="marketing-nav">
      <a className="wordmark" href="#home"><span className="logo-symbol"><ShieldCheck size={20}/></span><span>VIVA<span className="wordmark-light">PROOF</span></span></a>
      <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? "marketing-links open" : "marketing-links"}>
        <a href="#home" onClick={() => setMenuOpen(false)}>Home</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        <button className="nav-signin" onClick={onSignIn}>Sign in</button><button className="button-primary nav-cta" onClick={onSignUp}>Create account <ArrowUpRight size={15}/></button>
      </nav>
    </header>
    <section className="hero-section" id="home">
      <div className="hero-copy"><div className="announcement"><span className="announcement-dot"/> PROJECT KNOWLEDGE, MADE VERIFIABLE <ArrowUpRight size={13}/></div>
        <h1>Turn your project files into <span>answers you can prove.</span></h1>
        <p className="hero-description">Meet your evidence-grounded project assistant. Ask questions across your documents, get clear answers, and trace every insight back to its source.</p>
        <div className="hero-actions"><button className="button-primary button-large" onClick={onSignUp}>Get started <ArrowRight size={17}/></button><button className="button-secondary button-large" onClick={onSignIn}>Sign in to workspace</button></div>
        <div className="hero-proof"><span><Check size={14}/> Source-linked answers</span><span><Check size={14}/> Private workspaces</span><span><Check size={14}/> Built for project clarity</span></div>
      </div>
      <div className="hero-visual" aria-label="VivaProof product preview">
        <div className="preview-orbit orbit-one"/><div className="preview-orbit orbit-two"/>
        <div className="product-preview">
          <div className="preview-top"><div className="preview-brand"><span className="logo-symbol"><ShieldCheck size={14}/></span> VivaProof</div><span className="preview-status"><i/> WORKSPACE ACTIVE</span></div>
          <div className="preview-body"><div className="preview-sidebar"><span className="preview-side-active"><Layers3 size={13}/> Evidence chat</span><span><BookOpen size={13}/> Knowledge base</span><span><Fingerprint size={13}/> Private workspace</span></div>
            <div className="preview-content"><div className="preview-kicker">PROJECT INTELLIGENCE</div><h3>Ask your project anything.</h3><p>Understand what your documents actually say.</p>
              <div className="preview-question"><span className="preview-user">YOU</span> What are the key system components?</div>
              <div className="preview-answer"><div className="preview-ai"><Sparkles size={13}/> VIVAPROOF AI <span>GROUNDED ANSWER</span></div><p>The architecture describes three core layers working together to process and retrieve project knowledge.</p>
                <div className="preview-source"><FileSearch size={14}/><span><b>System_Architecture.pdf</b><small>Page 04 · Retrieved evidence</small></span><strong>98%</strong></div>
              </div>
              <div className="preview-input">Ask something about your project… <span><ArrowUpRight size={14}/></span></div>
            </div>
          </div>
          <div className="preview-foot"><span><i/> QDRANT CONNECTED</span><span>YOUR SOURCES. YOUR ANSWERS.</span></div>
        </div>
        <div className="floating-note"><span><ShieldCheck size={16}/></span><div><b>Evidence attached</b><small>Every answer has a source.</small></div></div>
      </div>
    </section>
    <section className="trust-strip" id="about"><span>BUILT FOR PEOPLE WHO NEED TO KNOW, NOT JUST GUESS</span><div><b>DOCUMENT-GROUNDED</b><b>TRACEABLE ANSWERS</b><b>PRIVATE BY DESIGN</b></div></section>
    <section className="features-section" id="features"><div className="section-heading"><span className="section-eyebrow">A CLEARER WAY TO UNDERSTAND YOUR WORK</span><h2>Intelligence with its sources attached.</h2><p>Move from scattered project documents to useful, verifiable understanding.</p></div>
      <div className="feature-grid"><article className="feature-card feature-highlight"><div className="feature-icon"><FileSearch/></div><h3>Ask across your documents</h3><p>Upload project reports, specifications and notes. Search them with natural-language questions instead of hunting through pages.</p><span className="feature-number">01 / RETRIEVE</span></article>
        <article className="feature-card"><div className="feature-icon"><ShieldCheck/></div><h3>See the evidence</h3><p>Inspect the retrieved excerpts, source filenames, page references and relevance scores behind each response.</p><span className="feature-number">02 / VERIFY</span></article>
        <article className="feature-card"><div className="feature-icon"><Fingerprint/></div><h3>Keep your workspace private</h3><p>Sign in securely and keep indexed project material scoped to your authenticated account.</p><span className="feature-number">03 / PROTECT</span></article>
      </div>
    </section>
    <section className="how-section" id="how-it-works"><div className="how-copy"><span className="section-eyebrow">A SIMPLE, GROUNDED WORKFLOW</span><h2>From upload to understanding in three steps.</h2><p>VivaProof combines document retrieval with grounded generation so you can spend less time searching and more time understanding.</p><button className="button-primary" onClick={onSignUp}>Create your workspace <ArrowRight size={16}/></button></div>
      <div className="steps-list"><div><span>01</span><section><b>Bring your project knowledge</b><p>Upload PDF, DOCX, TXT or Markdown files.</p></section><Check size={17}/></div><div><span>02</span><section><b>Ask a specific question</b><p>Semantic retrieval finds relevant passages in your sources.</p></section><Check size={17}/></div><div><span>03</span><section><b>Review the proof</b><p>Read the answer and open its supporting evidence.</p></section><Check size={17}/></div></div>
    </section>
    <section className="closing-cta"><div><span className="section-eyebrow">MAKE YOUR PROJECT KNOWLEDGE WORK HARDER</span><h2>Clarity starts with the evidence.</h2><p>Build a private workspace for the questions behind your project.</p></div><button className="button-primary button-large" onClick={onSignUp}>Get started for free <ArrowRight size={17}/></button></section>
    <footer className="marketing-footer" id="contact"><a className="wordmark" href="#home"><span className="logo-symbol"><ShieldCheck size={18}/></span><span>VIVA<span className="wordmark-light">PROOF</span></span></a><span>Evidence-grounded project intelligence.</span><a href="mailto:hello@vivaproof.ai">Contact <ArrowUpRight size={13}/></a><small>© {new Date().getFullYear()} VivaProof. Built for explainable project knowledge.</small></footer>
  </main>;
}
