import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Search, Upload, LayoutDashboard, ShieldCheck, Sun, Moon,
  UserRound, LogOut, FileText, Download, GraduationCap, Menu, X,
  CheckCircle2, LockKeyhole, Plus, Filter, AlertCircle
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";

const SUBJECTS = ["Mathematics", "Mathematical Literacy", "Physical Sciences", "Accounting", "Life Sciences"];
const GRADES = ["10", "11", "12"];
const TYPES = ["Question Paper", "Memorandum", "Notes"];
const demoResources = [
  { id: "demo-1", title: "Mathematics: Algebra revision", subject: "Mathematics", grade: "10", year: "2024", term: "Term 1", type: "Notes", description: "A revision resource for algebra fundamentals.", file_path: null },
  { id: "demo-2", title: "Physical Sciences: Mechanics", subject: "Physical Sciences", grade: "11", year: "2023", term: "Term 2", type: "Question Paper", description: "Practice questions for mechanics.", file_path: null },
  { id: "demo-3", title: "Life Sciences: Paper 1", subject: "Life Sciences", grade: "12", year: "2024", term: "Term 3", type: "Question Paper", description: "A Grade 12 practice paper.", file_path: null }
];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState(demoResources);
  const [page, setPage] = useState("home");
  const [authMode, setAuthMode] = useState("signin");
  const [authOpen, setAuthOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("All");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    loadProfile();
    loadResources();
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("id, full_name, role").eq("id", session.user.id).maybeSingle();
    setProfile(data || { id: session.user.id, full_name: session.user.email, role: "student" });
  }

  async function loadResources() {
    const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setResources(data || []);
  }

  const filtered = useMemo(() => resources.filter(r => {
    const q = search.toLowerCase();
    return (grade === "All" || r.grade === grade)
      && (subject === "All" || r.subject === subject)
      && (type === "All" || r.type === type)
      && [r.title, r.subject, r.description, r.year].join(" ").toLowerCase().includes(q);
  }), [resources, search, grade, subject, type]);

  async function handleAuth(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) return setNotice("Add your Supabase URL and key to the .env file first.");
    setBusy(true); setNotice("");
    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    let result;
    if (authMode === "signup") {
      result = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: form.get("full_name") } }
      });
      if (!result.error) setNotice("Account created. Check your email if email confirmation is enabled, then sign in.");
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    if (result.error) setNotice(result.error.message);
    setBusy(false);
    if (!result.error && authMode === "signin") setAuthOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("home"); setNotice("You have signed out.");
  }

  async function openResource(resource) {
    if (!session) { setAuthOpen(true); setNotice("Create an account or sign in to access learning resources."); return; }
    if (!resource.file_path) {
      setNotice("This is a sample listing. The actual PDF will be available after an administrator uploads it.");
      return;
    }
    const { data, error } = await supabase.storage.from("study-resources").createSignedUrl(resource.file_path, 60);
    if (error) setNotice(error.message);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadResource(e) {
    e.preventDefault();
    if (!isSupabaseConfigured || profile?.role !== "admin") return;
    setBusy(true); setNotice("");
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!file || !file.size) { setNotice("Choose a PDF file."); setBusy(false); return; }
    if (file.type !== "application/pdf") { setNotice("Only PDF files are accepted."); setBusy(false); return; }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const uploaded = await supabase.storage.from("study-resources").upload(path, file, { contentType: "application/pdf", upsert: false });
    if (uploaded.error) { setNotice(uploaded.error.message); setBusy(false); return; }
    const inserted = await supabase.from("resources").insert({
      title: form.get("title"), subject: form.get("subject"), grade: form.get("grade"),
      year: Number(form.get("year")), term: form.get("term"), type: form.get("type"),
      description: form.get("description"), file_path: path, uploaded_by: session.user.id
    });
    if (inserted.error) {
      await supabase.storage.from("study-resources").remove([path]);
      setNotice(inserted.error.message);
    } else {
      setNotice("Resource uploaded successfully.");
      e.currentTarget.reset();
      loadResources();
    }
    setBusy(false);
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className={dark ? "app dark" : "app light"}>
      <header className="topbar">
        <button className="brand" onClick={() => setPage("home")}><span className="brand-icon"><GraduationCap size={23}/></span><span>StudyHub <b>SA</b></span></button>
        <nav className={mobileOpen ? "nav open" : "nav"}>
          <button className={page === "home" ? "nav-link active" : "nav-link"} onClick={() => {setPage("home");setMobileOpen(false)}}><BookOpen size={16}/> Home</button>
          <button className={page === "browse" ? "nav-link active" : "nav-link"} onClick={() => {setPage("browse");setMobileOpen(false)}}><Search size={16}/> Browse Papers</button>
          {session && <button className={page === "dashboard" ? "nav-link active" : "nav-link"} onClick={() => {setPage("dashboard");setMobileOpen(false)}}><LayoutDashboard size={16}/> Dashboard</button>}
          {isAdmin && <button className={page === "upload" ? "nav-link active" : "nav-link"} onClick={() => {setPage("upload");setMobileOpen(false)}}><Upload size={16}/> Upload</button>}
        </nav>
        <div className="top-actions">
          <button className="icon-btn theme-toggle" title="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
          {session ? <><span className="user-email">{profile?.full_name || session.user.email}</span><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={18}/></button></> :
            <button className="sign-in" onClick={() => {setAuthMode("signin");setAuthOpen(true)}}><UserRound size={16}/> Sign in</button>}
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <main>
        {notice && <div className="notice"><AlertCircle size={17}/><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}
        {page === "home" && <Home setPage={setPage} setSearch={setSearch} resources={resources} session={session} openAuth={() => setAuthOpen(true)} />}
        {page === "browse" && <section className="content-section">
          <div className="section-heading"><div><p className="eyebrow">RESOURCE LIBRARY</p><h1>Find your next <em>breakthrough.</em></h1><p className="muted">Search question papers, memorandums and study notes for Grades 10–12.</p></div><span className="count-pill">{resources.length} resources</span></div>
          <div className="filter-bar"><div className="search-field"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subject, year or paper..."/></div>
            <select value={grade} onChange={e=>setGrade(e.target.value)}><option>All</option>{GRADES.map(g=><option key={g} value={g}>Grade {g}</option>)}</select>
            <select value={subject} onChange={e=>setSubject(e.target.value)}><option>All</option>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select>
            <select value={type} onChange={e=>setType(e.target.value)}><option>All</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          </div>
          <div className="resource-grid">{filtered.map(r=><ResourceCard key={r.id} resource={r} onOpen={()=>openResource(r)}/>)}</div>
          {filtered.length===0 && <div className="empty"><FileText size={34}/><h3>No resources found</h3><p>Try changing your search or filters.</p></div>}
          {!session && <div className="locked-banner"><LockKeyhole/><div><b>Join StudyHub SA to access the full library</b><p>Create a free learner account to open and download resources.</p></div><button className="primary-btn" onClick={()=>{setAuthMode("signup");setAuthOpen(true)}}>Create free account</button></div>}
        </section>}
        {page === "dashboard" && <section className="content-section"><p className="eyebrow">YOUR SPACE</p><h1>Welcome back, <em>{profile?.full_name?.split(" ")[0] || "learner"}.</em></h1><p className="muted">Your study resources, all in one place.</p><div className="stats-grid"><Stat label="Available resources" value={resources.length} icon={<FileText/>}/><Stat label="Subjects" value={SUBJECTS.length} icon={<BookOpen/>}/><Stat label="Your grade range" value="10–12" icon={<GraduationCap/>}/></div><h2 className="subheading">Recently added resources</h2><div className="resource-grid">{resources.slice(0,4).map(r=><ResourceCard key={r.id} resource={r} onOpen={()=>openResource(r)}/>)}</div></section>}
        {page === "upload" && isAdmin && <section className="content-section narrow"><p className="eyebrow">ADMINISTRATION</p><h1>Upload a <em>resource.</em></h1><p className="muted">Add a PDF question paper, memorandum or set of notes to the learner library.</p><form className="upload-form" onSubmit={uploadResource}>
          <label>Resource title<input name="title" required placeholder="e.g. Mathematics Paper 1"/></label>
          <div className="form-row"><label>Subject<select name="subject" required>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></label><label>Grade<select name="grade" required>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></label></div>
          <div className="form-row"><label>Year<input name="year" type="number" min="2000" max="2100" defaultValue="2025" required/></label><label>Term<select name="term">{["Term 1","Term 2","Term 3","Term 4","Final exams"].map(t=><option key={t}>{t}</option>)}</select></label></div>
          <label>Resource type<select name="type">{TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Description<textarea name="description" rows="3" placeholder="Short description (optional)"/></label>
          <label className="file-drop"><Upload size={25}/><b>Select a PDF file</b><span>PDF only · Maximum file size depends on your Supabase storage settings</span><input type="file" name="file" accept="application/pdf" required/></label>
          <button className="primary-btn full" disabled={busy}>{busy ? "Uploading..." : "Publish resource"}</button>
        </form></section>}
        {page === "upload" && !isAdmin && <section className="content-section"><h1>Admin access required</h1><p className="muted">Only approved administrators can upload resources.</p></section>}
      </main>

      <footer><div className="footer-brand"><GraduationCap/> <b>StudyHub SA</b></div><p>Helping South African learners prepare with confidence.</p><span>© {new Date().getFullYear()} StudyHub SA</span></footer>

      {authOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="auth-modal"><button className="modal-close" onClick={()=>setAuthOpen(false)}><X/></button><div className="modal-logo"><GraduationCap size={28}/></div><p className="eyebrow">YOUR STUDY JOURNEY STARTS HERE</p><h2>{authMode==="signin" ? "Welcome back." : "Create your account."}</h2><p className="muted">{authMode==="signin" ? "Sign in to access your learning resources." : "Join the StudyHub SA learner community."}</p>
        <form onSubmit={handleAuth} className="auth-form">{authMode==="signup" && <label>Full name<input name="full_name" placeholder="Your full name" required/></label>}<label>Email address<input name="email" type="email" placeholder="you@example.com" required/></label><label>Password<input name="password" type="password" minLength="6" placeholder="At least 6 characters" required/></label><button className="primary-btn full" disabled={busy}>{busy ? "Please wait..." : authMode==="signin" ? "Sign in" : "Create account"}</button></form>
        <p className="switch-auth">{authMode==="signin" ? "New to StudyHub SA?" : "Already have an account?"} <button onClick={()=>setAuthMode(authMode==="signin"?"signup":"signin")}>{authMode==="signin"?"Create an account":"Sign in"}</button></p>
        {!isSupabaseConfigured && <p className="setup-hint">Setup required: connect your Supabase project using the .env file.</p>}
      </div></div>}
    </div>
  );
}

