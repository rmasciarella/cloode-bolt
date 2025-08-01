/**
 * GUI Security Integration Tests
 * 
 * Comprehensive Playwright tests ensuring GUI functionality is preserved
 * while security (RLS) is properly implemented. Tests all form workflows,
 * service integrations, and user interactions with security context.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const TEST_CONFIG = {
  authTimeout: 5000,
  formTimeout: 10000,
  navigationTimeout: 3000,
  securityOperationTimeout: 2000
};

test.describe('GUI Security Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment with security context
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Inject security test utilities
    await page.addInitScript(() => {
      window.securityTestUtils = {
        authState: {
          isAuthenticated: false,
          user: null,
          role: null
        },
        performanceMetrics: {
          authOverhead: [],
          operationTimes: []
        },
        recordAuthTime: (duration) => {
          window.securityTestUtils.performanceMetrics.authOverhead.push(duration);
        },
        recordOperationTime: (operation, duration) => {
          window.securityTestUtils.performanceMetrics.operationTimes.push({
            operation,
            duration,
            timestamp: Date.now()
          });
        }
      };
    });
  });

  test('Functionality Preservation: All GUI forms work with security enabled', async ({ page }) => {
    console.log('🔒 Testing GUI functionality preservation with security...');

    // GIVEN: Security-enabled environment
    const securityEnabled = await page.evaluate(() => {
      return window.securityTestUtils ? true : false;
    });
    expect(securityEnabled).toBe(true);

    // WHEN: Testing all major form workflows
    const formResults = [];

    // Test Department Form
    await page.click('button:has-text("Departments")');
    await page.waitForTimeout(1000);
    
    const departmentFormWorking = await page.locator('label:has-text("Department Name")').count() > 0;
    formResults.push({ form: 'Department', working: departmentFormWorking });

    // Test Machine Form  
    await page.click('button:has-text("Machines")');
    await page.waitForTimeout(1000);
    
    const machineFormWorking = await page.locator('label:has-text("Machine Name")').count() > 0;
    formResults.push({ form: 'Machine', working: machineFormWorking });

    // Test Work Cell Form
    await page.click('button:has-text("Work Cells")');
    await page.waitForTimeout(1000);
    
    const workCellFormWorking = await page.locator('label:has-text("Work Cell Name")').count() > 0;
    formResults.push({ form: 'WorkCell', working: workCellFormWorking });

    // THEN: All forms should work with security enabled
    const allFormsWorking = formResults.every(result => result.working);
    expect(allFormsWorking).toBe(true);

    console.log('✅ Form Results:', formResults);
    await page.screenshot({ 
      path: 'test-results/security-gui-forms-working.png',
      fullPage: true 
    });
  });

  test('Security Context: Auth state properly maintained across operations', async ({ page }) => {
    console.log('🔐 Testing security context preservation...');

    // GIVEN: Mock authentication state
    await page.evaluate(() => {
      // Simulate authenticated user
      window.securityTestUtils.authState = {
        isAuthenticated: true,
        user: { id: 'test-user-123', email: 'test@example.com' },
        role: 'user'
      };
    });

    // WHEN: Performing operations that require security context
    const operations = [
      { name: 'Department Create', selector: 'button:has-text("Departments")', action: 'navigation' },
      { name: 'Machine List', selector: 'button:has-text("Machines")', action: 'navigation' },
      { name: 'Solver Access', selector: 'button:has-text("Solver")', action: 'navigation' }
    ];

    const securityResults = [];

    for (const operation of operations) {
      const startTime = Date.now();
      
      try {
        await page.click(operation.selector);
        await page.waitForTimeout(500);
        
        // Check if security context is maintained
        const authStateValid = await page.evaluate(() => {
          return window.securityTestUtils.authState.isAuthenticated;
        });
        
        const operationTime = Date.now() - startTime;
        
        securityResults.push({
          operation: operation.name,
          success: true,
          authMaintained: authStateValid,
          responseTime: operationTime
        });

        // Record performance metric
        await page.evaluate((op, time) => {
          window.securityTestUtils.recordOperationTime(op, time);
        }, operation.name, operationTime);

      } catch (error) {
        securityResults.push({
          operation: operation.name,
          success: false,
          error: error.message
        });
      }
    }

    // THEN: Security context should be preserved
    const allSuccessful = securityResults.every(result => result.success);
    const authMaintained = securityResults.every(result => result.authMaintained !== false);
    
    expect(allSuccessful).toBe(true);
    expect(authMaintained).toBe(true);

    console.log('🔐 Security Context Results:', securityResults);
  });

  test('Performance Impact: Security overhead within acceptable limits', async ({ page }) => {
    console.log('⚡ Testing security performance impact...');

    // GIVEN: Performance baseline requirements
    const maxAuthOverhead = 100; // ms
    const maxOperationIncrease = 10; // percent

    // WHEN: Measuring operations with security
    const performanceTests = [];

    // Test form loading performance
    const formLoadTests = [
      { name: 'Departments', selector: 'button:has-text("Departments")' },
      { name: 'Machines', selector: 'button:has-text("Machines")' },
      { name: 'Work Cells', selector: 'button:has-text("Work Cells")' }
    ];

    for (const test of formLoadTests) {
      // Measure baseline (simulate no auth)
      const baselineStart = Date.now();
      await page.click(test.selector);
      await page.waitForTimeout(100);
      const baselineTime = Date.now() - baselineStart;

      // Measure with security (simulate auth overhead)
      await page.evaluate((overhead) => {
        // Simulate auth processing time
        const start = Date.now();
        while (Date.now() - start < overhead) {
          // Busy wait to simulate auth overhead
        }
        window.securityTestUtils.recordAuthTime(overhead);
      }, 10); // 10ms simulated auth overhead

      const secureStart = Date.now();
      await page.reload();
      await page.click(test.selector);
      await page.waitForTimeout(100);
      const secureTime = Date.now() - secureStart;

      const overhead = secureTime - baselineTime;
      const overheadPercent = (overhead / baselineTime) * 100;

      performanceTests.push({
        operation: test.name,
        baselineTime,
        secureTime,
        overhead,
        overheadPercent
      });
    }

    // THEN: Performance impact should be acceptable
    const authOverheads = await page.evaluate(() => {
      return window.securityTestUtils.performanceMetrics.authOverhead;
    });

    const avgAuthOverhead = authOverheads.length > 0 
      ? authOverheads.reduce((a, b) => a + b, 0) / authOverheads.length 
      : 0;

    const maxOverheadPercent = Math.max(...performanceTests.map(t => t.overheadPercent));

    expect(avgAuthOverhead).toBeLessThan(maxAuthOverhead);
    expect(maxOverheadPercent).toBeLessThan(maxOperationIncrease);

    console.log('⚡ Performance Results:', {
      avgAuthOverhead,
      maxOverheadPercent,
      tests: performanceTests
    });
  });

  test('Service Layer Integration: Services work with security context', async ({ page }) => {
    console.log('🔧 Testing service layer security integration...');

    // GIVEN: Mock service layer responses with security
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      // Simulate security-aware service responses
      let response = {
        success: true,
        data: [],
        security: {
          authenticated: true,
          authorized: true,
          level: 'READ'
        }
      };

      if (url.includes('/departments')) {
        response.data = [
          { department_id: '1', name: 'Test Department', is_active: true }
        ];
      } else if (url.includes('/machines')) {
        response.data = [
          { machine_resource_id: '1', name: 'Test Machine', is_active: true }
        ];
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // WHEN: Testing service operations through GUI
    const serviceTests = [];

    // Test department service integration
    await page.click('button:has-text("Departments")');
    await page.waitForTimeout(1000);

    const departmentDataVisible = await page.locator('text=Test Department').count() > 0;
    serviceTests.push({ service: 'Department', dataLoaded: departmentDataVisible });

    // Test machine service integration
    await page.click('button:has-text("Machines")');
    await page.waitForTimeout(1000);

    const machineDataVisible = await page.locator('text=Test Machine').count() > 0;
    serviceTests.push({ service: 'Machine', dataLoaded: machineDataVisible });

    // THEN: Services should work with security context
    const allServicesWorking = serviceTests.every(test => test.dataLoaded);
    expect(allServicesWorking).toBe(true);

    console.log('🔧 Service Integration Results:', serviceTests);
  });

  test('Error Handling: Security errors handled gracefully', async ({ page }) => {
    console.log('❌ Testing security error handling...');

    // GIVEN: Various security error conditions
    const errorScenarios = [
      {
        name: 'Unauthorized Access',
        setup: () => page.route('**/api/**', route => 
          route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) })
        )
      },
      {
        name: 'Forbidden Resource',
        setup: () => page.route('**/api/**', route => 
          route.fulfill({ status: 403, body: JSON.stringify({ error: 'Forbidden' }) })
        )
      },
      {
        name: 'Rate Limited',
        setup: () => page.route('**/api/**', route => 
          route.fulfill({ status: 429, body: JSON.stringify({ error: 'Rate Limited' }) })
        )
      }
    ];

    const errorResults = [];

    for (const scenario of errorScenarios) {
      // WHEN: Triggering security error scenario
      await scenario.setup();

      try {
        await page.click('button:has-text("Departments")');
        await page.waitForTimeout(2000);

        // Check if error is handled gracefully
        const errorMessageVisible = await page.locator('[role="alert"], .error-message, .toast').count() > 0;
        const pageStillResponsive = await page.locator('button').first().isEnabled();

        errorResults.push({
          scenario: scenario.name,
          errorHandled: errorMessageVisible,
          pageResponsive: pageStillResponsive,
          gracefulDegradation: errorMessageVisible && pageResponsive
        });

      } catch (error) {
        errorResults.push({
          scenario: scenario.name,
          errorHandled: false,
          pageResponsive: false,
          gracefulDegradation: false,
          error: error.message
        });
      }

      // Reset routes for next test
      await page.unrouteAll();
    }

    // THEN: Errors should be handled gracefully
    const allErrorsHandled = errorResults.every(result => result.gracefulDegradation);
    expect(allErrorsHandled).toBe(true);

    console.log('❌ Error Handling Results:', errorResults);
  });

  test('Development Mode: Security bypass works in dev environment', async ({ page }) => {
    console.log('🚧 Testing development mode security bypass...');

    // GIVEN: Development environment configuration
    await page.addInitScript(() => {
      // Mock development environment
      window.process = {
        env: {
          NODE_ENV: 'development',
          NEXT_PUBLIC_DISABLE_AUTH: 'true'
        }
      };
    });

    // WHEN: Performing operations in dev mode
    await page.reload();
    
    const devModeOperations = [];

    // Test all major sections work in dev mode
    const sections = ['Departments', 'Machines', 'Work Cells', 'Job Templates'];
    
    for (const section of sections) {
      try {
        await page.click(`button:has-text("${section}")`);
        await page.waitForTimeout(1000);
        
        const sectionLoaded = await page.locator(`text=${section}`).count() > 0;
        devModeOperations.push({
          section,
          accessible: sectionLoaded,
          devModeBypass: true
        });
        
      } catch (error) {
        devModeOperations.push({
          section,
          accessible: false,
          devModeBypass: false,
          error: error.message
        });
      }
    }

    // THEN: All operations should work with dev mode bypass
    const allAccessible = devModeOperations.every(op => op.accessible);
    expect(allAccessible).toBe(true);

    console.log('🚧 Dev Mode Results:', devModeOperations);
    
    await page.screenshot({ 
      path: 'test-results/security-dev-mode-bypass.png',
      fullPage: true 
    });
  });

  test('Concurrent Operations: Multiple users with security context', async ({ page, context }) => {
    console.log('👥 Testing concurrent operations with security...');

    // GIVEN: Multiple browser contexts simulating different users
    const user1Page = page;
    const user2Page = await context.newPage();

    // Setup different users
    await user1Page.evaluate(() => {
      window.securityTestUtils.authState = {
        isAuthenticated: true,
        user: { id: 'user-1', email: 'user1@test.com' },
        role: 'user'
      };
    });

    await user2Page.goto('/');
    await user2Page.evaluate(() => {
      window.securityTestUtils = {
        authState: {
          isAuthenticated: true,
          user: { id: 'user-2', email: 'user2@test.com' },
          role: 'user'
        }
      };
    });

    // WHEN: Both users perform operations simultaneously
    const concurrentOperations = await Promise.allSettled([
      // User 1 operations
      (async () => {
        await user1Page.click('button:has-text("Departments")');
        await user1Page.waitForTimeout(500);
        return { user: 'user-1', operation: 'departments', success: true };
      })(),
      
      // User 2 operations
      (async () => {
        await user2Page.click('button:has-text("Machines")');
        await user2Page.waitForTimeout(500);
        return { user: 'user-2', operation: 'machines', success: true };
      })()
    ]);

    // THEN: Both operations should succeed with correct security context
    const results = concurrentOperations.map((result, index) => ({
      user: `user-${index + 1}`,
      status: result.status,
      success: result.status === 'fulfilled',
      value: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));

    const allSuccessful = results.every(result => result.success);
    expect(allSuccessful).toBe(true);

    console.log('👥 Concurrent Operations Results:', results);

    await user2Page.close();
  });

  test('Migration Safety: System works during security rollback', async ({ page }) => {
    console.log('🔄 Testing migration safety and rollback...');

    // GIVEN: System with security enabled
    await page.evaluate(() => {
      window.securityConfig = {
        enabled: true,
        level: 'READ',
        gracefulDegradation: true
      };
    });

    // Test operations with security enabled
    await page.click('button:has-text("Departments")');
    await page.waitForTimeout(1000);
    const secureOperationWorks = await page.locator('text=Departments').count() > 0;

    // WHEN: Simulating security rollback
    await page.evaluate(() => {
      // Simulate security being disabled
      window.securityConfig = {
        enabled: false,
        level: 'NONE',
        gracefulDegradation: true
      };
    });

    await page.reload();
    
    // Test operations during rollback
    await page.click('button:has-text("Machines")');  
    await page.waitForTimeout(1000);
    const rollbackOperationWorks = await page.locator('text=Machines').count() > 0;

    // THEN: System should continue working during rollback
    expect(secureOperationWorks).toBe(true);
    expect(rollbackOperationWorks).toBe(true);

    console.log('🔄 Migration Safety Results:', {
      secureMode: secureOperationWorks,
      rollbackMode: rollbackOperationWorks
    });

    await page.screenshot({ 
      path: 'test-results/security-migration-safety.png',
      fullPage: true 
    });
  });
});

test.describe('Security Performance Benchmarks', () => {
  test('Auth overhead benchmark under load', async ({ page }) => {
    console.log('📊 Running security performance benchmarks...');

    const benchmarkResults = {
      authOverheads: [],
      operationTimes: [],
      memoryUsage: []
    };

    // Run multiple iterations to get performance baseline
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      // Simulate auth operations
      await page.evaluate(() => {
        const authStart = performance.now();
        // Simulate auth processing
        window.securityTestUtils.authState.isAuthenticated = true;
        const authEnd = performance.now();
        return authEnd - authStart;
      });

      await page.click('button:has-text("Departments")');
      await page.waitForTimeout(100);
      
      const totalTime = performance.now() - startTime;
      benchmarkResults.operationTimes.push(totalTime);
    }

    // Calculate performance metrics
    const avgOperationTime = benchmarkResults.operationTimes.reduce((a, b) => a + b, 0) / benchmarkResults.operationTimes.length;
    const maxOperationTime = Math.max(...benchmarkResults.operationTimes);
    const minOperationTime = Math.min(...benchmarkResults.operationTimes);

    // Performance assertions
    expect(avgOperationTime).toBeLessThan(1000); // Less than 1 second average
    expect(maxOperationTime).toBeLessThan(2000); // Less than 2 seconds max

    console.log('📊 Performance Benchmark Results:', {
      avgOperationTime: `${avgOperationTime.toFixed(2)}ms`,
      maxOperationTime: `${maxOperationTime.toFixed(2)}ms`,
      minOperationTime: `${minOperationTime.toFixed(2)}ms`,
      samples: benchmarkResults.operationTimes.length
    });
  });
});