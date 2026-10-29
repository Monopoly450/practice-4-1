import './styles.css';
import { AsyncState, Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from './task4-integration';
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';
import { fetchBooks, saveBooks } from './mock-api';

// ============================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================================
let state: AsyncState<Book[]> = { status: 'loading' };
let errorMessage = '';

let catalog = new BookCatalog('main', []);
let wishlist = new Wishlist();

const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist) as string[]);
}

function saveWishlist(): void {
  localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}

function showTemporaryError(message: string): void {
  errorMessage = message;
  render();
  setTimeout(() => {
    errorMessage = '';
    render();
  }, 3000);
}

// ============================================================
// DOM-элементы (типизация через дженерик querySelector<T>)
// ============================================================
const bookList = document.querySelector<HTMLDivElement>('#bookList')!;
const wishlistContainer = document.querySelector<HTMLDivElement>('#wishlistContainer')!;
const form = document.querySelector<HTMLFormElement>('#bookForm')!;
const filterBtn = document.querySelector<HTMLButtonElement>('#applyFilters')!;
const authorInput = document.querySelector<HTMLInputElement>('#filterAuthor')!;
const yearInput = document.querySelector<HTMLInputElement>('#filterYear')!;
const errorMessageEl = document.querySelector<HTMLDivElement>('#errorMessage')!;
const searchInput = document.querySelector<HTMLInputElement>('#searchInput')!;
const sortBySelect = document.querySelector<HTMLSelectElement>('#sortBy')!;

// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  // Кнопка «Удалить» (асинхронное удаление через saveBooks)
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.status !== 'success') return;

    const newBooksArray = state.data.filter(b => b.id !== book.id);
    try {
      await saveBooks(newBooksArray);
      catalog.removeBook(book.id);
      state = { status: 'success', data: newBooksArray };
      render();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Неизвестная ошибка при удалении';
      showTemporaryError(msg);
    }
  });
  card.append(deleteBtn);

  // Кнопка «Избранное»
  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    saveWishlist();
    render();
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// ОТРИСОВКА СПИСКОВ
// ============================================================
function renderBooks(books: Book[]): void {
  bookList.innerHTML = '';

  if (books.length === 0) {
    bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
    return;
  }

  books.forEach(book => {
    bookList.append(createBookCard(book));
  });
}

function renderWishlist(): void {
  wishlistContainer.innerHTML = '';
  const favBooks = wishlist.getFavorites(catalog);

  if (favBooks.length === 0) {
    wishlistContainer.textContent = 'Пока ничего не добавлено';
    return;
  }

  favBooks.forEach(book => {
    wishlistContainer.append(createBookCard(book));
  });
}

// Отрисовка успешного состояния с учетом фильтров и сортировки
function updateView(books: Book[]): void {
  catalog = new BookCatalog('main', books);

  const filters: ((book: Book) => boolean)[] = [];
  if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
  if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
  if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));

  const filtered = applyFilters(catalog.getBooks(), filters);
  const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

  renderBooks(sorted);
  renderWishlist();
}

// ============================================================
// ЕДИНАЯ ФУНКЦИЯ РЕНДЕРИНГА ПО СОСТОЯНИЮ (AsyncState)
// ============================================================
function render(): void {
  errorMessageEl.textContent = errorMessage;

  switch (state.status) {
    case 'idle': {
      bookList.innerHTML = '';
      bookList.textContent = 'Ожидание загрузки...';
      wishlistContainer.innerHTML = '';
      break;
    }
    case 'loading': {
      bookList.innerHTML = '';
      const loadingEl = document.createElement('div');
      loadingEl.className = 'loading-indicator';
      loadingEl.textContent = 'Загрузка данных...';
      bookList.append(loadingEl);

      wishlistContainer.innerHTML = '';
      wishlistContainer.textContent = 'Загрузка данных...';
      break;
    }
    case 'success': {
      updateView(state.data);
      break;
    }
    case 'error': {
      bookList.innerHTML = '';
      wishlistContainer.innerHTML = '';

      const errorBlock = document.createElement('div');
      errorBlock.className = 'error-block';

      const msgEl = document.createElement('p');
      msgEl.textContent = state.message;
      errorBlock.append(msgEl);

      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Повторить попытку';
      retryBtn.addEventListener('click', () => {
        initApp();
      });
      errorBlock.append(retryBtn);

      bookList.append(errorBlock);
      break;
    }
  }
}

// ============================================================
// АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ (Задание 3)
// ============================================================
async function initApp(): Promise<void> {
  state = { status: 'loading' };
  render();

  try {
    const books = await fetchBooks();
    state = { status: 'success', data: books };
  } catch (error) {
    state = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }

  render();
}

// ============================================================
// АСИНХРОННЫЙ ОБРАБОТЧИК ФОРМЫ (Задание 4)
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.status !== 'success') return;

  errorMessage = '';
  render();

  try {
    const formData = new FormData(form);
    const newBook = createBookFromForm(formData);
    const newBooksArray = [...state.data, newBook];

    await saveBooks(newBooksArray);

    catalog.addBook(newBook);
    state = { status: 'success', data: newBooksArray };
    form.reset();
    render();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    showTemporaryError(msg);
  }
});

// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', render);
searchInput.addEventListener('input', render);
sortBySelect.addEventListener('change', render);

// Запуск приложения при загрузке страницы
initApp();
