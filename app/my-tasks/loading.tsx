export default function MyTasksLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="h-9 w-40 bg-gray-200 rounded animate-pulse-neo mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse-neo" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="neo-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1.5 animate-pulse-neo" />
              <div className="flex-1">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-2 animate-pulse-neo" />
                <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse-neo" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
