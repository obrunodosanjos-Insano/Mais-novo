import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Library, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const emptyForm = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  publisher: '',
  year: '',
  pages: '',
  status: 'Não lido',
  shelf: '',
  notes: '',
}

function App() {
  const [books, setBooks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setMessage(`Erro ao carregar livros: ${error.message}`)
    else setBooks(data ?? [])
    setLoading(false)
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
      title: book.title ?? '',
      author: book.author ?? '',
      isbn: book.isbn ?? '',
      category: book.category ?? '',
      publisher: book.publisher ?? '',
      year: book.year ?? '',
      pages: book.pages ?? '',
      status: book.status ?? 'Não lido',
      shelf: book.shelf ?? '',
      notes: book.notes ?? '',
    })
    setMessage('')
    setModalOpen(true)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.author.trim()) {
      setMessage('Informe pelo menos o título e o autor.')
      return
    }
    if (!isSupabaseConfigured) {
      setMessage('Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
      return
    }

    setSaving(true)
    setMessage('')

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      category: form.category.trim() || null,
      publisher: form.publisher.trim() || null,
      year: form.year ? Number(form.year) : null,
      pages: form.pages ? Number(form.pages) : null,
      status: form.status,
      shelf: form.shelf.trim() || null,
      notes: form.notes.trim() || null,
    }

    let result
    if (editingId) {
      result = await supabase.from('books').update(payload).eq('id', editingId).select().single()
    } else {
      result = await supabase.from('books').insert(payload).select().single()
    }

    if (result.error) {
      setMessage(`Não foi possível salvar: ${result.error.message}`)
    } else {
      await loadBooks()
      setModalOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    }
    setSaving(false)
  }

  async function removeBook(book) {
    const confirmed = window.confirm(`Excluir “${book.title}”?`)
    if (!confirmed || !isSupabaseConfigured) return

    const { error } = await supabase.from('books').delete().eq('id', book.id)
    if (error) setMessage(`Não foi possível excluir: ${error.message}`)
    else setBooks((current) => current.filter((item) => item.id !== book.id))
  }

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return books.filter((book) => {
      const matchesTerm = !term || [book.title, book.author, book.category, book.isbn]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
      const matchesStatus = statusFilter === 'Todos' || book.status === statusFilter
      return matchesTerm && matchesStatus
    })
  }, [books, search, statusFilter])

  const stats = useMemo(() => ({
    total: books.length,
    read: books.filter((book) => book.status === 'Lido').length,
    reading: books.filter((book) => book.status === 'Lendo').length,
    unread: books.filter((book) => book.status === 'Não lido').length,
  }), [books])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Library size={24} /></div>
          <div>
            <strong>Minha Biblioteca</strong>
            <span>Seu acervo de casa, organizado</span>
          </div>
        </div>
        <button className="primary-button" onClick={openCreate}><Plus size={18} /> Adicionar livro</button>
      </header>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">ACERVO PESSOAL</p>
            <h1>Todos os seus livros em um só lugar.</h1>
            <p>Cadastre, encontre e acompanhe o que você já leu, está lendo ou ainda quer começar.</p>
          </div>
          <BookOpen className="hero-book" size={112} strokeWidth={1.2} />
        </section>

        {!isSupabaseConfigured && (
          <div className="notice">
            O app está pronto, mas o Supabase ainda não foi configurado neste ambiente. Copie <code>.env.example</code> para <code>.env</code> e preencha as duas variáveis públicas.
          </div>
        )}

        {message && <div className="notice error-notice">{message}</div>}

        <section className="stats-grid">
          <article><span>Total</span><strong>{stats.total}</strong></article>
          <article><span>Lidos</span><strong>{stats.read}</strong></article>
          <article><span>Lendo</span><strong>{stats.reading}</strong></article>
          <article><span>Não lidos</span><strong>{stats.unread}</strong></article>
        </section>

        <section className="toolbar">
          <label className="search-box">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, autor, categoria ou ISBN" />
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>Todos</option>
            <option>Não lido</option>
            <option>Lendo</option>
            <option>Lido</option>
          </select>
        </section>

        {loading ? (
          <div className="empty-state">Carregando biblioteca...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={42} />
            <h2>{books.length ? 'Nenhum livro encontrado' : 'Sua estante ainda está vazia'}</h2>
            <p>{books.length ? 'Tente mudar a busca ou o filtro.' : 'Comece cadastrando o primeiro livro da sua coleção.'}</p>
            {!books.length && <button className="primary-button" onClick={openCreate}><Plus size={18} /> Cadastrar primeiro livro</button>}
          </div>
        ) : (
          <section className="books-grid">
            {filteredBooks.map((book) => (
              <article className="book-card" key={book.id}>
                <div className="book-spine"><BookOpen size={30} /></div>
                <div className="book-body">
                  <div className="book-topline">
                    <span className={`status ${book.status?.toLowerCase().replace(' ', '-')}`}>{book.status}</span>
                    {book.shelf && <span className="shelf">{book.shelf}</span>}
                  </div>
                  <h2>{book.title}</h2>
                  <p className="author">{book.author}</p>
                  <div className="meta">
                    {book.category && <span>{book.category}</span>}
                    {book.year && <span>{book.year}</span>}
                    {book.pages && <span>{book.pages} págs.</span>}
                  </div>
                  {book.notes && <p className="notes">{book.notes}</p>}
                  <div className="card-actions">
                    <button onClick={() => openEdit(book)}><Pencil size={16} /> Editar</button>
                    <button className="danger" onClick={() => removeBook(book)}><Trash2 size={16} /> Excluir</button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <section className="modal">
            <div className="modal-header">
              <div><span>{editingId ? 'EDITAR LIVRO' : 'NOVO LIVRO'}</span><h2>{editingId ? 'Atualize os dados' : 'Cadastre na sua estante'}</h2></div>
              <button className="icon-button" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="wide">Título *<input name="title" value={form.title} onChange={handleChange} required /></label>
                <label>Autor *<input name="author" value={form.author} onChange={handleChange} required /></label>
                <label>Categoria<input name="category" value={form.category} onChange={handleChange} placeholder="Romance, história..." /></label>
                <label>ISBN<input name="isbn" value={form.isbn} onChange={handleChange} /></label>
                <label>Editora<input name="publisher" value={form.publisher} onChange={handleChange} /></label>
                <label>Ano<input type="number" min="0" max="9999" name="year" value={form.year} onChange={handleChange} /></label>
                <label>Páginas<input type="number" min="1" name="pages" value={form.pages} onChange={handleChange} /></label>
                <label>Status<select name="status" value={form.status} onChange={handleChange}><option>Não lido</option><option>Lendo</option><option>Lido</option></select></label>
                <label>Local / estante<input name="shelf" value={form.shelf} onChange={handleChange} placeholder="Ex.: Estante 2" /></label>
                <label className="wide">Observações<textarea name="notes" value={form.notes} onChange={handleChange} rows="4" /></label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar livro'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
