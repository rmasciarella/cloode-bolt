# Modular Solver Makefile

PYTHON = .venv/bin/python
UV_RUN = PYTHONPATH=src uv run

# --- Environment Setup ---

dev:
	uv venv --python=3.11
	uv pip install --requirements .uv.lock

lock:
	uv pip compile --output-file .uv.lock pyproject.toml

relock:
	uv pip compile --upgrade --output-file .uv.lock pyproject.toml

# --- Code Quality ---

lint:
	uv run ruff check .
	uv run black --check .
	uv run mypy src/

format:
	uv run black .
	uv run ruff check . --fix

check-format:
	uv run black --check .

# --- Testing ---

test:
	$(UV_RUN) pytest

test-cov:
	$(UV_RUN) pytest --cov=solver --cov-report=term-missing

# --- Run App ---

run:
	$(UV_RUN) python src/solver/main.py

# --- Full-Stack Development ---

gui-dev:
	cd gui && npm run dev

gui-build:
	cd gui && npm run build

gui-test:
	cd gui && npm run test

full-test: test gui-test

type-check: lint
	cd gui && npm run type-check

db-sync:
	supabase db push
	cd gui && supabase gen types typescript --project-id hnrysjrydbhrnqqkrqir > lib/database.types.ts

integration-test:
	$(UV_RUN) python scripts/test_gui_integration.py

deploy-check: type-check full-test gui-build

# --- Performance Monitoring ---

perf-solver:
	$(UV_RUN) python scripts/performance_monitor.py solver

perf-gui:
	$(UV_RUN) python scripts/performance_monitor.py gui-build

perf-report:
	$(UV_RUN) python scripts/performance_monitor.py report

# --- Development Workflows ---

dev-workflow:
	$(UV_RUN) python scripts/dev_workflow.py

# --- CI Gate ---

ci: lint check-format test

# --- Cleanup ---

clean:
	rm -rf .venv .pytest_cache .ruff_cache .mypy_cache .uv.lock __pycache__ dist build
	cd gui && rm -rf .next node_modules/.cache

.PHONY: dev lock relock lint format check-format test test-cov run clean ci gui-dev gui-build gui-test full-test type-check db-sync integration-test deploy-check perf-solver perf-gui perf-report dev-workflow
