# 🧠 ZMF Automation Engine & Monitoring – UI Specification

## 1. **Automation Rules Manager**

### **Purpose**
- View, create, edit, activate/deactivate, and delete automation rules.
- See which rules are active, what they do, and their recent performance.

### **Key Components**
- **AutomationRulesTable**
  - Columns: Name, Workflow, Trigger, Conditions, Actions, Status, Last Executed, Success Rate, Actions (edit/delete)
  - Filters: By workflow, status (active/inactive), trigger type
  - Bulk actions: Activate/Deactivate, Delete

- **AutomationRuleForm**
  - For creating/editing rules
  - Fields:
    - Name, Description
    - Workflow (dropdown)
    - Trigger (type, stage, schedule, etc.)
    - Conditions (dynamic list, type/operator/value)
    - Actions (dynamic list, type/config)
    - Priority, Execution Order, Active toggle
  - Validation: All required fields, type safety

- **AutomationRuleDetailsDrawer**
  - Slide-over or modal with full rule config, execution history, and quick actions (test, deactivate, duplicate)

---

## 2. **Automation Templates Library**

### **Purpose**
- Browse, preview, and create new automation templates for common scenarios.

### **Key Components**
- **AutomationTemplatesGallery**
  - Card grid of built-in and custom templates
  - Each card: Name, Category, Description, Usage count, "Use Template" button

- **AutomationTemplatePreviewModal**
  - Shows full template config, example usage, and "Create Rule from Template" action

- **CreateAutomationTemplateForm**
  - For managers to define new templates

---

## 3. **Manual Rule Execution & Testing**

### **Purpose**
- Allow managers to manually trigger/test any automation rule (with dry-run support).
- See exactly what would happen before enabling a rule.

### **Key Components**
- **AutomationRuleTestPanel**
  - Select rule (dropdown/autocomplete)
  - Select context: Batch, Task, Stage (dropdowns, auto-populated)
  - Dry-run toggle
  - "Execute" button
  - Results display: Conditions evaluated, actions that would be taken, success/failure, logs

- **RecentManualExecutionsTable**
  - Shows recent manual/dry-run executions, who ran them, and results

---

## 4. **Automation Analytics & Monitoring Dashboard**

### **Purpose**
- Give managers a real-time overview of automation performance, bottlenecks, and recommendations.

### **Key Components**
- **AutomationSummaryStats**
  - Total rules, active rules, executions (30d), success rate, avg execution time

- **AutomationPerformanceCharts**
  - Line/bar charts: Executions per day, success/failure rates, average execution time
  - Pie chart: Rule types, trigger types

- **TopRulesTable**
  - Top performing rules (by execution count, success rate)
  - Slowest rules (by execution time)
  - Most failing rules (by failure rate)

- **AutomationRecommendationsPanel**
  - List of system-generated recommendations (e.g., "2 rules have high failure rates. Review conditions.")

- **RecentAutomationEventsFeed**
  - Stream of recent automation events: rule fired, actions taken, errors, manual overrides

---

## 5. **Automation Event Log & Audit Trail**

### **Purpose**
- Full searchable/filterable log of all automation executions, for audit and debugging.

### **Key Components**
- **AutomationEventLogTable**
  - Columns: Timestamp, Rule, Workflow, Trigger, Status, Actions Taken, Error (if any), Executed By, Context (batch/task)
  - Filters: By rule, workflow, status, date range, executed by
  - Export to CSV

- **AutomationEventDetailsModal**
  - Full JSON of execution context, conditions, actions, and results

---

## 6. **Automation Settings & Controls**

### **Purpose**
- Global settings for automation (e.g., enable/disable all, rate limits, notification preferences).

### **Key Components**
- **AutomationSettingsPanel**
  - Toggles: Enable all automation, enable notifications, set rate limits
  - Slack integration status
  - Default notification channels

---

# 🗂️ **Suggested File/Component Structure**

```
src/components/automation/
  rules-table.tsx
  rule-form.tsx
  rule-details-drawer.tsx
  templates-gallery.tsx
  template-preview-modal.tsx
  template-form.tsx
  rule-test-panel.tsx
  manual-executions-table.tsx
  summary-stats.tsx
  performance-charts.tsx
  top-rules-table.tsx
  recommendations-panel.tsx
  events-feed.tsx
  event-log-table.tsx
  event-details-modal.tsx
  settings-panel.tsx
```

---

# 📝 **UX/Design Notes**

- Use shadcn/ui for all modals, drawers, tables, and forms.
- Use TanStack Table for large data tables (rules, logs).
- Use recharts or similar for analytics charts.
- All actions should have confirmation dialogs and error handling.
- All forms should use React Hook Form + Zod for validation.
- Support dark mode and mobile responsiveness.
- Use badges and color coding for rule status, trigger types, and errors.
- Provide tooltips and inline help for complex config fields.

---

# 🚦 **Testing & Monitoring**

- All UI should show real-time status (loading, error, success).
- Use optimistic updates for rule activation/deactivation.
- Show toast notifications for all actions (success/error).
- Provide links from analytics to rule details and logs.

---

# 🏁 **MVP Priorities**

1. **AutomationRulesTable** + **AutomationRuleForm** (CRUD)
2. **AutomationSummaryStats** + **PerformanceCharts**
3. **AutomationRuleTestPanel** (manual/dry-run)
4. **AutomationEventLogTable** (searchable log)
5. **AutomationTemplatesGallery** (optional for v1)

---

**This spec covers every backend feature built so far that does not have a UI. It's designed for rapid manager understanding, debugging, and optimization of the automation system.** 