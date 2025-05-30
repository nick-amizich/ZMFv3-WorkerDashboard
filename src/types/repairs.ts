// Repair system types
export interface RepairOrder {
  id: string
  repair_number: string
  repair_source: 'customer' | 'internal'
  order_type: 'customer_return' | 'warranty' | 'internal_qc'
  original_order_id?: string
  original_order_number?: string
  
  // Customer info
  customer_name: string
  customer_email: string
  customer_phone?: string
  
  // Product info
  model: string
  serial_number?: string
  wood_type?: string
  
  // Status and workflow
  status: 'intake' | 'diagnosed' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'shipped'
  priority: 'standard' | 'rush'
  repair_type: 'production' | 'finishing' | 'sonic'
  location?: string
  
  // Financial
  estimated_cost?: number
  final_cost?: number
  customer_approved?: boolean
  
  // Assignment and dates
  assigned_to?: {
    id: string
    name: string
  }
  received_date: string
  diagnosed_date?: string
  approved_date?: string
  started_date?: string
  completed_date?: string
  shipped_date?: string
  
  // Notes
  customer_note?: string
  internal_notes?: string
  
  // Tracking
  created_at: string
  updated_at: string
  created_by: {
    id: string
    name: string
  }
  
  // Relations
  issues?: RepairIssue[]
  actions?: RepairAction[]
  time_logs?: RepairTimeLog[]
  photos?: RepairPhoto[]
  totalTimeSpent?: number
}

export interface RepairIssue {
  id: string
  repair_order_id: string
  category: string
  specific_issue: string
  severity: 'cosmetic' | 'functional' | 'critical'
  discovered_by?: string
  discovered_at: string
  created_at: string
}

export interface RepairAction {
  id: string
  repair_order_id: string
  action_type: string
  action_description: string
  performed_by?: {
    id: string
    name: string
  }
  time_spent_minutes?: number
  completed_at: string
  created_at: string
  parts_used?: RepairPartUsed[]
}

export interface RepairPartUsed {
  id: string
  repair_action_id: string
  part_name: string
  part_number?: string
  quantity: number
  unit_cost?: number
  created_at: string
}

export interface RepairTimeLog {
  id: string
  repair_order_id: string
  worker_id: string
  worker?: {
    id: string
    name: string
  }
  start_time: string
  end_time?: string
  duration_minutes?: number
  work_description?: string
  created_at: string
}

export interface RepairPhoto {
  id: string
  repair_order_id: string
  photo_type: 'intake' | 'diagnosis' | 'before' | 'after' | 'completed'
  storage_path: string
  caption?: string
  uploaded_by?: string
  uploaded_at: string
}

export interface RepairKnowledgeBase {
  id: string
  repair_order_id?: string
  model: string
  issue_category: string
  issue_description: string
  solution_description: string
  technician_id?: string
  technician_name?: string
  time_to_repair_minutes?: number
  parts_used?: any
  success_rate?: number
  tags?: string[]
  created_at: string
  updated_at: string
}

// Form types
export interface CreateRepairInput {
  orderNumber?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  model: string
  serialNumber?: string
  woodType?: string
  repairType: 'production' | 'finishing' | 'sonic'
  priority: 'standard' | 'rush'
  repairSource: 'customer' | 'internal'
  orderType: 'customer_return' | 'warranty' | 'internal_qc'
  customerNote?: string
  location?: string
  issues: {
    category: string
    specificIssue: string
    severity: 'cosmetic' | 'functional' | 'critical'
  }[]
}

export interface UpdateRepairInput {
  status?: 'intake' | 'diagnosed' | 'approved' | 'in_progress' | 'testing' | 'completed' | 'shipped'
  priority?: 'standard' | 'rush'
  assigned_to?: string
  location?: string
  internal_notes?: string
  estimated_cost?: number
  customer_approved?: boolean
}

export interface CreateActionInput {
  actionType: string
  actionDescription: string
  timeSpentMinutes?: number
  parts?: {
    partName: string
    partNumber?: string
    quantity: number
    unitCost?: number
  }[]
}