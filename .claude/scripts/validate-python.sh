#!/bin/bash
# Validate Python files before Claude edits them

file_path="$1"

if [[ "$file_path" == *.py ]]; then
    echo "🔍 Validating Python file: $file_path"
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        echo "✅ New file - validation will run after creation"
        exit 0
    fi
    
    # Run basic syntax check
    python -m py_compile "$file_path" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        echo "✅ Python syntax valid"
    else
        echo "⚠️  Python syntax issues detected"
    fi
    
    # Check for common patterns
    if grep -q "print(" "$file_path"; then
        echo "💡 Note: File contains print statements - consider using logging"
    fi
    
    if grep -q "TODO\|FIXME\|XXX" "$file_path"; then
        echo "📝 Note: File contains TODO/FIXME comments"
    fi
fi

exit 0