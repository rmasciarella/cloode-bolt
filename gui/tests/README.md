# Test Directory

This directory contains Playwright tests for the manufacturing scheduling GUI.

## Test Categories

- **Core Tests**: `simple.spec.js` - Basic functionality tests
- **Forms**: `forms.spec.js`, `complete-form-testing.spec.js`, `spa-form-testing.spec.js` - Form functionality and validation
- **Navigation**: `navigation.spec.js`, `fixed-navigation.spec.js` - Navigation and routing tests  
- **Database**: `database.spec.js` - Database connectivity and operations
- **Accessibility**: `accessibility.spec.js` - Accessibility compliance tests
- **Department Specific**: `test_complete_department.spec.js`, `test_department_deletion.spec.js`, `test_department_edit.spec.js` - Department form tests
- **Time Inputs**: `test_time_inputs.spec.js` - Time input field validation
- **New Forms**: `test_new_forms.spec.js` - Tests for newly added form functionality

## Running Tests

```bash
npm test                    # Run all tests
npm run test:headed         # Run with browser UI
npm run test:ui             # Interactive test UI
npm run test:debug          # Debug mode
npm run test:report         # View test reports
```

## Test Data

The `fixtures/` directory contains test data and helper functions.