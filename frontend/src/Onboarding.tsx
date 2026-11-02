import { ArrowRight, FileText, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";

export function Onboarding({ name, onComplete }: { name: string; onComplete: () => void }) {
  return <main className="onboarding-shell"><section className="onboarding-card"><div className="onboarding-brand"><span className="logo-symbol"><ShieldCheck size={20}/></span> VIVA<span>PROOF</span></div>
    <div className="onboarding-art"><div><Sparkles size={28}/></div><span/><span/><span/></div>
    <span className="section-eyebrow">YOUR WORKSPACE IS READY</span><h1>Welcome{ name ? `, ${name}` : "" }.</h1><p>Let's get your project knowledge in one place. VivaProof helps you ask better questions and inspect the evidence behind every answer.</p>
    <div className="onboarding-steps"><div><FileText/><section><b>Upload your project files</b><small>PDF, DOCX, TXT and Markdown are supported.</small></section></div><div><MessageSquareText/><section><b>Ask questions in plain language</b><small>Explore your documents with semantic search.</small></section></div><div><ShieldCheck/><section><b>Verify every answer</b><small>Open the retrieved source excerpts and citations.</small></section></div></div>
    <button className="button-primary button-large onboarding-continue" onClick={onComplete}>Continue to dashboard <ArrowRight size={17}/></button><small className="onboarding-note">You can revisit your files and account settings anytime.</small>
  </section></main>;
}
