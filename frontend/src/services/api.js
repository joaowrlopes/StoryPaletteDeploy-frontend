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

// Obter todos os autores
export const getAllAuthors = async () => {
  const response = await api.get('/authors');
  return response.data;
};

// Obter todos os gêneros
export const getAllGenres = async () => {
  const response = await api.get('/genres');
  return response.data;
};

export default api;
