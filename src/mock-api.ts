import { Book } from './task1-types';

const STORAGE_KEY = 'catalog';

/**
 * Имитирует сетевую задержку.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Асинхронно загружает список книг из localStorage с имитацией задержки и 20% вероятностью сбоя сети.
 */
export async function fetchBooks(): Promise<Book[]> {
  await delay(800);

  if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed: unknown = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed as Book[];
  }

  // Поддержка старого формата { id, books } из предыдущей практики
  if (
    parsed &&
    typeof parsed === 'object' &&
    'books' in parsed &&
    Array.isArray((parsed as { books: unknown }).books)
  ) {
    return (parsed as { books: Book[] }).books;
  }

  return [];
}

/**
 * Асинхронно сохраняет массив книг в localStorage под ключом 'catalog'.
 */
export async function saveBooks(books: Book[]): Promise<void> {
  await delay(500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}
