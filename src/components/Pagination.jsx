import React from "react";

const Pagination = ({
  page,
  perPage = 10,
  total = 0,
  onPageChange,
  onPerPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
      <div className="text-sm text-gray-600">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of {total.toLocaleString()}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 border rounded disabled:opacity-50"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
        >
          Prev
        </button>
        <div className="text-sm text-gray-700">Page {page} of {totalPages}</div>
        <button
          className="px-3 py-1.5 border rounded disabled:opacity-50"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
        >
          Next
        </button>
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="ml-2 border rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default Pagination;

