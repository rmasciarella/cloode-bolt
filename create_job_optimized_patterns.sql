-- Create job_optimized_patterns table and related tables for GUI
CREATE TABLE IF NOT EXISTS public.job_optimized_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    task_count INTEGER DEFAULT 0,
    total_min_duration_minutes INTEGER DEFAULT 0,
    critical_path_length_minutes INTEGER DEFAULT 0,
    baseline_performance_seconds NUMERIC,
    optimized_performance_seconds NUMERIC,
    speedup_factor NUMERIC,
    last_benchmarked_at TIMESTAMPTZ,
    performance_target_seconds NUMERIC,
    solver_parameters JSONB DEFAULT '{}'::jsonb,
    optimization_techniques_applied TEXT[],
    symmetry_breaking_enabled BOOLEAN DEFAULT false,
    redundant_constraints_count INTEGER DEFAULT 0,
    is_blessed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.optimized_tasks (
    optimized_task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES public.job_optimized_patterns(pattern_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 1,
    department_id UUID,
    is_unattended BOOLEAN DEFAULT false,
    is_setup BOOLEAN DEFAULT false,
    sequence_id TEXT,
    min_operators INTEGER DEFAULT 1,
    max_operators INTEGER DEFAULT 1,
    operator_efficiency_curve TEXT DEFAULT 'linear',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.optimized_precedences (
    precedence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES public.job_optimized_patterns(pattern_id) ON DELETE CASCADE,
    predecessor_task_id UUID NOT NULL REFERENCES public.optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES public.optimized_tasks(optimized_task_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_optimized_tasks_pattern_id ON public.optimized_tasks(pattern_id);
CREATE INDEX IF NOT EXISTS idx_optimized_precedences_pattern_id ON public.optimized_precedences(pattern_id);

-- Insert sample data
INSERT INTO public.job_optimized_patterns (name, description, task_count, solver_parameters) VALUES
('Manufacturing Template A', 'Standard manufacturing workflow', 5, '{"num_search_workers": 8}'),
('Assembly Line B', 'Complex assembly line', 8, '{"num_search_workers": 16}')
ON CONFLICT (pattern_id) DO NOTHING;