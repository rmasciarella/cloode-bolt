-- Optimal Database Schema for Template-Based OR-Tools CP-SAT Solver
-- Designed specifically for the current optimized solver delivering 5-8x performance improvements

-- =============================================================================
-- 1. CORE TEMPLATE STRUCTURE (HOT PATH OPTIMIZATION)
-- =============================================================================

-- Job templates define reusable task patterns for 5-8x performance gains
CREATE TABLE job_optimized_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    task_count INTEGER DEFAULT 0,
    total_min_duration_minutes INTEGER DEFAULT 0,
    critical_path_length_minutes INTEGER DEFAULT 0,
    
    -- Performance-critical: blessed parameters for CP-SAT solver
    solver_parameters JSONB DEFAULT '{}'::jsonb, -- Blessed parameters for production use
    
    -- Template metrics for performance tracking
    baseline_performance_seconds NUMERIC,
    optimized_performance_seconds NUMERIC,
    speedup_factor NUMERIC,
    last_benchmarked_at TIMESTAMPTZ,
    performance_target_seconds NUMERIC,
    optimization_techniques_applied TEXT[],
    symmetry_breaking_enabled BOOLEAN DEFAULT false,
    redundant_constraints_count INTEGER DEFAULT 0,
    is_blessed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template tasks - the core reusable structure
