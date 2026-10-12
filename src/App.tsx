import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Activity, Archive, Bell, CheckCircle2, ChevronDown, ChevronRight, Clock3, FilePlus2, FileSearch, FileText, Filter, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, ShieldX, SlidersHorizontal, Sparkles, TrendingUp, Users, X } from 'lucide-react';

type Area = 'administrativa' | 'instrucao_ensino';
type Role = 'administrador' | 'gestor' | 'utilizador';
type Profile = { id: string; full_name: string; area: Area; role: Role; active: boolean };
type Doc = { id: string; document_number: string; document_type: string; subject: string; origin: string; destination: string; document_date: string; status: string; summary: string; created_at: string };

const areaInfo: Record<Area, { title: string; short: string; prefix: string; description: string }> = {
  administrativa: { title: 'Subdirecção Administrativa', short: 'Administrativa', prefix: 'ADM', description: 'Expediente, correspondência e arquivo administrativo' },
  instrucao_ensino: { title: 'Subdirecção de Instrução e Ensino', short: 'Instrução e Ensino', prefix: 'IE', description: 'Expediente pedagógico, cursos e documentação de instrução' },
};
const statuses = ['Todos os estados', 'Recebido', 'Em análise', 'Respondido', 'Arquivado'];
const types = ['Ofício', 'Despacho', 'Informação', 'Relatório', 'Circular', 'Requerimento', 'Memorando', 'Acta', 'Outro'];
const dateLabel = (v: string) => v ? new Date(v + (v.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-AO') : '—';

function EppMark({ size = 48 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  return <div className="brand-mark" style={{ width: size, height: size }}>
    {!failed && <img src="/epp-logo.png" alt="Emblema da EPP" onError={() => setFailed(true)} />}
    {failed && <div className="mark-fallback"><ShieldCheck size={size * .52} strokeWidth={1.7}/><span>EPP</span></div>}
  </div>;
}
function Login({ onSignedIn }: { onSignedIn: (session: Session, profile: Profile) => void }) {
  const [area, setArea] = useState<Area>('administrativa');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!supabase) return;
    setBusy(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data.session) { setError('Credenciais inválidas ou conta sem acesso. Verifique os dados e tente novamente.'); setBusy(false); return; }
    const { data: p, error: profileError } = await supabase.from('profiles').select('id,full_name,area,role,active').eq('id', data.session.user.id).maybeSingle();
    if (profileError || !p || !p.active) { await supabase.auth.signOut(); setError('O seu perfil ainda não está activo. Contacte o administrador do sistema.'); setBusy(false); return; }
    if (p.area !== area) { await supabase.auth.signOut(); setError('Esta conta pertence a outra subdirecção. Seleccione a área correcta para entrar.'); setBusy(false); return; }
    onSignedIn(data.session, p as Profile); setBusy(false);
  }
  return <main className="login-layout">
    <section className="login-visual">
      <div className="visual-top"><EppMark size={58}/><div><strong>ESCOLA PRÁTICA DE POLÍCIA</strong><span>POLÍCIA NACIONAL DE ANGOLA</span></div></div>
      <div className="visual-copy"><span className="eyebrow"><Sparkles size={14}/> PLATAFORMA INSTITUCIONAL</span><h1>Documentos organizados.<br/><em>Decisões seguras.</em></h1><p>Uma gestão documental moderna, rastreável e segura, desenhada para servir as subdirecções da EPP.</p>
        <div className="visual-points"><div><ShieldCheck/><span><b>Confidencialidade por área</b><small>O acesso é validado pela conta e pela base de dados.</small></span></div><div><Activity/><span><b>Rastreabilidade documental</b><small>Numeração sequencial e histórico de operações.</small></span></div></div>
      </div>
      <div className="visual-footer">FORMAÇÃO · PROFISSIONALISMO · APERFEIÇOAMENTO <span>© EPP</span></div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="mobile-brand"><EppMark size={54}/><div><b>ESCOLA PRÁTICA DE POLÍCIA</b><small>Gestão Documental</small></div></div>
        <span className="eyebrow dark">ÁREA RESERVADA</span><h2>Bem-vindo de volta</h2><p className="muted">Escolha a sua subdirecção e introduza as credenciais institucionais.</p>
        {!isSupabaseConfigured && <div className="notice warning"><ShieldX size={18}/><div><b>Ligação à base de dados por configurar</b><span>Defina as variáveis do Supabase e aplique a migração SQL antes de autenticar utilizadores.</span></div></div>}
        <div className="area-picker" role="group" aria-label="Seleccionar subdirecção">
          <button className={area === 'administrativa' ? 'area-option selected' : 'area-option'} onClick={() => {setArea('administrativa');setError('');}} type="button"><span className="area-icon navy"><FileText/></span><span><b>Administrativa</b><small>Expediente e arquivo</small></span>{area === 'administrativa' && <CheckCircle2 className="chosen"/>}</button>
          <button className={area === 'instrucao_ensino' ? 'area-option selected' : 'area-option'} onClick={() => {setArea('instrucao_ensino');setError('');}} type="button"><span className="area-icon gold"><GraduationCap/></span><span><b>Instrução e Ensino</b><small>Documentação pedagógica</small></span>{area === 'instrucao_ensino' && <CheckCircle2 className="chosen"/>}</button>
        </div>
        <form onSubmit={submit} className="login-form"><label htmlFor="email">E-mail institucional</label><div className="field-wrap"><Users size={18}/><input id="email" type="email" autoComplete="username" placeholder="nome@instituicao.ao" value={email} onChange={e => setEmail(e.target.value)} required/></div><label htmlFor="password">Palavra-passe</label><div className="field-wrap"><ShieldCheck size={18}/><input id="password" type="password" autoComplete="current-password" placeholder="Introduza a sua palavra-passe" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/></div>
          {error && <div className="form-error"><ShieldX size={17}/>{error}</div>}<button className="primary-button login-submit" disabled={busy || !isSupabaseConfigured}>{busy ? <span className="spinner"/> : null}{busy ? 'A verificar credenciais…' : 'Entrar na plataforma'}<ChevronRight size={18}/></button>
        </form>
        <div className="login-security"><ShieldCheck size={16}/><span>Acesso protegido · Sessão autenticada · Áreas isoladas</span></div>
      </div>
      <div className="login-bottom">Em caso de dificuldade de acesso, contacte o administrador da sua subdirecção.</div>
    </section>
  </main>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [page, setPage] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos os estados');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [form, setForm] = useState({document_type:'Ofício',subject:'',origin:'',destination:'',document_date:new Date().toISOString().slice(0,10),status:'Recebido',summary:''});

  const loadDocs = useCallback(async () => {
    if (!supabase || !profile) return;
    const { data, error } = await supabase.from('documents').select('id,document_number,document_type,subject,origin,destination,document_date,status,summary,created_at').order('created_at',{ascending:false}).limit(500);
    if (error) { setNotice('Não foi possível carregar os documentos. Verifique a migração e as permissões.'); return; }
    setDocs((data ?? []) as Doc[]);
  }, [profile]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(async ({data}) => {
      if (!active) return;
      const s = data.session;
      if (s) {
        const {data:p} = await supabase.from('profiles').select('id,full_name,area,role,active').eq('id',s.user.id).maybeSingle();
        if (p?.active) { setSession(s); setProfile(p as Profile); }
        else await supabase.auth.signOut();
      }
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => { if (!s) {setSession(null);setProfile(null);setDocs([]);} });
    return () => {active=false;subscription.unsubscribe();};
  }, []);
  useEffect(() => { if (profile) void loadDocs(); }, [profile, loadDocs]);

  const filtered = useMemo(() => docs.filter(d => {
    const q = query.toLocaleLowerCase('pt-AO');
    const matches = !q || [d.document_number,d.subject,d.document_type,d.origin,d.destination].some(v => (v || '').toLocaleLowerCase('pt-AO').includes(q));
    return matches && (statusFilter === 'Todos os estados' || d.status === statusFilter);
  }), [docs,query,statusFilter]);
  const stats = useMemo(() => ({total:docs.length,pending:docs.filter(d=>d.status==='Em análise').length,received:docs.filter(d=>d.status==='Recebido').length,archived:docs.filter(d=>d.status==='Arquivado').length,answered:docs.filter(d=>d.status==='Respondido').length}),[docs]);
  const byMonth = useMemo(() => Array.from({length:6},(_,i) => {const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(5-i));const key=date.toISOString().slice(0,7);return {label:date.toLocaleDateString('pt-AO',{month:'short'}).replace('.',''),count:docs.filter(d=>d.document_date?.slice(0,7)===key).length};}),[docs]);
  async function logout() { if (supabase) await supabase.auth.signOut(); setSession(null);setProfile(null);setDocs([]);setPage('dashboard'); }
  async function createDocument(e: FormEvent) {
    e.preventDefault(); if (!supabase || !profile) return; setBusy(true);setNotice('');
    const {error} = await supabase.from('documents').insert({...form,area:profile.area,created_by:profile.id,updated_by:profile.id});
    if (error) setNotice(error.message.includes('Sem permissão') ? 'Sem permissão para registar documentos nesta área.' : 'Falha ao registar documento. Confirme a migração e tente novamente.');
    else {setNotice('Documento registado com numeração automática.');setShowCreate(false);setForm({document_type:'Ofício',subject:'',origin:'',destination:'',document_date:new Date().toISOString().slice(0,10),status:'Recebido',summary:''});await loadDocs();}
    setBusy(false);
  }
  if (loading) return <div className="loading-screen"><EppMark size={54}/><span className="spinner"/><p>A validar sessão institucional…</p></div>;
  if (!session || !profile) return <Login onSignedIn={(s,p)=>{setSession(s);setProfile(p);setPage('dashboard');}}/>;
  const area = areaInfo[profile.area];
  const nav = [{id:'dashboard',label:'Painel geral',icon:LayoutDashboard},{id:'documents',label:'Documentos',icon:FileText},{id:'archive',label:'Arquivo',icon:Archive}];
  const visibleDocs = page === 'archive' ? filtered.filter(d=>d.status==='Arquivado') : page === 'documents' ? filtered.filter(d=>d.status!=='Arquivado') : filtered.slice(0,6);
  const pageTitle = page==='dashboard'?'Painel de controlo':page==='archive'?'Arquivo documental':'Gestão de documentos';
  return <div className="app-shell">
    <aside className={mobileNav?'sidebar mobile-open':'sidebar'}><div className="sidebar-brand"><EppMark size={45}/><div><b>ESCOLA PRÁTICA</b><span>DE POLÍCIA · EPP</span></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="sidebar-area"><span className="area-dot"/><div><small>ÁREA ACTIVA</small><b>{area.short}</b></div><ChevronDown size={15}/></div>
      <div className="nav-label">ESPAÇO DE TRABALHO</div><nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={page===n.id?'nav-item active':'nav-item'} onClick={()=>{setPage(n.id);setMobileNav(false);}}><Icon size={19}/><span>{n.label}</span>{n.id==='documents'&&<span className="nav-count">{stats.total}</span>}</button>;})}</nav>
      <div className="sidebar-bottom"><div className="secure-card"><ShieldCheck size={19}/><b>Área protegida</b><p>Os documentos apresentados pertencem apenas à sua subdirecção.</p><span><i/> Ligação autenticada</span></div><div className="profile-card"><div className="avatar">{(profile.full_name||session.user.email||'U').slice(0,1).toUpperCase()}</div><div className="profile-info"><b>{profile.full_name||'Utilizador EPP'}</b><small>{profile.role} · {profile.area==='administrativa'?'Administrativa':'Instrução e Ensino'}</small></div><button className="icon-button" onClick={logout} title="Terminar sessão"><LogOut size={18}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Fechar menu"/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-toggle" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumbs">EPP <ChevronRight size={13}/> <span>{area.short}</span></div></div><div className="topbar-right"><span className="today"><Clock3 size={15}/>{new Date().toLocaleDateString('pt-AO',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</span><span className="top-divider"/><button className="icon-button notification" title="Notificações"><Bell size={18}/><i/></button><div className="top-user"><div className="avatar small">{(profile.full_name||session.user.email||'U').slice(0,1).toUpperCase()}</div><span>{profile.full_name||session.user.email}</span></div></div></header>
      <div className="content-area"><div className="page-heading"><div><div className="eyebrow dark">GESTÃO DOCUMENTAL / {area.prefix}</div><h1>{pageTitle}</h1><p>{area.description}.</p></div><div className="heading-actions"><button className="secondary-button" onClick={()=>void loadDocs()}><Activity size={16}/> Actualizar</button><button className="primary-button" onClick={()=>setShowCreate(true)}><Plus size={17}/> Novo documento</button></div></div>
        {notice&&<div className="notice info"><Activity size={18}/><span>{notice}</span><button className="icon-button" onClick={()=>setNotice('')}><X size={16}/></button></div>}
        {page==='dashboard'&&<><section className="welcome-banner"><div className="welcome-content"><span className="welcome-kicker"><Sparkles size={14}/> VISÃO GERAL DA SUBDIRECÇÃO</span><h2>Bom trabalho, {profile.full_name.split(' ')[0]||'equipa'}.</h2><p>Acompanhe o estado do expediente e mantenha todos os registos sob controlo.</p><button onClick={()=>setPage('documents')} className="banner-link">Consultar documentos <ChevronRight size={16}/></button></div><div className="banner-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-document"><FileText size={48}/><span>DOC</span></div><div className="art-check"><CheckCircle2 size={21}/></div></div></section>
          <section className="stats-grid"><StatCard label="Total de documentos" value={stats.total} caption="Registos nesta subdirecção" icon={FileText} tone="blue" trend="Acumulado"/><StatCard label="Em análise" value={stats.pending} caption="Aguardam acompanhamento" icon={Clock3} tone="amber" trend="Pendente"/><StatCard label="Recebidos" value={stats.received} caption="Entradas registadas" icon={FileSearch} tone="violet" trend="Entrada"/><StatCard label="Respondidos" value={stats.answered} caption="Tratamento concluído" icon={CheckCircle2} tone="green" trend="Concluído"/></section>
          <section className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Movimento documental</h3><p>Registos por mês · últimos seis meses</p></div><span className="period-chip">6 meses <ChevronDown size={13}/></span></div><div className="chart-summary"><strong>{stats.total}</strong><span>documentos no total</span><span className="chart-legend"><i/> Documentos</span></div><div className="bar-chart">{byMonth.map(m=><div className="bar-group" key={m.label}><div className="bar-track"><div className="bar-fill" style={{height:(m.count?Math.max(8,m.count/Math.max(1,...byMonth.map(x=>x.count))*100):3)+'%'}} title={String(m.count)} /></div><span className="bar-count">{m.count}</span><small>{m.label}</small></div>)}</div></div>
            <div className="panel status-panel"><div className="panel-heading"><div><h3>Estado do expediente</h3><p>Distribuição actual</p></div><SlidersHorizontal size={17} className="subtle-icon"/></div><div className="status-total"><strong>{stats.total}</strong><span>documentos registados</span></div><StatusRow label="Recebidos" count={stats.received} total={stats.total} color="blue"/><StatusRow label="Em análise" count={stats.pending} total={stats.total} color="amber"/><StatusRow label="Respondidos" count={stats.answered} total={stats.total} color="green"/><StatusRow label="Arquivados" count={stats.archived} total={stats.total} color="slate"/></div></section>
          <section className="panel recent-panel"><div className="panel-heading"><div><h3>Documentos recentes</h3><p>Últimos registos efectuados nesta área</p></div><button className="text-button" onClick={()=>setPage('documents')}>Ver todos <ChevronRight size={15}/></button></div><DocumentTable docs={visibleDocs} onOpen={d=>{setQuery(d.document_number);setPage('documents');}} empty="Ainda não existem documentos registados nesta área."/></section>
        </>}
        {page!=='dashboard'&&<section className="panel documents-panel"><div className="filters-row"><div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar número, assunto, tipo ou origem…"/>{query&&<button className="icon-button" onClick={()=>setQuery('')}><X size={15}/></button>}</div><label className="status-filter"><Filter size={16}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><button className="secondary-button" onClick={()=>{setQuery('');setStatusFilter('Todos os estados');}}><X size={15}/> Limpar</button></div><div className="table-meta"><span>{filtered.length} resultado(s)</span><span><ShieldCheck size={14}/> Acesso restrito a {area.short}</span></div><DocumentTable docs={visibleDocs} onOpen={d=>setNotice('Documento seleccionado: '+d.document_number+' — '+d.subject)} empty="Não foram encontrados documentos com estes filtros."/></section>}
        <footer className="app-footer"><span>ESCOLA PRÁTICA DE POLÍCIA · POLÍCIA NACIONAL DE ANGOLA</span><span><ShieldCheck size={14}/> Sistema de gestão documental</span></footer>
      </div>
    </main>
    {showCreate&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-heading"><div className="modal-icon"><FilePlus2 size={22}/></div><div><h2 id="create-title">Registar documento</h2><p>A numeração é atribuída automaticamente à área {area.short}.</p></div><button className="icon-button" onClick={()=>setShowCreate(false)}><X/></button></div><form className="document-form" onSubmit={createDocument}><div className="number-preview"><span>NÚMERO A ATRIBUIR PELO SISTEMA</span><b>{area.prefix}/{new Date(form.document_date+'T12:00:00').getFullYear()}/••••</b><small>O número definitivo será gerado de forma atómica ao guardar.</small></div><div className="form-grid"><div className="form-field"><label>Tipo de documento *</label><select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></div><div className="form-field"><label>Data do documento *</label><input type="date" value={form.document_date} onChange={e=>setForm({...form,document_date:e.target.value})} required/></div><div className="form-field full"><label>Assunto *</label><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Assunto principal do documento" required maxLength={240}/></div><div className="form-field"><label>Origem / remetente</label><input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})} placeholder="Entidade ou departamento"/></div><div className="form-field"><label>Destino / destinatário</label><input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} placeholder="Entidade ou departamento"/></div><div className="form-field"><label>Estado inicial</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.slice(1).map(s=><option key={s}>{s}</option>)}</select></div><div className="form-field full"><label>Observações</label><textarea rows={3} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Notas complementares (opcional)" maxLength={2000}/></div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowCreate(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={busy||!form.subject.trim()}>{busy?<span className="spinner"/>:<Plus size={17}/>} {busy?'A guardar…':'Registar documento'}</button></div></form></section></div>}
  </div>;
}
function StatCard({label,value,caption,icon:Icon,tone,trend}:{label:string;value:number;caption:string;icon:typeof FileText;tone:string;trend:string}) {
 return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={'stat-icon '+tone}><Icon size={19}/></div></div><div className="stat-value">{value.toLocaleString('pt-AO')}</div><div className="stat-bottom"><span>{caption}</span><span className={'stat-trend '+tone}><TrendingUp size={12}/>{trend}</span></div></div>;
}
function StatusRow({label,count,total,color}:{label:string;count:number;total:number;color:string}) {return <div className="status-row"><div><span>{label}</span><b>{count}</b></div><div className="progress-track"><i className={color} style={{width:(total?count/total*100:0)+'%'}}/></div></div>;}
function DocumentTable({docs,onOpen,empty}:{docs:Doc[];onOpen:(doc:Doc)=>void;empty:string}) {
 if (!docs.length) return <div className="empty-state"><div><FileText size={26}/></div><b>Nenhum documento a apresentar</b><p>{empty}</p></div>;
 return <div className="table-scroll"><table className="documents-table"><thead><tr><th>Número / Data</th><th>Assunto</th><th>Tipo</th><th>Origem</th><th>Estado</th><th/></tr></thead><tbody>{docs.map(d=><tr key={d.id} onClick={()=>onOpen(d)}><td><b className="doc-number">{d.document_number}</b><small>{dateLabel(d.document_date)}</small></td><td><span className="subject-cell">{d.subject}</span><small>{d.destination||'Sem destinatário indicado'}</small></td><td><span className="type-pill">{d.document_type}</span></td><td>{d.origin||'—'}</td><td><span className={'status-pill '+d.status.toLowerCase().replace(' ','-')}>{d.status}</span></td><td><button className="row-action" title="Seleccionar documento"><ChevronRight size={17}/></button></td></tr>)}</tbody></table></div>;
}
export default App;
