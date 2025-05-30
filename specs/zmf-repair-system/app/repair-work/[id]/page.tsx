"use client"

import RepairWorkPage from "../../../components/repair-work-page"
import { useParams } from "next/navigation"
import { RepairProvider } from "../../../contexts/repair-context"

export default function RepairWorkPageRoute() {
  const params = useParams()
  const repairId = params.id as string

  return (
    <RepairProvider>
      <RepairWorkPage repairId={repairId} />
    </RepairProvider>
  )
}
