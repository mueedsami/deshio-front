import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Previous Page"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Page <span className="text-blue-600 dark:text-blue-400 font-bold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
        </span>
      </div>

      <button
        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-700"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Next Page"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}