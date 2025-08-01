#!/usr/bin/env python3
"""Development workflow automation for Fresh Solver.
Integrates GUI and solver development workflows.
"""

import os
import subprocess
import sys
import time


def run_command(cmd: str, cwd: str = None, capture=False):
    """Run shell command with proper error handling."""
    try:
        if capture:
            result = subprocess.run(
                cmd, shell=True, cwd=cwd, capture_output=True, text=True
            )
            return result.stdout.strip()
        else:
            subprocess.run(cmd, shell=True, cwd=cwd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}")
        print(f"Error: {e}")
        sys.exit(1)


def gui_dev():
    """Start GUI development server."""
    print("🎨 Starting GUI development server...")
    os.chdir("gui")
    subprocess.run(["npm", "run", "dev"])


def backend_watch():
    """Watch backend files and run tests on changes."""
    print("🔧 Watching backend files...")
    subprocess.run(["uv", "run", "ptw", "--", "--cov=src"])


def full_test():
    """Run comprehensive test suite for both stacks."""
    print("🧪 Running full test suite...")

    # Backend tests
    print("Testing backend...")
    run_command("uv run python run_tests.py")

    # GUI tests
    print("Testing GUI...")
    os.chdir("gui")
    run_command("npm run test")
    os.chdir("..")

    print("✅ All tests passed!")


def type_check():
    """Check types for both backend and frontend."""
    print("📝 Type checking...")

    # Backend mypy
    print("Checking backend types...")
    run_command("uv run mypy src/")

    # Frontend TypeScript
    print("Checking frontend types...")
    os.chdir("gui")
    run_command("npx tsc --noEmit")
    os.chdir("..")

    print("✅ Type checking passed!")


def db_sync():
    """Sync database schema and regenerate types."""
    print("🗄️ Syncing database...")

    # Apply schema changes
    run_command("supabase db push")

    # Regenerate TypeScript types
    os.chdir("gui")
    run_command(
        "supabase gen types typescript --project-id hnrysjrydbhrnqqkrqir > lib/database.types.ts"
    )
    os.chdir("..")

    print("✅ Database sync complete!")


def integration_test():
    """Test GUI to solver integration."""
    print("🔗 Testing GUI-solver integration...")

    # Start GUI in background
    gui_process = subprocess.Popen(["npm", "run", "dev"], cwd="gui")
    time.sleep(5)  # Wait for server to start

    try:
        # Run integration tests
        run_command("uv run python scripts/test_gui_integration.py")
        print("✅ Integration tests passed!")
    finally:
        gui_process.terminate()


def solver_run():
    """Quick solver test with sample data."""
    print("⚡ Running solver test...")
    run_command("uv run python scripts/run_production_solver.py")


def deploy_check():
    """Full production readiness check."""
    print("🚀 Checking production readiness...")

    # Type check
    type_check()

    # Full test suite
    full_test()

    # Build GUI
    os.chdir("gui")
    run_command("npm run build")
    os.chdir("..")

    # Security check
    print("Checking security...")
    run_command("make lint")

    print("✅ Production ready!")


def main():
    """Main workflow dispatcher."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/dev_workflow.py <command>")
        print(
            "Commands: gui-dev, full-test, type-check, db-sync, integration-test, solver-run, deploy-check"
        )
        sys.exit(1)

    command = sys.argv[1]

    commands = {
        "gui-dev": gui_dev,
        "full-test": full_test,
        "type-check": type_check,
        "db-sync": db_sync,
        "integration-test": integration_test,
        "solver-run": solver_run,
        "deploy-check": deploy_check,
    }

    if command in commands:
        commands[command]()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
