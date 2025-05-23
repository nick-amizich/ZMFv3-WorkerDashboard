export default function ManagerDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Task Overview</h2>
          <p className="text-gray-600">Monitor all production tasks and worker assignments.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Worker Management</h2>
          <p className="text-gray-600">Manage worker assignments and track performance.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Production Reports</h2>
          <p className="text-gray-600">View production metrics and quality reports.</p>
        </div>
      </div>
    </div>
  )
}