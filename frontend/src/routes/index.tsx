import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getAllBooks, createBook, updateBook, deleteBook } from "../services/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo de Livros" },
      { name: "description", content: "Explore nosso catálogo curado de livros por gênero, autor e título." },
      { property: "og:title", content: "Catálogo de Livros" },
      { property: "og:description", content: "Explore nosso catálogo curado de livros." },
    ],
  }),
  component: AppWrapper,
});

type Book = {
  _id: string;
  title: string;
  author: string;
  genre: string;
  publicationYear?: number;
  description?: string;
  coverUrl?: string;
};

type SortOption = "title_asc" | "title_desc" | "year_asc" | "year_desc";
type UserRole = "admin" | "visitor" | null;

function AppWrapper() {
  const [loggedUser, setLoggedUser] = useState<UserRole>(null);

  if (!loggedUser) {
    return <LoginScreen onLogin={(role) => setLoggedUser(role)} />;
  }

  return <Catalog userRole={loggedUser} onLogout={() => setLoggedUser(null)} />;
}

function LoginScreen({ onLogin }: { onLogin: (role: "admin" | "visitor") => void }) {
  const [selectedRole, setSelectedRole] = useState<"admin" | "visitor">("visitor");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "admin") {
      if (password === "3bntx3yl") {
        onLogin("admin");
      } else {
        setError("Senha incorreta.");
      }
    } else {
      onLogin("visitor");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="bg-card/80 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-border p-10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Biblioteca</h1>
          <p className="text-sm text-muted-foreground mt-2">Faça login para acessar o catálogo</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Acessar como</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as "admin" | "visitor");
                setError("");
              }}
              className="w-full rounded-lg border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/20 shadow-sm"
            >
              <option value="visitor">Visitante (Apenas visualização)</option>
              <option value="admin">Administrador (Gestão completa)</option>
            </select>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${selectedRole === "admin" ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
            <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              className="w-full rounded-lg border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/20 shadow-sm"
            />
            {error && <p className="text-destructive text-xs mt-2 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 py-3 rounded-lg font-semibold transition-all mt-4"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}

function Catalog({ userRole, onLogout }: { userRole: "admin" | "visitor", onLogout: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [sort, setSort] = useState<SortOption>("title_asc");

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Para diferenciar entre adicionar e editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    genre: "",
    publicationYear: "",
    description: "",
    coverUrl: ""
  });

  const isAdmin = userRole === "admin";

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await getAllBooks();
        setBooks(data);
      } catch (error) {
        console.error("Erro ao buscar livros da API:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const genres = useMemo(() => {
    return ["Todos", ...Array.from(new Set(books.map((b) => b.genre)))];
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return books.filter((b) => {
      const matchesQ = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
      const matchesG = genre === "Todos" || b.genre === genre;
      return matchesQ && matchesG;
    }).sort((a, b) => {
      if (sort === "title_asc") return a.title.localeCompare(b.title);
      if (sort === "title_desc") return b.title.localeCompare(a.title);
      
      const yearA = a.publicationYear || 0;
      const yearB = b.publicationYear || 0;
      
      if (sort === "year_asc") return yearA - yearB;
      if (sort === "year_desc") return yearB - yearA;
      
      return 0;
    });
  }, [books, query, genre, sort]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: "", author: "", genre: "", publicationYear: "", description: "", coverUrl: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingId(book._id);
    setFormData({
      title: book.title,
      author: book.author,
      genre: book.genre,
      publicationYear: book.publicationYear ? String(book.publicationYear) : "",
      description: book.description || "",
      coverUrl: book.coverUrl || ""
    });
    setIsModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const bookPayload = {
        ...formData,
        publicationYear: formData.publicationYear ? parseInt(formData.publicationYear) : undefined
      };
      
      if (editingId) {
        const updatedBook = await updateBook(editingId, bookPayload);
        setBooks((prev) => prev.map(b => b._id === editingId ? updatedBook : b));
      } else {
        const createdBook = await createBook(bookPayload);
        setBooks((prev) => [createdBook, ...prev]);
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar livro:", error);
      alert("Houve um erro ao tentar salvar o livro. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!editingId) return;
    
    if (!window.confirm("Tem certeza que deseja excluir este livro?")) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await deleteBook(editingId);
      setBooks((prev) => prev.filter(b => b._id !== editingId));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
      alert("Houve um erro ao tentar excluir o livro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-6 py-6 md:py-10 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Sua Coleção</span>
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                {isAdmin ? "Admin" : "Visitante"}
              </span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
              Catálogo de Livros
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Explore nossa coleção de livros armazenada no MongoDB. Filtre por gênero, busque por título
              ou autor.
            </p>
          </div>
          <button 
            onClick={onLogout}
            className="self-start md:self-auto flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-md hover:bg-destructive/10"
          >
            Sair
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className={`mb-8 grid gap-4 ${isAdmin ? 'md:grid-cols-[1fr_auto_auto_auto]' : 'md:grid-cols-[1fr_auto_auto]'}`}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou autor…"
            className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm text-card-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-md border border-input bg-card px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="title_asc">Título (A-Z)</option>
            <option value="title_desc">Título (Z-A)</option>
            <option value="year_asc">Ano (Crescente)</option>
            <option value="year_desc">Ano (Decrescente)</option>
          </select>
          {isAdmin && (
            <button 
              onClick={openAddModal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              + Adicionar Livro
            </button>
          )}
        </section>

        <p className="mb-6 font-mono text-xs text-muted-foreground">
          {loading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "livro encontrado" : "livros encontrados"}`}
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center p-12">
            <p className="font-serif text-lg text-muted-foreground">Conectando ao MongoDB...</p>
          </div>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((book, index) => (
              <article
                key={book._id}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 relative overflow-hidden"
              >
                {isAdmin && (
                  <button 
                    onClick={() => openEditModal(book)}
                    className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-semibold shadow-sm transform translate-y-2 group-hover:translate-y-0"
                    title="Editar Livro"
                  >
                    Editar
                  </button>
                )}

                <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted overflow-hidden relative shadow-inner">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={`Capa do livro ${book.title}`} className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div
                      className="flex h-36 w-28 items-center justify-center rounded-md font-serif text-3xl font-bold text-primary-foreground shadow-md transition-transform duration-500 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, var(--chart-${(index % 5) + 1}), var(--primary))`,
                      }}
                    >
                      {book.title.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">
                    {book.genre}
                  </span>
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{book.publicationYear || "N/A"}</span>
                </div>

                <h2 className="mt-4 font-serif text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {book.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">por {book.author}</p>

                <p className="mt-4 line-clamp-3 text-sm text-foreground/70 leading-relaxed">{book.description}</p>
              </article>
            ))}
          </section>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl opacity-50">🔍</span>
            </div>
            <p className="font-serif text-xl font-medium">Nenhum livro encontrado.</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Não conseguimos localizar nenhum livro com os filtros atuais. Tente buscar por outros termos.</p>
          </div>
        )}
      </main>

      {/* Modal de Adicionar/Editar Livro - Apenas para Admin */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-8 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-full p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-3xl font-serif font-bold mb-6">{editingId ? "Editar Livro" : "Novo Livro"}</h2>
            <form onSubmit={handleSaveBook} className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Título *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Autor *</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Gênero *</label>
                  <input required type="text" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Ano</label>
                  <input type="number" value={formData.publicationYear} onChange={e => setFormData({...formData, publicationYear: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block text-foreground/80">URL da Capa</label>
                  <input type="url" placeholder="https://..." value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block text-foreground/80">Descrição</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-lg border border-input px-4 py-2.5 text-sm bg-background transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
              </div>
              
              <div className={`mt-4 flex ${editingId ? 'justify-between gap-4' : 'justify-end'}`}>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={handleDeleteBook}
                    disabled={isSubmitting}
                    className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    Excluir Livro
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none ${!editingId ? 'w-full' : 'flex-1'}`}
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
