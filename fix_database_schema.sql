-- Fix Database Schema Issues
-- This script adds missing tables and columns identified by the debugging agents

-- 1. Add missing columns to sequence_resources table
-- The debugging agent found that these columns are missing from the deployed database

ALTER TABLE sequence_resources 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
ADD COLUMN IF NOT EXISTS utilization_target_percent DECIMAL(5,2) DEFAULT 80.0,
ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES business_calendars(calendar_id),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority > 0);

-- 2. Create the optimized_task_setup_times table that's missing from the database
-- This table is required for the Setup Times form to function

CREATE TABLE IF NOT EXISTS optimized_task_setup_times (
    setup_time_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    to_optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    machine_resource_id UUID NOT NULL REFERENCES machines(machine_resource_id) ON DELETE CASCADE,
    
    -- Setup time configuration
    setup_time_minutes INTEGER NOT NULL CHECK (setup_time_minutes >= 0),
    
    -- Setup complexity and requirements
    setup_type VARCHAR(50) DEFAULT 'standard' CHECK (
        setup_type IN ('standard', 'complex', 'tooling_change', 'calibration', 'cleaning')
    ),
    complexity_level VARCHAR(20) DEFAULT 'simple' CHECK (
        complexity_level IN ('simple', 'moderate', 'complex', 'expert_required')
    ),
    
    -- Setup requirements
    requires_operator_skill VARCHAR(20) CHECK (
        requires_operator_skill IN ('NOVICE', 'COMPETENT', 'PROFICIENT', 'EXPERT')
    ),
    requires_certification BOOLEAN DEFAULT FALSE,
    requires_supervisor_approval BOOLEAN DEFAULT FALSE,
    
    -- Cost and efficiency tracking
    setup_cost DECIMAL(8,2) DEFAULT 0.00 CHECK (setup_cost >= 0),
    efficiency_impact_percent DECIMAL(5,2) DEFAULT 0.00 CHECK (efficiency_impact_percent >= -100 AND efficiency_impact_percent <= 100),
    
    -- Product family classifications for grouping
    product_family_from VARCHAR(50),
    product_family_to VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (from_optimized_task_id != to_optimized_task_id),
    UNIQUE (from_optimized_task_id, to_optimized_task_id, machine_resource_id)
);

-- 3. Add comments for documentation
COMMENT ON TABLE optimized_task_setup_times IS 'CRITICAL: Setup times matching exact constraint interface dict[tuple[str, str, str], int]';
COMMENT ON COLUMN sequence_resources.capacity IS 'Resource capacity (e.g., number of QC stations in a pool)';
COMMENT ON COLUMN sequence_resources.utilization_target_percent IS 'Target utilization for optimization algorithms';
COMMENT ON COLUMN sequence_resources.calendar_id IS 'Business calendar reference for scheduling constraints';
COMMENT ON COLUMN sequence_resources.priority IS 'Resource priority for scheduling conflicts';

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setup_times_from_task ON optimized_task_setup_times(from_optimized_task_id);
CREATE INDEX IF NOT EXISTS idx_setup_times_to_task ON optimized_task_setup_times(to_optimized_task_id);
CREATE INDEX IF NOT EXISTS idx_setup_times_machine ON optimized_task_setup_times(machine_resource_id);
CREATE INDEX IF NOT EXISTS idx_sequence_resources_department ON sequence_resources(department_id);
CREATE INDEX IF NOT EXISTS idx_sequence_resources_calendar ON sequence_resources(calendar_id);

COMMIT;