export default function BoardLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-neo-black/10 flex-shrink-0">
        <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse-neo border-2 border-gray-200" />
        <div className="flex-1">
          <div className="h-6 w-48 bg-gray-200 rounded mb-1 animate-pulse-neo" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse-neo" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-14 bg-gray-200 rounded-full animate-pulse-neo" />
          <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse-neo" />
        </div>
      </div>

      {/* Lists skeleton */}
      <div className="flex gap-5 p-6 h-full items-start overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[300px] bg-neo-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-neo-sm"
          >
            {/* List header */}
            <div className="px-4 py-3 border-b-2 border-gray-200 bg-gray-100 animate-pulse-neo">
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>

            {/* Card skeletons */}
            <div className="p-3 space-y-2.5">
              {Array.from({ length: 2 + i }).map((_, j) => (
                <div
                  key={j}
                  className="border-2 border-gray-200 rounded-lg p-3"
                >
                  <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse-neo" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse-neo" />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2.5 border-t border-gray-100">
              <div className="h-8 w-full bg-gray-100 rounded-lg animate-pulse-neo" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
