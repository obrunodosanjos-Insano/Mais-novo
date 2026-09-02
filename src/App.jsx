import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Library, LogOut, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const emptyForm = {
  title: '', author: '', category: '', isbn: '', publisher: '', year: '', pages: '',
  status: 'Não lido', shelf: '', notes: ''
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bxizwvofwketeyorpucu.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_a6Sxr9eDmZfAJuC81UCkgA_XfImPF3L'
const supabase = createClient(supabaseUrl, supabaseKey)
const BOOKS_METADATA_KEY = 'library_books'
const GUEST_BOOKS_KEY = 'library_guest_books'

function readBooks(user) {
  const value = user?.user_metadata?.[BOOKS_METADATA_KEY]
  return Array.isArray(value) ? value : []
}

function readGuestBooks() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_BOOKS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [guest, setGuest] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [books, setBooks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      const nextUser = error ? null : data.user
      setUser(nextUser)
      setBooks(readBooks(nextUser))
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (guest) return
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setBooks(readBooks(nextUser))
      setAuthLoading(false)
      if (!nextUser) setMessage('')
    })

    return () => listener.subscription.unsubscribe()
  }, [guest])

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthMessage('')
    setAuthSubmitting(true)

    const email = authEmail.trim()
    const password = authPassword

    if (authMode === 'signup') {
      if (!authName.trim()) {
        setAuthMessage('Informe seu nome.')
        setAuthSubmitting(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: authName.trim(), [BOOKS_METADATA_KEY]: [] } }
      })

      if (error) {
        setAuthMessage(error.message)
      } else if (data.session && data.user) {
        setUser(data.user)
        setBooks(readBooks(data.user))
      } else {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (!loginError && loginData.user) {
          setUser(loginData.user)
          setBooks(readBooks(loginData.user))
        } else {
          setAuthMessage('A conta foi criada, mas o Supabase ainda está exigindo confirmação de e-mail nas configurações do projeto.')
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthMessage(error.message)
      else if (data.user) {
        setGuest(false)
        setUser(data.user)
        setBooks(readBooks(data.user))
      }
    }

    setAuthSubmitting(false)
  }

  function enterAsGuest() {
    setGuest(true)
    setUser(null)
    setBooks(readGuestBooks())
    setAuthMessage('')
    setMessage('')
  }

  async function signOut() {
    if (!guest) await supabase.auth.signOut()
    setGuest(false)
    setUser(null)
    setBooks([])
    setAuthEmail('')
    setAuthPassword('')
    setAuthMessage('')
    setMessage('')
  }

  async function persistBooks(nextBooks) {
    setSaving(true)
    setMessage('')

    if (guest) {
      try {
        localStorage.setItem(GUEST_BOOKS_KEY, JSON.stringify(nextBooks))
        setBooks(nextBooks)
        setSaving(false)
        return true
      } catch {
        setMessage('Não foi possível salvar os livros neste navegador.')
        setSaving(false)
        return false
      }
    }

    if (!user) {
      setSaving(false)
      return false
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, [BOOKS_METADATA_KEY]: nextBooks }
    })

    setSaving(false)
    if (error) {
      setMessage(`Não foi possível salvar no Supabase: ${error.message}`)
      return false
    }

    if (data.user) setUser(data.user)
    setBooks(nextBooks)
    return true
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
    setModalOpen(true)
  }

  function openEdit(book) {
    setEditingId(book.id)
    setForm({
      title: book.title,
      author: book.author,
      category: book.category || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      year: book.year || '',
      pages: book.pages || '',
      status: book.status,
      shelf: book.shelf || '',
      notes: book.notes || ''
    })
    setMessage('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user && !guest) return
    if (!form.title.trim() || !form.author.trim()) {
      setMessage('Informe título e autor.')
      return
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category?.trim() || null,
      isbn: form.isbn?.trim() || null,
      publisher: form.publisher?.trim() || null,
      year: form.year ? Number(form.year) : null,
      pages: form.pages ? Number(form.pages) : null,
      status: form.status,
      shelf: form.shelf?.trim() || null,
      notes: form.notes?.trim() || null
    }

    const nextBooks = editingId
      ? books.map((book) => book.id === editingId ? { ...book, ...payload } : book)
      : [{ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...payload }, ...books]

    const saved = await persistBooks(nextBooks)
    if (!saved) return

    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function removeBook(book) {
    if (!confirm(`Excluir “${book.title}”?`)) return
    await persistBooks(books.filter((item) => item.id !== book.id))
  }

  const filteredBooks = useMemo(() => {
    const term = search.toLowerCase().trim()
    return books.filter((book) => {
      const matchesSearch = !term || [book.title, book.author, book.category, book.isbn]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
      const matchesFilter = filter === 'Todos' || book.status === filter
      return matchesSearch && matchesFilter
    })
  }, [books, search, filter])

  const stats = {
    total: books.length,
    read: books.filter((book) => book.status === 'Lido').length,
    reading: books.filter((book) => book.status === 'Lendo').length,
    unread: books.filter((book) => book.status === 'Não lido').length
  }

  if (authLoading) {
    return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><Library size={28}/></div><p>Carregando...</p></div></div>
  }

  if (!user && !guest) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="auth-logo"><Library size={28}/></div>
          <p className="eyebrow dark">MINHA BIBLIOTECA</p>
          <h1>{authMode === 'login' ? 'Entre na sua estante' : 'Crie sua biblioteca'}</h1>
          <p className="auth-subtitle">Entre na sua conta para sincronizar seu acervo ou continue como visitante sem fazer login.</p>

          <div className="auth-tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthMessage('') }}>Entrar</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthMessage('') }}>Criar conta</button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && <label>Seu nome<input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Como você quer aparecer" required /></label>}
            <label>E-mail<input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="voce@email.com" required /></label>
            <label>Senha<input type="password" minLength={6} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" required /></label>
            {authMessage && <div className="auth-message">{authMessage}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={authSubmitting}>{authSubmitting ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Criar minha conta'}</button>
            <button className="secondary-button auth-submit" type="button" onClick={enterAsGuest}>Entrar sem fazer login</button>
          </form>
        </section>
      </div>
    )
  }

  const displayName = guest ? 'Visitante' : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Leitor')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><Library size={24}/></div><div><strong>Minha Biblioteca</strong><span>Seu acervo de casa, organizado</span></div></div>
        <div className="top-actions">
          <div className="profile-chip"><UserRound size={18}/><div><strong>{displayName}</strong><span>{guest ? 'Modo visitante' : user?.email}</span></div></div>
          <button className="secondary-button logout-button" onClick={() => void signOut()}><LogOut size={17}/> {guest ? 'Voltar' : 'Sair'}</button>
          <button className="primary-button" onClick={openCreate}><Plus size={18}/> Adicionar livro</button>
        </div>
      </header>

      <main className="content">
        <section className="hero"><div><p className="eyebrow">ACERVO PESSOAL</p><h1>Olá, {displayName}. Sua biblioteca é só sua.</h1><p>{guest ? 'Você está usando o modo visitante. Seus livros ficam salvos apenas neste navegador.' : 'Cadastre, encontre e acompanhe tudo o que você tem em casa. Seus livros ficam vinculados à sua conta no Supabase.'}</p></div><BookOpen size={108} strokeWidth={1.15}/></section>

        <div className="notice success-notice">{guest ? 'Modo visitante • dados salvos somente neste navegador' : 'Conta conectada ao Supabase • biblioteca privada por usuário'}</div>
        {message && <div className="notice error-notice">{message}</div>}

        <section className="stats-grid">
          <article><span>Total</span><strong>{stats.total}</strong></article>
          <article><span>Lidos</span><strong>{stats.read}</strong></article>
          <article><span>Lendo</span><strong>{stats.reading}</strong></article>
          <article><span>Não lidos</span><strong>{stats.unread}</strong></article>
        </section>

        <section className="toolbar">
          <label className="search-box"><Search size={18}/><input placeholder="Buscar por título, autor, categoria ou ISBN" value={search} onChange={(e)=>setSearch(e.target.value)}/></label>
          <select value={filter} onChange={(e)=>setFilter(e.target.value)}><option>Todos</option><option>Não lido</option><option>Lendo</option><option>Lido</option></select>
        </section>

        {filteredBooks.length === 0 ? (
          <div className="empty-state"><BookOpen size={44}/><h2>{books.length ? 'Nenhum livro encontrado' : 'Sua estante ainda está vazia'}</h2><p>{books.length ? 'Tente outra busca ou filtro.' : 'Cadastre o primeiro livro da sua coleção.'}</p>{!books.length && <button className="primary-button" onClick={openCreate}><Plus size={18}/> Cadastrar primeiro livro</button>}</div>
        ) : (
          <section className="books-grid">{filteredBooks.map((book)=><article className="book-card" key={book.id}><div className="book-spine"><BookOpen size={28}/></div><div className="book-body"><div className="book-topline"><span className="status">{book.status}</span>{book.shelf && <span>{book.shelf}</span>}</div><h2>{book.title}</h2><p className="author">{book.author}</p><div className="meta">{book.category && <span>{book.category}</span>}{book.year && <span>{book.year}</span>}{book.pages && <span>{book.pages} págs.</span>}</div>{book.notes && <p className="notes">{book.notes}</p>}<div className="card-actions"><button onClick={()=>openEdit(book)}><Pencil size={16}/>Editar</button><button className="danger" onClick={()=>void removeBook(book)}><Trash2 size={16}/>Excluir</button></div></div></article>)}</section>
        )}
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(e)=>e.target===e.currentTarget && setModalOpen(false)}><section className="modal"><div className="modal-header"><div><span>{editingId ? 'EDITAR LIVRO' : 'NOVO LIVRO'}</span><h2>{editingId ? 'Atualize os dados' : 'Cadastre na sua estante'}</h2></div><button className="icon-button" onClick={()=>setModalOpen(false)}><X size={20}/></button></div><form onSubmit={handleSubmit}><div className="form-grid"><label className="wide">Título *<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required/></label><label>Autor *<input value={form.author} onChange={(e)=>setForm({...form,author:e.target.value})} required/></label><label>Categoria<input value={form.category || ''} onChange={(e)=>setForm({...form,category:e.target.value})}/></label><label>ISBN<input value={form.isbn || ''} onChange={(e)=>setForm({...form,isbn:e.target.value})}/></label><label>Editora<input value={form.publisher || ''} onChange={(e)=>setForm({...form,publisher:e.target.value})}/></label><label>Ano<input type="number" value={form.year} onChange={(e)=>setForm({...form,year:e.target.value})}/></label><label>Páginas<input type="number" value={form.pages} onChange={(e)=>setForm({...form,pages:e.target.value})}/></label><label>Status<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}><option>Não lido</option><option>Lendo</option><option>Lido</option></select></label><label>Estante / local<input value={form.shelf || ''} onChange={(e)=>setForm({...form,shelf:e.target.value})}/></label><label className="wide">Observações<textarea rows={4} value={form.notes || ''} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar livro'}</button></div></form></section></div>}
    </div>
  )
}
