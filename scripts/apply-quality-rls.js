const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyQualityRLS() {
  console.log('Applying quality system RLS policies...');
  
  const migration = `
    -- Fix RLS policies for quality system tables
    -- These policies failed to apply due to incorrect table references

    -- Enable RLS on all quality tables
    ALTER TABLE component_tracking ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quality_checkpoints ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;

    -- Component Tracking policies
    CREATE POLICY "Workers view all components" ON component_tracking
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "Workers update components" ON component_tracking
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "Supervisors insert components" ON component_tracking
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.role IN ('supervisor', 'manager')
                AND workers.active = true
            )
        );

    -- Quality Checkpoints policies
    CREATE POLICY "Workers view checkpoints" ON quality_checkpoints
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "Managers manage checkpoints" ON quality_checkpoints
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.role = 'manager'
                AND workers.active = true
            )
        );

    -- Inspection Results policies
    CREATE POLICY "Workers view inspections" ON inspection_results
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "Workers create inspections" ON inspection_results
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
                AND workers.id = inspected_by
            )
        );

    -- Quality Patterns policies
    CREATE POLICY "Workers view patterns" ON quality_patterns
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "System manages patterns" ON quality_patterns
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.role = 'manager'
                AND workers.active = true
            )
        );

    -- Quality Holds policies
    CREATE POLICY "Workers view holds" ON quality_holds
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.active = true
            )
        );

    CREATE POLICY "Supervisors manage holds" ON quality_holds
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM workers
                WHERE workers.auth_user_id = auth.uid()
                AND workers.role IN ('supervisor', 'manager')
                AND workers.active = true
            )
        );
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migration
    });

    if (error) {
      console.error('Error applying migration:', error);
      return;
    }

    console.log('Successfully applied quality RLS policies!');
  } catch (error) {
    console.error('Error:', error);
  }
}

applyQualityRLS();