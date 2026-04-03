export default function SearchLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 rounded mb-2 animate-pulse-neo" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse-neo" />
      </div>
      <div className="mb-8">
        <div className="h-12 w-full bg-gray-200 rounded-lg border-2 border-gray-300 animate-pulse-neo" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="neo-card p-5">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse-neo" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 animate-pulse-neo" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse-neo" />
                  </div>
                  <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse-neo" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
