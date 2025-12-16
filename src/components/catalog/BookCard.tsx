import { Link } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
import type { BookConfig } from '@/config/books';

interface BookCardProps {
  book: BookConfig;
}

function StatusBadge({ status }: { status: BookConfig['status'] }) {
  const config = {
    'available': {
      label: 'Í boði',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    },
    'in-progress': {
      label: 'Í vinnslu',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    },
    'coming-soon': {
      label: 'Væntanlegt',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    }
  };

  const { label, className } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {status === 'available' && <CheckCircle className="w-3 h-3 mr-1" />}
      {status === 'in-progress' && <Clock className="w-3 h-3 mr-1" />}
      {label}
    </span>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
        <span>{current} af {total} köflum</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function BookCard({ book }: BookCardProps) {
  const isClickable = book.status === 'available' || book.status === 'in-progress';

  const cardContent = (
    <div className={`group relative flex flex-col h-full bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-all duration-200 ${isClickable ? 'hover:shadow-lg hover:border-[var(--accent-color)]' : 'opacity-75'}`}>
      {/* Cover image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-color)] flex items-center justify-center">
        {book.coverImage && book.status !== 'coming-soon' ? (
          <img
            src={book.coverImage}
            alt={`${book.title} forsíða`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image and show fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        {/* Fallback icon */}
        <BookOpen className="absolute w-16 h-16 text-white/50" />

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={book.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors">
          {book.title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {book.subtitle}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 flex-grow">
          {book.description}
        </p>

        {/* Progress bar if stats available */}
        {book.stats && (
          <ProgressBar
            current={book.stats.translatedChapters}
            total={book.stats.totalChapters}
          />
        )}

        {/* Source attribution */}
        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Byggt á: {book.source.title}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {book.source.publisher} • {book.source.license}
          </p>
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link to={`/${book.slug}`} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
