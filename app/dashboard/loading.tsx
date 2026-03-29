export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-48 bg-gray-200 rounded animate-pulse-neo mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse-neo" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 h-[42px] bg-neo-white border-2 border-gray-200 rounded-lg animate-pulse-neo" />
        <div className="h-[42px] w-40 bg-gray-200 border-2 border-gray-200 rounded-lg animate-pulse-neo" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-neo-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-neo-sm"
          >
            <div className="h-2 w-full bg-gray-200 animate-pulse-neo" />
            <div className="p-5">
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse-neo" />
              <div className="h-4 w-full bg-gray-100 rounded mb-1 animate-pulse-neo" />
              <div className="h-4 w-2/3 bg-gray-100 rounded mb-4 animate-pulse-neo" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse-neo" />
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse-neo" />
                </div>
                <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse-neo" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