CREATE TABLE optimized_tasks (
    optimized_task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES job_optimized_patterns(pattern_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 1,
    department_id UUID REFERENCES departments(department_id),
    
    -- Solver-specific attributes
    is_unattended BOOLEAN DEFAULT FALSE,
    is_setup BOOLEAN DEFAULT FALSE,
    sequence_id TEXT REFERENCES sequence_resources(sequence_id), -- For sequence resource reservations (Opto, BAT)
    
    -- Multi-operator support (Phase 2)
    min_operators INTEGER DEFAULT 1,
    max_operators INTEGER DEFAULT 1,
    operator_efficiency_curve TEXT DEFAULT 'linear',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. DEPARTMENTS AND ORGANIZATIONAL STRUCTURE
-- =============================================================================

-- Departments for organizational structure
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(department_id),
    cost_center TEXT,
    default_shift_start INTEGER DEFAULT 32, -- 8 AM in 15-minute units
    default_shift_end INTEGER DEFAULT 64,   -- 4 PM in 15-minute units
    overtime_allowed BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business calendars for scheduling
CREATE TABLE business_calendars (
    calendar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    timezone TEXT DEFAULT 'UTC',
    default_start_time INTEGER DEFAULT 32, -- 8 AM in 15-minute units
    default_end_time INTEGER DEFAULT 64,   -- 4 PM in 15-minute units
    working_days_mask INTEGER DEFAULT 31,  -- Monday-Friday (bits 0-4)
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills for operator capabilities
CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    department_id UUID REFERENCES departments(department_id),
    complexity_level TEXT DEFAULT 'basic',
    training_hours_required INTEGER DEFAULT 0,
    certification_required BOOLEAN DEFAULT false,
    certification_expires_after_months INTEGER,
    market_hourly_rate NUMERIC,
    skill_scarcity_level TEXT DEFAULT 'common',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operators for human resources
CREATE TABLE operators (
    operator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    employee_number TEXT,
    department_id UUID REFERENCES departments(department_id),
    hourly_rate NUMERIC DEFAULT 25.00,
    max_hours_per_day INTEGER DEFAULT 8,
    max_hours_per_week INTEGER DEFAULT 40,
    overtime_rate_multiplier NUMERIC DEFAULT 1.5,
    employment_status TEXT DEFAULT 'active',
    efficiency_rating NUMERIC DEFAULT 1.0,
    quality_score NUMERIC DEFAULT 1.0,
    safety_score NUMERIC DEFAULT 1.0,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence resources for exclusive access constraints (Opto, BAT, etc.)
CREATE TABLE sequence_resources (
    sequence_id TEXT PRIMARY KEY, -- User-defined ID like 'Opto', 'BAT'
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(department_id),
    setup_time_minutes INTEGER DEFAULT 0,
    teardown_time_minutes INTEGER DEFAULT 0,
    max_concurrent_jobs INTEGER DEFAULT 1,
    resource_type TEXT DEFAULT 'exclusive',
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. MACHINE RESOURCES (MUST BE BEFORE TEMPLATE MODES)
-- =============================================================================

-- Work cells for capacity constraints (updated to match GUI)
CREATE TABLE work_cells (
    cell_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
    department_id UUID REFERENCES departments(department_id),
    wip_limit INTEGER,
    target_utilization NUMERIC DEFAULT 0.85,
    flow_priority INTEGER DEFAULT 1,
    floor_location TEXT,
    cell_type TEXT DEFAULT 'production',
    calendar_id UUID REFERENCES business_calendars(calendar_id),
    average_throughput_per_hour NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machine resources for constraint generation (updated to match GUI)
CREATE TABLE machines (
    machine_resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
    cost_per_hour NUMERIC DEFAULT 0.00,
    department_id UUID REFERENCES departments(department_id),
    cell_id UUID NOT NULL REFERENCES work_cells(cell_id),
    setup_time_minutes INTEGER DEFAULT 0,
    teardown_time_minutes INTEGER DEFAULT 0,
    maintenance_window_start INTEGER,
    maintenance_window_end INTEGER,
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    maintenance_interval_hours INTEGER DEFAULT 720,
    machine_type TEXT,
    manufacturer TEXT,
    model TEXT,
    year_installed INTEGER,
    efficiency_rating NUMERIC DEFAULT 1.0,
    average_utilization_percent NUMERIC,
    uptime_target_percent NUMERIC DEFAULT 95,
    calendar_id UUID REFERENCES business_calendars(calendar_id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template task modes - machine + duration combinations (NOW AFTER MACHINES)
CREATE TABLE optimized_task_modes (
    optimized_task_mode_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    machine_resource_id UUID NOT NULL REFERENCES machines(machine_resource_id),
    
    -- Duration in minutes (converted to 15-minute quarters by solver)
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template task setup times - setup time constraints between optimized tasks
CREATE TABLE optimized_task_setup_times (
    setup_time_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    to_optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    machine_resource_id UUID NOT NULL REFERENCES machines(machine_resource_id),
    setup_time_minutes INTEGER NOT NULL CHECK (setup_time_minutes >= 0),
    setup_type TEXT DEFAULT 'standard',
    complexity_level TEXT DEFAULT 'simple',
    requires_operator_skill TEXT,
    requires_certification BOOLEAN DEFAULT false,
    requires_supervisor_approval BOOLEAN DEFAULT false,
    setup_cost NUMERIC DEFAULT 0.00,
    efficiency_impact_percent NUMERIC DEFAULT 0.00,
    product_family_from TEXT,
    product_family_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent self-setup (from same task to same task)
    CHECK (from_optimized_task_id != to_optimized_task_id)
);

-- Template precedences - constraint relationships
CREATE TABLE optimized_precedences (
    precedence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES job_optimized_patterns(pattern_id) ON DELETE CASCADE,
    predecessor_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent self-precedence
    CHECK (predecessor_task_id != successor_task_id)
);

-- =============================================================================
-- 3. JOB INSTANCES (MINIMIZE LATENESS OBJECTIVE)
-- =============================================================================

-- Lightweight job instances referencing templates
CREATE TABLE job_instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES job_optimized_patterns(pattern_id), -- For backward compatibility
    pattern_id UUID REFERENCES job_optimized_patterns(pattern_id),   -- New preferred reference
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID,
    priority INTEGER DEFAULT 1,
    
    -- CRITICAL: Due date for minimize lateness objective function
    due_date TIMESTAMPTZ,
    earliest_start_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Instance details
    customer_order_id TEXT,
    batch_id TEXT,
    quantity INTEGER DEFAULT 1,
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    revenue_value NUMERIC,
    
    -- Instance status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed')),
    
    estimated_duration_hours NUMERIC,
    actual_duration_hours NUMERIC,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. SOLVED SCHEDULES (SOLUTION STORAGE)
-- =============================================================================

-- Solved schedules storing actual assignments
CREATE TABLE solved_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template context
    pattern_id UUID NOT NULL REFERENCES job_optimized_patterns(pattern_id),
    solution_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Solver performance metrics
    solve_time_seconds DECIMAL(10,3) NOT NULL,
    solver_status VARCHAR(50) NOT NULL,
    
    -- Objective values (minimize lateness focus)
    makespan_time_units INTEGER,
    total_lateness_minutes DECIMAL(10,2),
    maximum_lateness_minutes DECIMAL(10,2),
    
    -- Template performance tracking
    instance_count INTEGER NOT NULL,
    speedup_vs_legacy DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual task assignments in solved schedule
CREATE TABLE scheduled_tasks (
    scheduled_task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES solved_schedules(schedule_id),
    
    -- Task identification
    instance_id UUID NOT NULL REFERENCES job_instances(instance_id),
    optimized_task_id UUID NOT NULL REFERENCES optimized_tasks(optimized_task_id),
    
    -- Solution values (in 15-minute time units)
    start_time_units INTEGER NOT NULL CHECK (start_time_units >= 0),
    end_time_units INTEGER NOT NULL CHECK (end_time_units > start_time_units),
    
    -- Machine assignment
    assigned_machine_id UUID NOT NULL REFERENCES machines(machine_resource_id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. SEQUENCE RESOURCE RESERVATIONS (OPTO, BAT SEQUENCES)
-- =============================================================================

-- Sequence resource reservations (Opto, BAT sequences)
CREATE TABLE sequence_reservations (
    reservation_id UUID PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES solved_schedules(schedule_id),
    
    sequence_id VARCHAR(100) NOT NULL, -- "Opto", "BAT", etc.
    instance_id UUID NOT NULL REFERENCES job_instances(instance_id),
    
    -- Reservation time span (exclusive access)
    reservation_start_time_units INTEGER NOT NULL,
    reservation_end_time_units INTEGER NOT NULL CHECK (reservation_end_time_units > reservation_start_time_units),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. PERFORMANCE-CRITICAL INDEXES
-- =============================================================================

-- Hot path queries for solver performance
CREATE INDEX idx_optimized_tasks_pattern_id ON optimized_tasks(pattern_id);
CREATE INDEX idx_optimized_tasks_position ON optimized_tasks(position);
CREATE INDEX idx_optimized_tasks_department_id ON optimized_tasks(department_id);
CREATE INDEX idx_optimized_task_modes_optimized_task_id ON optimized_task_modes(optimized_task_id);
CREATE INDEX idx_optimized_task_setup_times_from_task ON optimized_task_setup_times(from_optimized_task_id);
CREATE INDEX idx_optimized_task_setup_times_to_task ON optimized_task_setup_times(to_optimized_task_id);
CREATE INDEX idx_optimized_task_setup_times_machine ON optimized_task_setup_times(machine_resource_id);
CREATE INDEX idx_optimized_precedences_pattern_id ON optimized_precedences(pattern_id);
CREATE INDEX idx_optimized_precedences_predecessor ON optimized_precedences(predecessor_task_id);
CREATE INDEX idx_optimized_precedences_successor ON optimized_precedences(successor_task_id);

-- Department and organizational structure indexes
CREATE INDEX idx_departments_code ON departments(code); 
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX idx_departments_is_active ON departments(is_active);

-- Work cell and machine indexes
CREATE INDEX idx_work_cells_department_id ON work_cells(department_id);
CREATE INDEX idx_work_cells_is_active ON work_cells(is_active);
CREATE INDEX idx_machines_department_id ON machines(department_id);
CREATE INDEX idx_machines_cell_id ON machines(cell_id);
CREATE INDEX idx_machines_is_active ON machines(is_active);

-- Calendar indexes
CREATE INDEX idx_business_calendars_is_default ON business_calendars(is_default);
CREATE INDEX idx_business_calendars_is_active ON business_calendars(is_active);

-- Skill indexes  
CREATE INDEX idx_skills_department_id ON skills(department_id);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_complexity_level ON skills(complexity_level);
CREATE INDEX idx_skills_is_active ON skills(is_active);

-- Operator indexes
CREATE INDEX idx_operators_department_id ON operators(department_id);
CREATE INDEX idx_operators_employee_number ON operators(employee_number);
CREATE INDEX idx_operators_employment_status ON operators(employment_status);
CREATE INDEX idx_operators_is_active ON operators(is_active);

-- Sequence resource indexes
CREATE INDEX idx_sequence_resources_department_id ON sequence_resources(department_id);
CREATE INDEX idx_sequence_resources_resource_type ON sequence_resources(resource_type);
CREATE INDEX idx_sequence_resources_is_active ON sequence_resources(is_active);

-- Job instance queries for constraint generation
CREATE INDEX idx_job_instances_pattern_id ON job_instances(pattern_id);
CREATE INDEX idx_job_instances_template_id ON job_instances(template_id); -- For backward compatibility
CREATE INDEX idx_job_instances_due_date ON job_instances(due_date);
CREATE INDEX idx_job_instances_status ON job_instances(status);

-- Machine assignment queries
CREATE INDEX idx_optimized_task_modes_machine_id ON optimized_task_modes(machine_resource_id);
CREATE INDEX idx_scheduled_tasks_machine_id ON scheduled_tasks(assigned_machine_id);

-- Schedule retrieval optimization
CREATE INDEX idx_solved_schedules_pattern_id ON solved_schedules(pattern_id);
CREATE INDEX idx_scheduled_tasks_schedule_id ON scheduled_tasks(schedule_id);
CREATE INDEX idx_scheduled_tasks_instance_task ON scheduled_tasks(instance_id, optimized_task_id);

-- Sequence resource queries
CREATE INDEX idx_sequence_reservations_sequence_id ON sequence_reservations(sequence_id);
CREATE INDEX idx_sequence_reservations_schedule_id ON sequence_reservations(schedule_id);

-- =============================================================================
-- 7. TEMPLATE PERFORMANCE TRACKING VIEWS
-- =============================================================================

-- Template performance summary for optimization tracking
CREATE VIEW template_performance_summary AS
SELECT 
    jop.pattern_id,
    jop.name as pattern_name,
    COUNT(ss.schedule_id) as solve_count,
    AVG(ss.solve_time_seconds) as avg_solve_time,
    AVG(ss.speedup_vs_legacy) as avg_speedup_factor,
    MAX(ss.instance_count) as max_instances_solved,
    AVG(ss.total_lateness_minutes) as avg_total_lateness
FROM job_optimized_patterns jop
LEFT JOIN solved_schedules ss ON jop.pattern_id = ss.pattern_id
GROUP BY jop.pattern_id, jop.name;

-- Compatibility view for GUI forms that expect job_templates table
CREATE VIEW job_templates AS
SELECT 
    pattern_id as template_id,
    name,
    description,
    solver_parameters,
    is_active,
    created_at,
    updated_at
FROM job_optimized_patterns;

-- Constraint generation optimization view
CREATE VIEW constraint_generation_stats AS
SELECT 
    jop.pattern_id,
    jop.name,
    COUNT(ot.optimized_task_id) as task_count,
    COUNT(otm.optimized_task_mode_id) as mode_count,
    COUNT(op.precedence_id) as precedence_count,
    -- Complexity estimate: O(optimized_tasks × instances)
    COUNT(ot.optimized_task_id) * COALESCE(MAX(instance_counts.count), 0) as constraint_complexity
FROM job_optimized_patterns jop
LEFT JOIN optimized_tasks ot ON jop.pattern_id = ot.pattern_id
LEFT JOIN optimized_task_modes otm ON ot.optimized_task_id = otm.optimized_task_id
LEFT JOIN optimized_precedences op ON jop.pattern_id = op.pattern_id
LEFT JOIN (
    SELECT COALESCE(pattern_id, template_id) as pattern_id, COUNT(*) as count 
    FROM job_instances 
    WHERE pattern_id IS NOT NULL OR template_id IS NOT NULL
    GROUP BY COALESCE(pattern_id, template_id)
) instance_counts ON jop.pattern_id = instance_counts.pattern_id
GROUP BY jop.pattern_id, jop.name;

-- =============================================================================
-- 8. STORED PROCEDURES FOR SOLVER INTEGRATION
-- =============================================================================

-- Hot path: Load complete template structure for solver
CREATE OR REPLACE FUNCTION load_pattern_for_solver(p_pattern_id UUID)
RETURNS TABLE (
    -- Template metadata
    pattern_name TEXT,
    solver_parameters JSONB,
    
    -- Template tasks
    task_id UUID,
    task_name TEXT,
    is_unattended BOOLEAN,
    sequence_id TEXT,
    
    -- Task modes (machine + duration combinations)
    mode_id UUID,
    machine_id UUID,
    duration_minutes INTEGER,
    
    -- Precedences
    predecessor_task_id UUID,
    successor_task_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jop.name,
        jop.solver_parameters,
        
        ot.optimized_task_id,
        ot.name,
        ot.is_unattended,
        ot.sequence_id,
        
        otm.optimized_task_mode_id,
        otm.machine_resource_id,
        otm.duration_minutes,
        
        op.predecessor_task_id,
        op.successor_task_id
        
    FROM job_optimized_patterns jop
    LEFT JOIN optimized_tasks ot ON jop.pattern_id = ot.pattern_id
    LEFT JOIN optimized_task_modes otm ON ot.optimized_task_id = otm.optimized_task_id
    LEFT JOIN optimized_precedences op ON jop.pattern_id = op.pattern_id
    WHERE jop.pattern_id = p_pattern_id
    ORDER BY ot.optimized_task_id, otm.optimized_task_mode_id;
END;
$$ LANGUAGE plpgsql;

-- Load job instances for pattern-based solving
CREATE OR REPLACE FUNCTION load_job_instances_for_pattern(
    p_pattern_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    instance_id UUID,
    name TEXT,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ji.instance_id,
        ji.name,
        ji.description,
        ji.due_date,
        ji.status
    FROM job_instances ji
    WHERE (ji.pattern_id = p_pattern_id OR ji.template_id = p_pattern_id)
      AND ji.status IN ('pending', 'scheduled')
    ORDER BY ji.due_date ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Store solved schedule with performance metrics
CREATE OR REPLACE FUNCTION store_solved_schedule(
    p_pattern_id UUID,
    p_solve_time_seconds DECIMAL(10,3),
    p_solver_status VARCHAR(50),
    p_makespan_time_units INTEGER,
    p_total_lateness_minutes DECIMAL(10,2),
    p_instance_count INTEGER,
    p_speedup_vs_legacy DECIMAL(5,2)
) RETURNS UUID AS $$
DECLARE
    schedule_id UUID;
BEGIN
    INSERT INTO solved_schedules (
        pattern_id,
        solve_time_seconds,
        solver_status,
        makespan_time_units,
        total_lateness_minutes,
        instance_count,
        speedup_vs_legacy
    ) VALUES (
        p_pattern_id,
        p_solve_time_seconds,
        p_solver_status,
        p_makespan_time_units,
        p_total_lateness_minutes,
        p_instance_count,
        p_speedup_vs_legacy
    ) RETURNING solved_schedules.schedule_id INTO schedule_id;
    
    RETURN schedule_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE job_optimized_patterns IS 'Pattern definitions for 5-8x performance optimization through constraint reuse';
COMMENT ON TABLE optimized_tasks IS 'Reusable task structure enabling O(pattern × instances) complexity';
COMMENT ON TABLE optimized_task_modes IS 'Machine-duration combinations for constraint generation';
COMMENT ON TABLE optimized_task_setup_times IS 'Setup time constraints between optimized tasks on specific machines';
COMMENT ON TABLE optimized_precedences IS 'Pattern precedence relationships for constraint reuse';
COMMENT ON TABLE job_instances IS 'Lightweight job instances with due dates for minimize lateness objective';
COMMENT ON TABLE solved_schedules IS 'Performance tracking and solution storage for pattern-based schedules';
COMMENT ON TABLE scheduled_tasks IS 'Individual task assignments in solved schedules';
COMMENT ON TABLE sequence_reservations IS 'Sequence resource reservations (Opto, BAT) for exclusive access constraints';

-- New GUI-required tables
COMMENT ON TABLE departments IS 'Organizational departments with hierarchical structure and shift scheduling';
COMMENT ON TABLE work_cells IS 'Production work cells with capacity and WIP constraints';
COMMENT ON TABLE machines IS 'Machine resources with maintenance schedules and efficiency tracking';
COMMENT ON TABLE business_calendars IS 'Working time calendars with timezone and working days configuration';
COMMENT ON TABLE operators IS 'Human resources with skills, ratings, and work hour constraints';
COMMENT ON TABLE skills IS 'Skill definitions with complexity levels and certification requirements';
COMMENT ON TABLE sequence_resources IS 'Exclusive access resources like Opto, BAT sequences with setup/teardown times';

COMMENT ON COLUMN job_optimized_patterns.solver_parameters IS 'Blessed CP-SAT parameters for production solving';
COMMENT ON COLUMN job_instances.due_date IS 'Critical for minimize lateness objective function';
COMMENT ON COLUMN optimized_tasks.sequence_id IS 'Opto/BAT sequence resource identifier for reservations';
COMMENT ON COLUMN optimized_tasks.is_unattended IS 'Unattended task scheduling capability';
COMMENT ON COLUMN solved_schedules.speedup_vs_legacy IS 'Pattern performance vs legacy job-shop scheduling';

COMMENT ON FUNCTION load_pattern_for_solver IS 'Hot path: Single query loads complete pattern structure for solver';
COMMENT ON FUNCTION store_solved_schedule IS 'Store solution with performance metrics and speedup tracking';