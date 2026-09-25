import axios from 'axios';

// Cria uma instância do Axios para a API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Obter todos os livros
export const getAllBooks = async () => {
  const response = await api.get('/books');
  return response.data;
};

// Obter um livro por ID
export const getBookById = async (id) => {
  const response = await api.get(`/books/${id}`);
  return response.data;
};

// Criar novo livro
export const createBook = async (bookData) => {
  const response = await api.post('/books', bookData);
  return response.data;
};

// Atualizar livro
export const updateBook = async (id, bookData) => {
  const response = await api.put(`/books/${id}`, bookData);
  return response.data;
};

// Deletar livro
export const deleteBook = async (id) => {
  const response = await api.delete(`/books/${id}`);
  return response.data;
};

// --- CRUD Autores ---
export const getAllAuthors = async () => {
  const response = await api.get('/authors');
  return response.data;
};

export const createAuthor = async (authorData) => {
  const response = await api.post('/authors', authorData);
  return response.data;
};

export const updateAuthor = async (id, authorData) => {
  const response = await api.put(`/authors/${id}`, authorData);
  return response.data;
};

export const deleteAuthor = async (id) => {
  const response = await api.delete(`/authors/${id}`);
  return response.data;
};

export const checkAuthor = async (name) => {
  const response = await api.get(`/authors/check?name=${encodeURIComponent(name)}`);
  return response.data;
};


// --- CRUD Gêneros ---
export const getAllGenres = async () => {
  const response = await api.get('/genres');
  return response.data;
};

export const createGenre = async (genreData) => {
  const response = await api.post('/genres', genreData);
  return response.data;
};

export const updateGenre = async (id, genreData) => {
  const response = await api.put(`/genres/${id}`, genreData);
  return response.data;
};

export const deleteGenre = async (id) => {
  const response = await api.delete(`/genres/${id}`);
  return response.data;
};

export const checkGenre = async (name) => {
  const response = await api.get(`/genres/check?name=${encodeURIComponent(name)}`);
  return response.data;
};


// --- Wishlist ---
export const getWishlist = async () => {
  const response = await api.get('/wishlist');
  return response.data;
};

export const createWishlistBook = async (data) => {
  const response = await api.post('/wishlist', data);
  return response.data;
};

export const updateWishlistBook = async (id, data) => {
  const response = await api.put(`/wishlist/${id}`, data);
  return response.data;
};

export const deleteWishlistBook = async (id) => {
  const response = await api.delete(`/wishlist/${id}`);
  return response.data;
};

export const moveWishlistToCatalog = async (id) => {
  const response = await api.post(`/wishlist/${id}/move-to-catalog`);
  return response.data;
};

export default api;
