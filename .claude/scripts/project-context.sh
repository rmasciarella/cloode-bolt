#!/bin/bash
# Load project context at session start

echo "🏭 Fresh Solver OR-Tools Project Context"
echo "========================================"
echo "📊 Core: CP-SAT constraint programming solver"
echo "🎯 Focus: Template-based manufacturing scheduling"
echo "💻 GUI: Next.js + Supabase + Tailwind"
echo ""
echo "🔧 Available Commands:"
echo "  make lint          - Complete quality check (ruff + black + mypy)"
echo "  uv run python run_tests.py - Run all tests with coverage"
echo "  cd gui && npm run lint     - ESLint for GUI"
echo "  cd gui && npm run test     - Playwright tests"
echo ""
echo "📁 Active Context: $(cat docs/worklog/active/CURRENT.md 2>/dev/null | head -1 || echo 'No active worklog')"
echo ""

# Check if we're in GUI directory and show GUI-specific info
if [[ "$PWD" == *"/gui" ]]; then
    echo "💻 Currently in GUI directory"
    echo "   - Forms: $(ls components/forms/ 2>/dev/null | wc -l | tr -d ' ') form components"
    echo "   - Tests: $(ls tests/*.spec.js 2>/dev/null | wc -l | tr -d ' ') test files"
    echo ""
fi

# Show recent git activity
echo "📋 Recent commits:"
git log --oneline -3 2>/dev/null || echo "   No git history"
echo ""