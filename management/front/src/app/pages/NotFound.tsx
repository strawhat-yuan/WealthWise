export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="font-bold text-6xl text-gray-300">404</h1>
      <h2 className="font-bold text-2xl mt-4">Page Not Found</h2>
      <p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p>
      <a href="/" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Go to Dashboard
      </a>
    </div>
  );
}
