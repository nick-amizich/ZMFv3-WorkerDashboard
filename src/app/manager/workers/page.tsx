import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, CheckCircle, XCircle } from 'lucide-react'

export default async function WorkersPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .order('name')
  
  const activeWorkers = workers?.filter(w => w.is_active) || []
  const inactiveWorkers = workers?.filter(w => !w.is_active) || []
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Workers</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Workers ({activeWorkers.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeWorkers.map((worker) => (
              <Card key={worker.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{worker.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Role:</span>
                      <Badge variant="outline">{worker.role}</Badge>
                    </div>
                    {worker.skills && worker.skills.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Skills:</span>
                        <span className="text-sm text-muted-foreground">
                          {worker.skills.length} skills
                        </span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {inactiveWorkers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Inactive Workers ({inactiveWorkers.length})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactiveWorkers.map((worker) => (
                <Card key={worker.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{worker.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{worker.email}</p>
                        </div>
                      </div>
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="default" size="sm" className="w-full">
                      Activate Worker
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}