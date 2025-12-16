import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { getBook, type BookConfig } from '@/config/books';

// Context for book information
interface BookContextValue {
  book: BookConfig | null;
  bookSlug: string;
}

export const BookContext = createContext<BookContextValue | null>(null);

// Hook to get book information from URL params
export function useBookFromParams(): BookContextValue {
  const { bookSlug } = useParams<{ bookSlug: string }>();
  const book = bookSlug ? getBook(bookSlug) ?? null : null;

  return {
    book,
    bookSlug: bookSlug ?? '',
  };
}

// Hook to get book information from context (use inside BookLayout)
export function useBook(): BookContextValue {
  const context = useContext(BookContext);

  if (!context) {
    throw new Error('useBook must be used within a BookProvider');
  }

  return context;
}

// Optional hook that doesn't throw if outside context
export function useBookOptional(): BookContextValue | null {
  return useContext(BookContext);
}
