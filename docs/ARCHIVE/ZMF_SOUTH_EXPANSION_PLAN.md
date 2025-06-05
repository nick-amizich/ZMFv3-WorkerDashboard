# ZMF-South Machine Shop Expansion Plan

## Executive Summary
The ZMF-South expansion will create a specialized machine shop management system that seamlessly integrates with the existing ZMFv3 Worker Dashboard. This system will handle CNC machining operations for headphone cups and baffles while maintaining full visibility and coordination with the North facility's assembly operations.

## 🎯 Project Goals

1. **Seamless Integration**: Leverage existing authentication, worker management, and order systems
2. **Specialized Features**: Add machine shop-specific functionality without disrupting current operations
3. **Real-time Coordination**: Enable cross-facility visibility and communication
4. **Minimal Duplication**: Reuse existing components and extend only where necessary
5. **Scalable Architecture**: Design for future multi-location expansion

## 🔗 Integration Strategy

### Shared Systems (No Duplication)
- **Authentication**: Use existing Supabase auth with location-based permissions
- **Workers Table**: Add `primary_location` field to existing workers table
- **Orders/Order Items**: Shared order pool with location-based filtering
- **Notification System**: Extend existing system for cross-location alerts
- **QC Framework**: Adapt existing QC system for machining-specific checks

### Extended Systems
- **Work Tasks**: Add `location_id` and `machine_id` fields
- **Work Batches**: Add `manufacturing_location` field
- **Component Tracking**: Add machining-specific fields (material_batch, cnc_program_version)
- **Time Logs**: Already location-aware through worker assignment

### New Systems (ZMF-South Specific)
1. **Machine Shop Tables** (as outlined in your spec)
2. **Material Inventory Management**
3. **CNC Program Version Control**
4. **Cross-Facility Transfer Tracking**

## 📊 Database Schema Extensions

### 1. Location Management
```sql
-- Add to existing schema
ALTER TABLE workers ADD COLUMN primary_location text DEFAULT 'north';
ALTER TABLE work_tasks ADD COLUMN location_id uuid REFERENCES locations(id);
ALTER TABLE work_tasks ADD COLUMN machine_id uuid REFERENCES machines(id);
ALTER TABLE work_batches ADD COLUMN manufacturing_location text;

-- New table
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL, -- 'north', 'south'
  address text,
  timezone text DEFAULT 'America/New_York',
  active boolean DEFAULT true
);
```

### 2. Inter-Facility Transfers
```sql
CREATE TABLE facility_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES work_batches(id),
  from_location uuid REFERENCES locations(id),
  to_location uuid REFERENCES locations(id),
  transfer_type enum ('components', 'materials', 'finished_goods'),
  quantity integer NOT NULL,
  status enum ('pending', 'in_transit', 'received', 'cancelled'),
  shipped_date timestamp,
  received_date timestamp,
  tracking_number text,
  notes text,
  created_by uuid REFERENCES workers(auth_user_id),
  created_at timestamp DEFAULT now()
);
```

### 3. Machine Shop Specific Tables
[Use tables from your specification with these additions:]
- Add RLS policies for location-based access
- Add audit triggers for all tables
- Add indexes for common queries
- Integration fields for existing systems

## 🏗️ Architecture Plan

### Subdomain Structure
- **Main App**: app.zmfheadphones.com (existing)
- **South Facility**: south.zmfheadphones.com (new)
- **Shared API**: api.zmfheadphones.com (enhanced)

### Technical Approach
1. **Monorepo Structure**: Keep both apps in same repository
2. **Shared Components**: Create packages for shared UI/logic
3. **Environment-Based Config**: Use env vars for location-specific settings
4. **Shared Database**: Single Supabase instance with RLS
5. **Real-time Updates**: Leverage existing Supabase realtime

### Folder Structure
```
/ZMFv3-WorkerDashboard/
├── apps/
│   ├── main/          (existing app)
│   └── south/         (new machine shop app)
├── packages/
│   ├── shared-ui/     (common components)
│   ├── database/      (shared types & queries)
│   └── business-logic/(shared functions)
├── supabase/
│   └── migrations/    (unified migrations)
```

## 🚀 Implementation Milestones

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish multi-location infrastructure

**Tasks**:
- [ ] Set up monorepo structure
- [ ] Configure subdomain routing
- [ ] Add location fields to existing tables
- [ ] Create location-aware RLS policies
- [ ] Build location switcher UI component

**Validation**:
- Workers can log in and see location-specific data
- Existing functionality remains intact
- Location switching works correctly

### Phase 2: Core Machine Shop (Weeks 3-5)
**Goal**: Implement essential machine shop features

**Tasks**:
- [ ] Create parts catalog management
- [ ] Build machine settings interface
- [ ] Implement production request system
- [ ] Add daily production logging
- [ ] Create basic inventory tracking

**Validation**:
- Can create and manage parts
- Can log daily production
- Inventory updates automatically
- Data flows to main dashboard

