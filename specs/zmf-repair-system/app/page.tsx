"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { RepairProvider } from "../contexts/repair-context"
import RepairDashboard from "../components/repair-dashboard"
import RepairIntakeWizard from "../components/repair-intake-wizard"
import { useState } from "react"

export default function ZMFRepairSystem() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <RepairProvider>
      <div className="min-h-screen bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Repair Dashboard</TabsTrigger>
            <TabsTrigger value="intake">New Repair</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <RepairDashboard onNewRepair={() => setActiveTab("intake")} />
          </TabsContent>

          <TabsContent value="intake">
            <RepairIntakeWizard />
          </TabsContent>
        </Tabs>
        <Toaster />
      </div>
    </RepairProvider>
  )
}
