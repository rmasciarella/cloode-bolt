export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">This page could not be found.</p>
        <a href="/" className="text-blue-600 hover:text-blue-800">
          Return Home
        </a>
      </div>
    </div>
  )
}