function Home({setPage,setSearch,resources,session,openAuth}) {
  return <><section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot"/> YOUR FUTURE, YOUR WAY</p><h1>Your next chapter<br/>starts with <em>preparation.</em></h1><p className="hero-text">Past papers, memorandums and study notes for South African learners in Grades 10 to 12. Everything you need to study smarter.</p>
    <div className="hero-search"><Search size={20}/><input placeholder="Search subject, grade or year..." onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")setPage("browse")}}/><button onClick={()=>setPage("browse")}>Search papers</button></div>
    <div className="grade-chips">{GRADES.map(g=><button key={g} onClick={()=>{setSearch("");setPage("browse")}}>Grade {g} <span>↗</span></button>)}</div>
    <div className="hero-benefits"><div><CheckCircle2/><span>Exam-focused resources</span></div><div><ShieldCheck/><span>Organised by subject</span></div><div><BookOpen/><span>Learn at your pace</span></div></div>
  </div><div className="hero-feature"><div className="feature-top"><span className="eyebrow">STUDY SMARTER</span><span className="live-pill"><i/> RESOURCE HUB</span></div><h2>Make every<br/>study session count.</h2><p>Find the right paper. Practise with purpose. Check your memo. Improve every day.</p><div className="feature-graphic"><div className="paper paper-back"><span>STUDY NOTES</span><div/><div/><div/></div><div className="paper paper-front"><span>EXAM PREP</span><b>GRADE 12</b><div className="paper-line"/><div className="paper-line short"/><div className="paper-stamp"><CheckCircle2/></div></div><div className="feature-orbit"/></div><div className="feature-bottom"><span><b>{resources.length}+</b> resources listed</span><span><b>5</b> core subjects</span></div></div></section>
  <section className="subjects-section"><div className="section-heading"><div><p className="eyebrow">EXPLORE THE LIBRARY</p><h2>Choose your <em>subject.</em></h2></div><button className="text-link" onClick={()=>setPage("browse")}>View all resources ↗</button></div><div className="subject-grid">{SUBJECTS.map((s,i)=><button className="subject-card" key={s} onClick={()=>{setSearch(s);setPage("browse")}}><span className={`subject-icon icon-${i}`}>{["∑","％","⚛","R","✳"][i]}</span><span><b>{s}</b><small>Grades 10–12</small></span><span className="subject-arrow">↗</span></button>)}</div></section>
  <section className="bottom-cta"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Small steps today.<br/><em>Big results tomorrow.</em></h2><p>Sign in or create your free account to start using the resource library.</p></div><button className="primary-btn" onClick={session?()=>setPage("browse"):openAuth}>{session?"Browse resources":"Get started for free"} ↗</button></section>
  </>;
}

function ResourceCard({resource:r,onOpen}) {
  const colors = {"Mathematics":"orange","Mathematical Literacy":"purple","Physical Sciences":"blue","Accounting":"green","Life Sciences":"pink"};
  return <article className="resource-card"><div className="resource-card-top"><span className={`subject-tag ${colors[r.subject]||"orange"}`}>{r.subject}</span><span className="grade-tag">Grade {r.grade}</span></div><div className="resource-file-icon"><FileText size={22}/></div><h3>{r.title}</h3><p>{r.description || "Learning resource uploaded for exam preparation."}</p><div className="resource-meta"><span>{r.year || "—"}</span><span>{r.term || "All terms"}</span><span>{r.type}</span></div><button className="open-resource" onClick={onOpen}><span>{r.file_path?"Open resource":"View resource"}</span>{r.file_path?<Download size={16}/>:<LockKeyhole size={16}/>}</button></article>;
}
function Stat({label,value,icon}) {return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div>}

export default App;