### Phase 3: Quality & Issues (Weeks 6-7)
**Goal**: Adapt QC system for machining

**Tasks**:
- [ ] Extend QC system for dimensional checks
- [ ] Build measurement entry interface
- [ ] Create issue reporting system
- [ ] Implement North-South communication flow
- [ ] Add QC certificate generation

**Validation**:
- QC data integrates with existing system
- Issues appear in both locations
- Certificates generate correctly

### Phase 4: Advanced Features (Weeks 8-10)
**Goal**: Add efficiency and intelligence features

**Tasks**:
- [ ] Build production scheduling system
- [ ] Add material optimization algorithms
- [ ] Create machine utilization dashboard
- [ ] Implement predictive maintenance alerts
- [ ] Add cost tracking and analytics

**Validation**:
- Scheduling reduces conflicts
- Analytics show accurate data
- Alerts trigger appropriately

### Phase 5: Integration & Polish (Weeks 11-12)
**Goal**: Full system integration and optimization

**Tasks**:
- [ ] Complete cross-facility dashboard
- [ ] Add mobile responsive design
- [ ] Implement offline capability
- [ ] Performance optimization
- [ ] Security audit and hardening

**Validation**:
- <5s load times
- Works on mobile devices
- Passes security audit
- Zero data inconsistencies

## 🧪 Testing Strategy

### 1. Unit Testing
- Test all new database functions
- Test business logic calculations
- Test component rendering
- Coverage target: 80%

### 2. Integration Testing
- Test data flow between locations
- Test real-time updates
- Test permission boundaries
- Test API endpoints

### 3. E2E Testing
- Complete production workflows
- Cross-facility transfers
- QC process end-to-end
- Issue reporting flow

### 4. Performance Testing
- Load test with 1000+ concurrent users
- Test with large datasets (100k+ records)
- Mobile network performance
- Real-time update latency

### 5. User Acceptance Testing
- Beta test with 5 operators
- Collect feedback for 2 weeks
- Iterate based on feedback
- Final approval from stakeholders

## 📋 Validation Checkpoints

### After Each Phase:
1. **Code Review**: All PRs reviewed by senior dev
2. **Automated Tests**: 100% pass rate required
3. **Manual Testing**: QA checklist completed
4. **Performance**: Meets defined benchmarks
5. **Security**: No new vulnerabilities
6. **Documentation**: Updated and complete
7. **User Training**: Materials prepared

### Final Validation:
1. **Data Integrity**: Zero orphaned records
2. **Cross-Location Sync**: <1s delay
3. **Mobile Performance**: 90+ Lighthouse score
4. **Error Rate**: <0.1% transaction failures
5. **User Satisfaction**: 4.5+ star rating

## 🎯 Success Metrics

### Technical Metrics:
- 99.9% uptime
- <500ms average response time
- Zero data loss incidents
- 100% RLS policy coverage

### Business Metrics:
- 50% reduction in production planning time
- 30% improvement in material utilization
- 25% decrease in quality issues
- 40% faster issue resolution

### User Metrics:
- 90% daily active usage
- <2 hours training required
- 4.5+ satisfaction score
- <5 support tickets/week

## 🔄 Rollout Strategy

### Week 1: Soft Launch
- 5 power users only
- Full monitoring enabled
- Daily check-ins
- Immediate bug fixes

### Week 2: Limited Release
- 25% of South office
- Gather feedback
- Performance monitoring
- Training sessions

### Week 3: Full South Release
- All South office users
- North office read-only access
- Support team ready
- Documentation complete

### Week 4: Full Integration
- All features enabled
- Cross-facility workflows
- Performance optimization
- Success celebration! 🎉

## 🚨 Risk Mitigation

### Technical Risks:
- **Data Loss**: Hourly backups, transaction logs
- **Performance**: Caching, query optimization
- **Integration Failures**: Circuit breakers, fallbacks
- **Security Breaches**: Regular audits, monitoring

### Business Risks:
- **User Adoption**: Training, support, incentives
- **Process Disruption**: Parallel run period
- **Cost Overruns**: Phased approach, regular reviews
- **Scope Creep**: Strict change control

## 💰 Resource Requirements

### Development Team:
- 1 Senior Full-Stack Developer (lead)
- 1 Full-Stack Developer
- 1 UI/UX Designer (part-time)
- 1 QA Engineer (part-time)
- 1 DevOps Engineer (part-time)

### Infrastructure:
- Supabase Pro plan upgrade
- Vercel Pro plan
- Monitoring tools (Sentry, etc.)
- Development/staging environments

### Timeline: 12 weeks
### Budget: $120,000 - $150,000

## 🎉 Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create project boards and sprints
4. Begin Phase 1 implementation
5. Schedule weekly progress reviews

---

This plan ensures ZMF-South integrates seamlessly with your existing system while adding powerful machine shop capabilities. The phased approach minimizes risk while delivering value early and often.

Ready to start building! 🚀