# CLAUDE.md

**🔄 Active Context**: @/docs/worklog/active/CURRENT.md

OR-Tools constraint programming solver optimized for template-based scheduling.

## Core Workflow

**CRITICAL**: Use UV prefix for all Python commands: `uv run python script.py`

```bash
# Core Development Workflow
make lint                    # Complete quality check: ruff + black + mypy (REQUIRED)
uv run python run_tests.py   # Run all tests with coverage

# Template-Based Development
uv run python scripts/validate_template_performance.py  # Validate template patterns
uv run python scripts/run_production_solver.py         # Production template solver
/optimized-benchmark <pattern_id>                       # Claude command for analysis
```

### Core Components

**Data Layer**:
- `src/data/loaders/optimized_database.py` - OptimizedDatabaseLoader for O(pattern_size × instances) performance
- `src/data/loaders/database.py` - Legacy DatabaseLoader for backward compatibility
- `schema/optimized_solver_schema.sql` - Optimized database schema

**Solver Engine**:
- `src/solver/core/solver.py` - Main CP-SAT solver with 3-phase optimization
- `src/solver/models/problem.py` - Problem models (SchedulingProblem, OptimizedTask, JobOptimizedPattern)
- `src/solver/templates/optimized_optimizer.py` - Template-based optimization engine

**Constraint System**:
- `src/solver/constraints/phase1/` - Core scheduling constraints (timing, capacity, precedence)
- `src/solver/constraints/phase2/` - Advanced optimization (skill matching, shift calendars)
- `src/solver/constraints/phase3/` - Multi-objective optimization (Pareto optimization)

**Performance & Monitoring**:
- `src/performance/benchmarks.py` - Performance regression testing
- `src/operations/performance_monitoring.py` - Real-time performance monitoring
- `src/solver/visualization/trade_off_visualizer.py` - Solution trade-off analysis

**Framework**: OR-Tools CP-SAT with 100% type safety (mypy)
**Approach**: Template-based optimization for efficient constraint solving

## Template Development Workflow

1. **Create**: Use `OptimizedDatabaseLoader`
2. **Benchmark**: `scripts/validate_optimized_performance.py`
3. **Optimize**: `/optimized-optimize-params <pattern_id>`
4. **Deploy**: `/optimized-promote-params <pattern_id> <params.json>`

**Optimization Priority**: Symmetry Breaking > Parameter Tuning > Solution Hinting

## Context Loading

**Context Loading Strategy**: Additional documentation is available on-demand rather than preloaded:
```bash
/standards     # Load STANDARDS.md when adding constraints
/commands      # Load COMMANDS.md for complete command reference  
/templates     # Load TEMPLATES.md for code generation
/workflows     # Load WORKFLOWS.md for step-by-step processes
/debug-help    # Load TROUBLESHOOTING.md for debugging workflows
/prompts       # Load PROMPTS.md for effective prompt patterns
/context       # Load CONTEXT.md for domain knowledge and edge cases
/development   # Load DEVELOPMENT.md for core components and architecture details
/gui-context   # Load GUI component patterns and form standards
/solver-context # Load constraint patterns and optimization templates
/integration   # Load GUI-solver integration patterns
/testing-patterns # Load testing strategies for both stacks
/performance   # Load performance optimization guidelines
/docs-help     # Load documentation and report files on-demand
```

## Command Reference

```bash
# Constraint Development
/ac <name>     # Add constraint
/tc <name>     # Generate tests
/cc <function> # Check standards

# Full-Stack Development
/gui-dev       # Start GUI dev server + watch backend
/full-test     # Run both backend tests + GUI playwright tests
/type-check    # Check types: mypy (backend) + tsc (frontend)
/gui-form <name> # Generate new form component + validation
/solver-run    # Quick solver test with sample data
/db-sync       # Sync database schema + regenerate types
/integration-test # Test GUI->solver data flow
/deploy-check  # Full production readiness check

# Performance & Monitoring
/perf-solver <size>  # Measure solver performance
/perf-gui           # Measure GUI build performance
/perf-report        # Generate performance report
/optimized-benchmark <pattern_id>
/optimized-optimize-params <pattern_id>

# Debugging
/ti            # Trace infeasible
/ps            # Profile performance
/debug-slow    # Performance workflow
/debug-integration # Debug GUI-solver integration issues
```

## Standards

**Type Safety**: 100% mypy compliance required
**Imports**: `from .types import TaskStartDict, TaskEndDict, TaskKey`
**Functions**: Max 30 lines, single responsibility
**Variables**: `task_starts[(job_id, task_id)]`
**Time Units**: 15-minute intervals
**Testing**: GIVEN-WHEN-THEN pattern

## Worklog Maintenance

**CRITICAL**: Keep `/docs/worklog/active/CURRENT.md` under 200 lines and current:

- **Update frequently**: After major task transitions, blocker discoveries, or significant progress
- **Remove completed items**: Archive finished work to `/docs/worklog/archive/YYYY-MM-DD.md`
- **Focus on immediate context**: Current focus, active files, blockers, next 2-3 steps only
- **Clean old entries**: Remove irrelevant discoveries and outdated next steps
- **Archive daily**: Move CURRENT.md to archive at end of each development session

## Session Continuity

For template development sessions:
```
"Continue template pattern {pattern_id}.
Focus: {specific_area}"
```

## Database Configuration

**Supabase Project**: `https://hnrysjrydbhrnqqkrqir.supabase.co`

## Dependencies

`uv add ortools ortools-stubs supabase python-dotenv pytest pytest-cov ruff black mypy`
