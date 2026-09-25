import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getAllBooks, createBook, updateBook, deleteBook,
  getAllAuthors, createAuthor, updateAuthor, deleteAuthor, checkAuthor,
  getAllGenres, createGenre, updateGenre, deleteGenre, checkGenre,
  getWishlist, createWishlistBook, updateWishlistBook, deleteWishlistBook, moveWishlistToCatalog
} from "../services/api";

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

type Author = { _id: string; name: string };
type Genre = { _id: string; name: string };

type Book = {
  _id: string;
  title: string;
  author: Author;
  genre: Genre[];
  publicationYear?: number;
  description?: string;
  coverUrl?: string;
  review?: string;
  rating?: number;
  cryRating?: number;
};

type WishlistBook = {
  _id: string;
  title: string;
  author: Author;
  genre: Genre[];
  publicationYear?: number;
  coverUrl?: string;
  purchaseLink?: string;
};

type SortOption = "title_asc" | "title_desc" | "year_asc" | "year_desc";
type UserRole = "admin" | "visitor" | null;
type ActiveTab = "catalog" | "wishlist";

const CRY_EMOJIS = {
  1: "😐",
  2: "🥺",
  3: "😢",
  4: "😭",
  5: "🤧"
};

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
  const [wishlist, setWishlist] = useState<WishlistBook[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  // Aba ativa
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");

  // Filtros
  const [query, setQuery] = useState("");
  const [filterGenre, setFilterGenre] = useState("Todos");
  const [sort, setSort] = useState<SortOption>("title_asc");

  // Estados dos Modais (catálogo)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Wishlist
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);
  const [wishlistFormData, setWishlistFormData] = useState({
    title: "",
    author: "",
    genre: [] as string[],
    publicationYear: "",
    coverUrl: "",
    purchaseLink: ""
  });

  // Modais de Autor/Gênero
  const [agModal, setAgModal] = useState<{ type: 'author' | 'genre' | null, id: string | null, name: string }>({ type: null, id: null, name: "" });

  // Modal de Visualização
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [viewingWishlistBook, setViewingWishlistBook] = useState<WishlistBook | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    genre: [] as string[],
    publicationYear: "",
    description: "",
    coverUrl: "",
    review: "",
    rating: 0,
    cryRating: 0
  });

  const isAdmin = userRole === "admin";

  const fetchData = async () => {
    try {
      // Fazemos as requisições separadas ou tratamos individualmente
      // para evitar que uma rota não pronta (404) quebre tudo
      const [booksRes, authorsRes, genresRes, wishlistRes] = await Promise.allSettled([
        getAllBooks(),
        getAllAuthors(),
        getAllGenres(),
        getWishlist()
      ]);

      if (booksRes.status === "fulfilled") setBooks(booksRes.value);
      if (authorsRes.status === "fulfilled") setAuthors(authorsRes.value);
      if (genresRes.status === "fulfilled") setGenres(genresRes.value);
      if (wishlistRes.status === "fulfilled") setWishlist(wishlistRes.value);
      else console.warn("Wishlist endpoint falhou, possivelmente deploy do backend ainda não terminou.");

    } catch (error) {
      console.error("Erro inesperado ao buscar dados da API:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return books.filter((b) => {
      const matchesQ = !q || b.title.toLowerCase().includes(q) || (b.author?.name || '').toLowerCase().includes(q);
      const matchesG = filterGenre === "Todos" || b.genre.some(g => g.name === filterGenre);
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
  }, [books, query, filterGenre, sort]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: "", author: "", genre: [], publicationYear: "", description: "", coverUrl: "", review: "", rating: 0, cryRating: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingId(book._id);
    setFormData({
      title: book.title,
      author: book.author?._id || "",
      genre: book.genre?.map(g => g._id) || [],
      publicationYear: book.publicationYear ? String(book.publicationYear) : "",
      description: book.description || "",
      coverUrl: book.coverUrl || "",
      review: book.review || "",
      rating: book.rating || 0,
      cryRating: book.cryRating || 0
    });
    setIsModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author || formData.genre.length === 0) {
      alert("Por favor, selecione um autor e pelo menos um gênero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const bookPayload = {
        ...formData,
        publicationYear: formData.publicationYear ? parseInt(formData.publicationYear) : undefined,
        rating: formData.rating || null,
        cryRating: formData.cryRating || null
      };

      if (editingId) {
        await updateBook(editingId, bookPayload);
      } else {
        await createBook(bookPayload);
      }

      await fetchData(); // Recarrega para pegar os dados populados
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
    if (!window.confirm("Tem certeza que deseja excluir este livro?")) return;

    setIsSubmitting(true);
    try {
      await deleteBook(editingId);
      setBooks((prev) => prev.filter(b => b._id !== editingId));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
      alert("Houve um erro ao excluir o livro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Funções de Autor / Gênero ---
  const handleSaveAg = async (e: React.FormEvent) => {
    e.preventDefault();
    const { type, id, name } = agModal;
    if (!name.trim()) return;

    try {
      const checkFn = type === 'author' ? checkAuthor : checkGenre;
      const checkRes = await checkFn(name);

      if (checkRes.exists && checkRes[type]._id !== id) {
        alert(`${type === 'author' ? 'Autor' : 'Gênero'} já existe no banco!`);
        return;
      }

      if (id) {
        // Edit
        if (type === 'author') await updateAuthor(id, { name });
        else await updateGenre(id, { name });
      } else {
        // Create
        if (type === 'author') {
          const res = await createAuthor({ name });
          setFormData(prev => ({ ...prev, author: res._id }));
        } else {
          const res = await createGenre({ name });
          setFormData(prev => ({ ...prev, genre: [...prev.genre, res._id] }));
        }
      }

      await fetchData();
      setAgModal({ type: null, id: null, name: "" });
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    }
  };

  const handleDeleteAg = async () => {
    const { type, id } = agModal;
    if (!id) return;
    if (!window.confirm("Tem certeza? Isso pode causar problemas se houver livros vinculados.")) return;

    try {
      if (type === 'author') await deleteAuthor(id);
      else await deleteGenre(id);

      await fetchData();
      setAgModal({ type: null, id: null, name: "" });
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  };

  const renderStars = (rating: number) => {
    if (!rating) return null;
    return (
      <span className="text-yellow-500 text-lg">
        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
      </span>
    );
  };

  // --- Handlers Wishlist ---
  const openAddWishlistModal = () => {
    setEditingWishlistId(null);
    setWishlistFormData({ title: "", author: "", genre: [], publicationYear: "", coverUrl: "", purchaseLink: "" });
    setIsWishlistModalOpen(true);
  };

  const openEditWishlistModal = (item: WishlistBook) => {
    setEditingWishlistId(item._id);
    setWishlistFormData({
      title: item.title,
      author: item.author?._id || "",
      genre: item.genre?.map(g => g._id) || [],
      publicationYear: item.publicationYear ? String(item.publicationYear) : "",
      coverUrl: item.coverUrl || "",
      purchaseLink: item.purchaseLink || ""
    });
    setIsWishlistModalOpen(true);
  };

  const handleSaveWishlistBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistFormData.author || wishlistFormData.genre.length === 0) {
      alert("Por favor, selecione um autor e pelo menos um gênero.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...wishlistFormData,
        publicationYear: wishlistFormData.publicationYear ? parseInt(wishlistFormData.publicationYear) : undefined
      };
      if (editingWishlistId) {
        await updateWishlistBook(editingWishlistId, payload);
      } else {
        await createWishlistBook(payload);
      }
      await fetchData();
      setIsWishlistModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar item da wishlist:", error);
      alert("Houve um erro ao salvar. Verifique o console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWishlistBook = async () => {
    if (!editingWishlistId) return;
    if (!window.confirm("Tem certeza que deseja remover este livro da lista de desejos?")) return;
    setIsSubmitting(true);
    try {
      await deleteWishlistBook(editingWishlistId);
      setIsWishlistModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao excluir da wishlist:", error);
      alert("Houve um erro ao excluir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToCatalog = async (item: WishlistBook) => {
    if (!window.confirm(`Mover "${item.title}" para o catálogo? O livro será removido da lista de desejos.`)) return;
    try {
      const newBook = await moveWishlistToCatalog(item._id);
      await fetchData();
      // Abre modal de edição do catálogo com os dados pré-preenchidos
      setActiveTab("catalog");
      openEditModal(newBook);
    } catch (error) {
      console.error("Erro ao mover para o catálogo:", error);
      alert("Houve um erro ao mover o livro.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-6 pt-6 md:pt-10 pb-0 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Sua Coleção</span>
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                {isAdmin ? "Admin" : "Visitante"}
              </span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
              {activeTab === "catalog" ? "Catálogo de Livros" : "Lista de Desejos"}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {activeTab === "catalog"
                ? "Explore nossa coleção de livros armazenada no MongoDB. Filtre por gênero, busque por título ou autor."
                : "Livros que você deseja adquirir. Clique em \"Mover para o Catálogo\" quando adquirir um livro."}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="self-start md:self-auto flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-md hover:bg-destructive/10"
          >
            Sair
          </button>
        </div>
        {/* Abas de navegação */}
        <div className="mx-auto max-w-6xl px-6 flex gap-0 mt-4">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "catalog"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📚 Meu Catálogo
            <span className="ml-2 text-[10px] bg-muted rounded-full px-2 py-0.5">{books.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "wishlist"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🎁 Lista de Desejos
            <span className="ml-2 text-[10px] bg-muted rounded-full px-2 py-0.5">{wishlist.length}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Barra de filtros */}
        <section className={`mb-8 grid gap-4 ${isAdmin ? 'md:grid-cols-[1fr_auto_auto_auto]' : 'md:grid-cols-[1fr_auto_auto]'}`}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou autor…"
            className="w-full rounded-md border border-input bg-card px-4 py-2.5 text-sm text-card-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-2.5 text-sm text-card-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="Todos">Todos os Gêneros</option>
            {genres.map((g) => (
              <option key={g._id} value={g.name}>{g.name}</option>
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
          {isAdmin && activeTab === "catalog" && (
            <button
              onClick={openAddModal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              + Adicionar Livro
            </button>
          )}
          {isAdmin && activeTab === "wishlist" && (
            <button
              onClick={openAddWishlistModal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              + Adicionar à Wishlist
            </button>
          )}
        </section>

        {loading ? (
          <div className="mt-10 flex justify-center p-12">
            <p className="font-serif text-lg text-muted-foreground">Conectando ao MongoDB...</p>
          </div>
        ) : activeTab === "catalog" ? (
          <>
            <p className="mb-6 font-mono text-xs text-muted-foreground">
              {`${filtered.length} ${filtered.length === 1 ? "livro encontrado" : "livros encontrados"}`}
            </p>
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book, index) => (
                <article
                  key={book._id}
                  className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 relative overflow-hidden"
                >
                  <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted overflow-hidden relative shadow-inner">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={`Capa do livro ${book.title}`} className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div
                        className="flex h-36 w-28 items-center justify-center rounded-md font-serif text-3xl font-bold text-primary-foreground shadow-md transition-transform duration-500 group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, var(--chart-${(index % 5) + 1}), var(--primary))` }}
                      >
                        {book.title.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1">
                      {book.genre?.map(g => (
                        <span key={g._id} className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">{g.name}</span>
                      ))}
                    </div>
                    <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{book.publicationYear || "N/A"}</span>
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-bold leading-tight group-hover:text-primary transition-colors">{book.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">por {book.author?.name || 'Desconhecido'}</p>
                  {(book.rating || book.cryRating) && (
                    <div className="flex items-center gap-3 mt-2">
                      {renderStars(book.rating || 0)}
                      {book.cryRating ? <span className="text-lg" title="Nível de Choro">{CRY_EMOJIS[book.cryRating as keyof typeof CRY_EMOJIS]}</span> : null}
                    </div>
                  )}
                  <p className="mt-3 line-clamp-3 text-sm text-foreground/70 leading-relaxed flex-1">{book.description}</p>
                  <div className={`mt-4 pt-3 border-t border-border grid gap-2 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {isAdmin && (
                      <button onClick={() => openEditModal(book)} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                        ✏️ Editar
                      </button>
                    )}
                    <button onClick={() => setViewingBook(book)} className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                      👁️ Visualizar
                    </button>
                  </div>
                </article>
              ))}
            </section>
            {filtered.length === 0 && (
              <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center shadow-sm">
                <p className="font-serif text-xl font-medium">Nenhum livro encontrado.</p>
                <p className="mt-2 text-sm text-muted-foreground">Tente buscar por outros termos.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ABA WISHLIST */}
            <p className="mb-6 font-mono text-xs text-muted-foreground">
              {`${wishlist.filter(w => {
                const q = query.toLowerCase().trim();
                const matchQ = !q || w.title.toLowerCase().includes(q) || (w.author?.name || '').toLowerCase().includes(q);
                const matchG = filterGenre === "Todos" || w.genre?.some(g => g.name === filterGenre);
                return matchQ && matchG;
              }).length} ${wishlist.length === 1 ? "item na lista" : "itens na lista"}`}
            </p>
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist
                .filter(w => {
                  const q = query.toLowerCase().trim();
                  const matchQ = !q || w.title.toLowerCase().includes(q) || (w.author?.name || '').toLowerCase().includes(q);
                  const matchG = filterGenre === "Todos" || w.genre?.some(g => g.name === filterGenre);
                  return matchQ && matchG;
                })
                .map((item, index) => (
                  <article
                    key={item._id}
                    className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 relative overflow-hidden"
                  >
                    <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted overflow-hidden relative shadow-inner">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={`Capa de ${item.title}`} className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div
                          className="flex h-36 w-28 items-center justify-center rounded-md font-serif text-3xl font-bold text-primary-foreground shadow-md"
                          style={{ background: `linear-gradient(135deg, var(--chart-${(index % 5) + 1}), var(--primary))` }}
                        >
                          {item.title.charAt(0)}
                        </div>
                      )}
                      {/* Badge Wishlist */}
                      <span className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">🎁 Desejo</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1">
                        {item.genre?.map(g => (
                          <span key={g._id} className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">{g.name}</span>
                        ))}
                      </div>
                      <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{item.publicationYear || "N/A"}</span>
                    </div>
                    <h2 className="mt-4 font-serif text-xl font-bold leading-tight group-hover:text-primary transition-colors">{item.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">por {item.author?.name || 'Desconhecido'}</p>
                    {item.purchaseLink && (
                      <a href={item.purchaseLink} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        🛒 Link de Compra
                      </a>
                    )}
                    <div className={`mt-4 pt-3 border-t border-border grid gap-2 ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {isAdmin && (
                        <button onClick={() => openEditWishlistModal(item)} className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                          ✏️ Editar
                        </button>
                      )}
                      <button onClick={() => setViewingWishlistBook(item)} className="flex items-center justify-center gap-1 rounded-lg border border-primary/40 bg-primary/5 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                        👁️ Ver
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleMoveToCatalog(item)} className="flex items-center justify-center gap-1 rounded-lg border border-green-500/40 bg-green-500/5 py-2 text-xs font-semibold text-green-600 hover:bg-green-500 hover:text-white transition-colors">
                          📚 Mover
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </section>
            {wishlist.length === 0 && (
              <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center shadow-sm">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎁</span>
                </div>
                <p className="font-serif text-xl font-medium">Sua lista de desejos está vazia.</p>
                <p className="mt-2 text-sm text-muted-foreground">Adicione livros que você deseja adquirir!</p>
              </div>
            )}
          </>
        )}
      </main>


      {/* Modal de Livro */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-full p-2">✕</button>
            <h2 className="text-3xl font-serif font-bold mb-6">{editingId ? "Editar Livro" : "Novo Livro"}</h2>

            <form onSubmit={handleSaveBook} className="flex flex-col gap-5">
              {/* Título */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Título *</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm"
                />
              </div>

              {/* Autor - largura completa */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Autor *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {authors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAgModal({ type: 'author', id: null, name: '' })}
                    className="bg-accent px-2 rounded-md text-xs font-bold"
                  >
                    + NOVO
                  </button>
                  {formData.author && (
                    <button
                      type="button"
                      onClick={() => {
                        const a = authors.find(x => x._id === formData.author);
                        if (a) setAgModal({ type: 'author', id: a._id, name: a.name });
                      }}
                      className="bg-accent px-2 rounded-md text-xs"
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>

              {/* Gêneros - largura completa */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Gêneros *</label>

                <div className="flex flex-col gap-2">
                  {formData.genre.map((genreId, index) => {
                    const selectedGenreIds = formData.genre.filter((_, i) => i !== index);
                    const currentGenre = genres.find(g => g._id === genreId);

                    return (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          required
                          value={genreId}
                          onChange={e => {
                            const newGenres = [...formData.genre];
                            newGenres[index] = e.target.value;
                            setFormData({ ...formData, genre: newGenres });
                          }}
                          className="w-full rounded-lg border px-3 py-2.5 text-sm"
                        >
                          <option value="">Selecione...</option>
                          {genres.map(g => (
                            <option
                              key={g._id}
                              value={g._id}
                              disabled={selectedGenreIds.includes(g._id)}
                            >
                              {g.name}
                            </option>
                          ))}
                        </select>

                        {genreId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (currentGenre) {
                                setAgModal({
                                  type: 'genre',
                                  id: currentGenre._id,
                                  name: currentGenre.name
                                });
                              }
                            }}
                            className="bg-accent px-2 rounded-md text-xs h-11"
                            title="Editar gênero"
                          >
                            ✎
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const newGenres = formData.genre.filter((_, i) => i !== index);
                            setFormData({ ...formData, genre: newGenres });
                          }}
                          className="bg-accent px-2 rounded-md text-xs h-11"
                          title="Remover gênero"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          genre: [...formData.genre, ""]
                        });
                      }}
                      className="bg-accent px-3 py-2 rounded-md text-xs font-bold"
                    >
                      + ADICIONAR GÊNERO
                    </button>

                    <button
                      type="button"
                      onClick={() => setAgModal({ type: 'genre', id: null, name: '' })}
                      className="bg-accent px-3 py-2 rounded-md text-xs font-bold"
                    >
                      + NOVO GÊNERO
                    </button>
                  </div>
                </div>

                <span className="text-[10px] text-muted-foreground block mt-1">
                  Selecione um gênero por linha. Você pode adicionar vários gêneros.
                </span>
              </div>

              {/* Ano + URL da Capa */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Ano</label>
                  <input
                    type="number"
                    value={formData.publicationYear}
                    onChange={e => setFormData({ ...formData, publicationYear: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">URL da Capa</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.coverUrl}
                    onChange={e => setFormData({ ...formData, coverUrl: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Sinopse */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Sinopse</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm resize-none"
                />
              </div>

              {/* Resenha */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block text-primary">Resenha</label>
                <textarea
                  rows={3}
                  value={formData.review}
                  onChange={e => setFormData({ ...formData, review: e.target.value })}
                  className="w-full rounded-lg border border-primary/50 px-4 py-2.5 text-sm resize-none"
                  placeholder="Escreva sua resenha sobre o livro..."
                />
              </div>

              {/* Avaliação + Nível de Choro */}
              <div className="grid grid-cols-2 gap-5 bg-muted/50 p-4 rounded-xl border border-border">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-center">Avaliação (Estrelas)</label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star === formData.rating ? 0 : star })}
                        className={`text-2xl transition-all ${star <= formData.rating ? 'text-yellow-500 scale-110' : 'text-gray-300 hover:text-yellow-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-center">Nível de Choro</label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormData({ ...formData, cryRating: lvl === formData.cryRating ? 0 : lvl })}
                        className={`text-2xl transition-all ${lvl === formData.cryRating ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-100'}`}
                        title={CRY_EMOJIS[lvl as keyof typeof CRY_EMOJIS]}
                      >
                        {CRY_EMOJIS[lvl as keyof typeof CRY_EMOJIS]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botões finais */}
              <div className={`mt-2 flex ${editingId ? 'justify-between gap-4' : 'justify-end'}`}>
                {editingId && (
                  <button type="button" onClick={handleDeleteBook} disabled={isSubmitting} className="text-destructive font-semibold">
                    Excluir Livro
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-semibold ${!editingId ? 'w-full' : 'w-2/3'}`}
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub Modal - Autor/Gênero */}
      {agModal.type && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {agModal.id ? "Editar " : "Novo "}
              {agModal.type === 'author' ? 'Autor' : 'Gênero'}
            </h3>
            <form onSubmit={handleSaveAg}>
              <input
                autoFocus
                required
                type="text"
                value={agModal.name}
                onChange={e => setAgModal({ ...agModal, name: e.target.value })}
                className="w-full rounded-md border px-3 py-2 mb-4"
                placeholder="Nome..."
              />
              <div className="flex justify-between">
                <div>
                  {agModal.id && (
                    <button type="button" onClick={handleDeleteAg} className="text-destructive text-sm font-semibold py-2">Excluir</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAgModal({ type: null, id: null, name: "" })} className="px-4 py-2 text-sm bg-muted rounded-md">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md font-semibold">Salvar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {viewingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setViewingBook(null)}>
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Capa */}
            <div className="relative h-56 w-full overflow-hidden rounded-t-2xl bg-muted">
              {viewingBook.coverUrl ? (
                <img src={viewingBook.coverUrl} alt={`Capa de ${viewingBook.title}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-6xl font-bold text-primary-foreground"
                  style={{ background: `linear-gradient(135deg, var(--chart-1), var(--primary))` }}>
                  {viewingBook.title.charAt(0)}
                </div>
              )}
              <button
                onClick={() => setViewingBook(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >✕</button>
              {isAdmin && (
                <button
                  onClick={() => { setViewingBook(null); openEditModal(viewingBook); }}
                  className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold shadow-lg hover:bg-primary/90 transition-colors"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            <div className="p-6">
              {/* Gêneros e Ano */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {viewingBook.genre?.map(g => (
                    <span key={g._id} className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">
                      {g.name}
                    </span>
                  ))}
                </div>
                {viewingBook.publicationYear && (
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {viewingBook.publicationYear}
                  </span>
                )}
              </div>

              {/* Título e Autor */}
              <h2 className="font-serif text-2xl font-bold leading-tight">{viewingBook.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium mb-3">por {viewingBook.author?.name || 'Desconhecido'}</p>

              {/* Avaliações */}
              {(viewingBook.rating || viewingBook.cryRating) && (
                <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-3 mb-4">
                  {viewingBook.rating ? (
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Avaliação</p>
                      <span className="text-xl text-yellow-500">
                        {"★".repeat(viewingBook.rating)}{"☆".repeat(5 - viewingBook.rating)}
                      </span>
                    </div>
                  ) : null}
                  {viewingBook.cryRating ? (
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Chorômetro</p>
                      <span className="text-2xl">{CRY_EMOJIS[viewingBook.cryRating as keyof typeof CRY_EMOJIS]}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Sinopse */}
              {viewingBook.description && (
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Sinopse</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{viewingBook.description}</p>
                </div>
              )}

              {/* Resenha */}
              {viewingBook.review && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">✍️ Resenha</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{viewingBook.review}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário Wishlist */}
      {isWishlistModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsWishlistModalOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-full p-2">✕</button>
            <h2 className="text-3xl font-serif font-bold mb-6">{editingWishlistId ? "Editar Desejo" : "Novo Desejo"}</h2>

            <form onSubmit={handleSaveWishlistBook} className="flex flex-col gap-5">
              {/* Título */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Título *</label>
                <input
                  required
                  type="text"
                  value={wishlistFormData.title}
                  onChange={e => setWishlistFormData({ ...wishlistFormData, title: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm"
                />
              </div>

              {/* Autor */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Autor *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={wishlistFormData.author}
                    onChange={e => setWishlistFormData({ ...wishlistFormData, author: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {authors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAgModal({ type: 'author', id: null, name: '' })}
                    className="bg-accent hover:bg-accent/80 text-accent-foreground px-4 rounded-lg text-sm font-bold whitespace-nowrap"
                  >
                    + NOVO
                  </button>
                </div>
              </div>

              {/* Gêneros */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Gêneros *</label>
                <div className="flex flex-col gap-2">
                  {wishlistFormData.genre.map((g, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        required
                        value={g}
                        onChange={(e) => {
                          const newGenres = [...wishlistFormData.genre];
                          newGenres[index] = e.target.value;
                          setWishlistFormData({ ...wishlistFormData, genre: newGenres });
                        }}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <option value="">Selecione...</option>
                        {genres.map((gen) => (
                          <option key={gen._id} value={gen._id} disabled={wishlistFormData.genre.includes(gen._id) && gen._id !== g}>
                            {gen.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        const newGenres = wishlistFormData.genre.filter((_, i) => i !== index);
                        setWishlistFormData({ ...wishlistFormData, genre: newGenres });
                      }} className="bg-accent px-2 rounded-md text-xs h-11" title="Remover">✕</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button type="button" onClick={() => setWishlistFormData({ ...wishlistFormData, genre: [...wishlistFormData.genre, ""] })} className="bg-accent px-3 py-2 rounded-md text-xs font-bold">+ ADICIONAR GÊNERO</button>
                    <button type="button" onClick={() => setAgModal({ type: 'genre', id: null, name: '' })} className="bg-accent px-3 py-2 rounded-md text-xs font-bold">+ NOVO GÊNERO</button>
                  </div>
                </div>
              </div>

              {/* Ano e Capa */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Ano</label>
                  <input
                    type="number"
                    value={wishlistFormData.publicationYear}
                    onChange={e => setWishlistFormData({ ...wishlistFormData, publicationYear: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">URL da Capa</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={wishlistFormData.coverUrl}
                    onChange={e => setWishlistFormData({ ...wishlistFormData, coverUrl: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Link de Compra */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Link de Compra</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={wishlistFormData.purchaseLink}
                  onChange={e => setWishlistFormData({ ...wishlistFormData, purchaseLink: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2.5 text-sm"
                />
              </div>

              {/* Botões finais */}
              <div className={`mt-2 flex ${editingWishlistId ? 'justify-between gap-4' : 'justify-end'}`}>
                {editingWishlistId && (
                  <button type="button" onClick={handleDeleteWishlistBook} disabled={isSubmitting} className="text-destructive font-semibold">
                    Excluir
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-semibold ${!editingWishlistId ? 'w-full' : 'w-2/3'}`}
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização Wishlist */}
      {viewingWishlistBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setViewingWishlistBook(null)}>
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="relative h-56 w-full overflow-hidden rounded-t-2xl bg-muted">
              {viewingWishlistBook.coverUrl ? (
                <img src={viewingWishlistBook.coverUrl} alt={`Capa de ${viewingWishlistBook.title}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-6xl font-bold text-primary-foreground"
                  style={{ background: `linear-gradient(135deg, var(--chart-1), var(--primary))` }}>
                  {viewingWishlistBook.title.charAt(0)}
                </div>
              )}
              <span className="absolute top-4 left-4 bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">🎁 Lista de Desejos</span>
              <button
                onClick={() => setViewingWishlistBook(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >✕</button>
              {isAdmin && (
                <button
                  onClick={() => { setViewingWishlistBook(null); openEditWishlistModal(viewingWishlistBook); }}
                  className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold shadow-lg hover:bg-primary/90 transition-colors"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {viewingWishlistBook.genre?.map(g => (
                    <span key={g._id} className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest font-bold">
                      {g.name}
                    </span>
                  ))}
                </div>
                {viewingWishlistBook.publicationYear && (
                  <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {viewingWishlistBook.publicationYear}
                  </span>
                )}
              </div>

              <h2 className="font-serif text-2xl font-bold leading-tight">{viewingWishlistBook.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium mb-5">por {viewingWishlistBook.author?.name || 'Desconhecido'}</p>

              {viewingWishlistBook.purchaseLink && (
                <div className="mb-4">
                  <a href={viewingWishlistBook.purchaseLink} target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-xl font-bold transition-colors">
                    🛒 Acessar Link de Compra
                  </a>
                </div>
              )}

              {isAdmin && (
                <div className="mt-6 pt-4 border-t border-border">
                  <button 
                    onClick={() => { setViewingWishlistBook(null); handleMoveToCatalog(viewingWishlistBook); }} 
                    className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-green-500 bg-green-500/10 hover:bg-green-500 py-3 text-sm font-bold text-green-600 hover:text-white transition-colors"
                  >
                    📚 Adquiri este livro! Mover para o Catálogo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
