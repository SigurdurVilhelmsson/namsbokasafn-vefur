import type { BookConfig } from '@/config/books';
import BookCard from './BookCard';

interface BookGridProps {
  books: BookConfig[];
}

export default function BookGrid({ books }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">
          Engar bækur fundust.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
