export default function WorkerDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Worker Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">My Tasks</h2>
          <p className="text-gray-600">View and manage your assigned production tasks.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Time Tracking</h2>
          <p className="text-gray-600">Log work hours and track progress on tasks.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Quality Control</h2>
          <p className="text-gray-600">Complete QC checks and report results.</p>
        </div>
      </div>
    </div>
  )
}