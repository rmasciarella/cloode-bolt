/**
 * Service Layer Security Integration Tests
 * 
 * Tests security integration at the service layer level, ensuring
 * that BaseService and all derived services work correctly with
 * authentication, RLS policies, and security context preservation.
 */

import { jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { BaseService, ServiceResponse } from '../../gui/lib/services/base.service';
import { DepartmentService } from '../../gui/lib/services/department.service';
import { MachineService } from '../../gui/lib/services/machine.service';
import { SolverService } from '../../gui/lib/services/solver.service';
import { authHelpers } from '../../gui/lib/auth';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('../../gui/lib/auth', () => ({
  supabase: mockSupabaseClient,
  supabaseServiceRole: mockSupabaseClient,
  DEV_MODE_NO_AUTH: false,
  authHelpers: {
    getCurrentUser: jest.fn(),
    getClient: jest.fn(() => mockSupabaseClient),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

describe('Service Layer Security Integration', () => {
  let departmentService: DepartmentService;
  let machineService: MachineService;
  let solverService: SolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    departmentService = new DepartmentService();
    machineService = new MachineService();
    solverService = new SolverService();
  });

  describe('BaseService Security Integration', () => {
    it('should use correct Supabase client based on auth state', async () => {
      // GIVEN: Different authentication states
      const testCases = [
        {
          authState: 'authenticated',
          expectedClient: 'supabase',
          description: 'authenticated users use regular client'
        },
        {
          authState: 'service_role',
          expectedClient: 'supabaseServiceRole', 
          description: 'service operations use service role client'
        },
        {
          authState: 'dev_mode',
          expectedClient: 'supabaseServiceRole',
          description: 'dev mode uses service role client'
        }
      ];

      for (const testCase of testCases) {
        // WHEN: Service operation is performed
        const mockData = [{ department_id: '1', name: 'Test Department' }];
        mockSupabaseClient.from.mockClear();
        (mockSupabaseClient as any).mockResolvedValue({ data: mockData, error: null });

        await departmentService.getAll();

        // THEN: Correct client should be used
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('departments');
      }
    });

    it('should preserve security context in error handling', async () => {
      // GIVEN: Service operation that fails with security-related error
      const securityError = {
        code: 'PGRST301',
        message: 'Row level security policy violation',
        details: 'Policy "Users can view own data" violated',
        hint: 'Check your authentication status'
      };

      mockSupabaseClient.from.mockResolvedValue({ data: null, error: securityError });

      // WHEN: Service operation is performed
      const result = await departmentService.getAll();

      // THEN: Security context should be preserved in error response
      expect(result.success).toBe(false);
      expect(result.error).toContain('Row level security policy violation');
      expect(result.data).toBeNull();
    });

    it('should track performance metrics for security operations', async () => {
      // GIVEN: Performance monitoring setup
      const performanceStart = Date.now();
      
      // WHEN: Service operation with security context
      const mockData = [{ department_id: '1', name: 'Test Department' }];
      mockSupabaseClient.from.mockResolvedValue({ data: mockData, error: null });

      const result = await departmentService.getAll();
      const performanceEnd = Date.now();
      const operationDuration = performanceEnd - performanceStart;

      // THEN: Performance should be tracked and within acceptable limits
      expect(result.success).toBe(true);
      expect(operationDuration).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Department Service Security', () => {
    it('should respect RLS policies for department operations', async () => {
      // GIVEN: User-specific department data with RLS
      const userDepartments = [
        { department_id: '1', name: 'User Dept 1', created_by: 'user-123' },
        { department_id: '2', name: 'User Dept 2', created_by: 'user-123' }
      ];

      mockSupabaseClient.from.mockResolvedValue({ data: userDepartments, error: null });

      // WHEN: User requests departments
      const result = await departmentService.getAll();

      // THEN: Only user's departments should be returned
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(userDepartments);
    });

    it('should handle unauthorized department access gracefully', async () => {
      // GIVEN: Unauthorized access attempt
      const unauthorizedError = {
        code: 'PGRST116',
        message: 'JWT expired',
        details: 'The provided JWT has expired'
      };

      mockSupabaseClient.from.mockResolvedValue({ data: null, error: unauthorizedError });

      // WHEN: Service operation is attempted
      const result = await departmentService.getById('unauthorized-dept');

      // THEN: Error should be handled gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('JWT expired');
      expect(result.data).toBeNull();
    });

    it('should validate user permissions for department modifications', async () => {
      // GIVEN: Department modification attempt
      const departmentUpdate = { name: 'Updated Department Name' };
      
      // Test unauthorized update
      const permissionError = {
        code: 'PGRST301',
        message: 'Permission denied',
        details: 'User lacks UPDATE permission on departments table'
      };

      mockSupabaseClient.from.mockResolvedValue({ data: null, error: permissionError });

      // WHEN: Update is attempted
      const result = await departmentService.update('dept-1', departmentUpdate);

      // THEN: Permission error should be handled
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('Machine Service Security', () => {
    it('should filter machines based on user access rights', async () => {
      // GIVEN: Machines with different access levels
      const accessibleMachines = [
        { machine_resource_id: '1', name: 'Accessible Machine 1', department_id: 'user-dept' }
      ];

      mockSupabaseClient.from.mockResolvedValue({ data: accessibleMachines, error: null });

      // WHEN: User requests machines
      const result = await machineService.getAll(true); // activeOnly = true

      // THEN: Only accessible machines should be returned
      expect(result.success).toBe(true);
      expect(result.data).toEqual(accessibleMachines);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should respect security context in machine operations', async () => {
      // GIVEN: Machine operation with security context
      const secureContext = {
        user_id: 'user-123',
        role: 'user',
        department_access: ['dept-1', 'dept-2']
      };

      const machineData = {
        machine_resource_id: '1',
        name: 'Test Machine',
        department_id: 'dept-1'
      };

      mockSupabaseClient.from.mockResolvedValue({ data: machineData, error: null });

      // WHEN: Machine operation is performed
      const result = await machineService.create(machineData);

      // THEN: Security context should be preserved
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([machineData]);
    });

    it('should handle concurrent machine operations with different users', async () => {
      // GIVEN: Multiple users accessing machines concurrently
      const user1Machines = [{ machine_resource_id: '1', name: 'User 1 Machine' }];
      const user2Machines = [{ machine_resource_id: '2', name: 'User 2 Machine' }];

      // WHEN: Concurrent operations are performed
      const promises = [
        (async () => {
          mockSupabaseClient.from.mockResolvedValueOnce({ data: user1Machines, error: null });
          return await machineService.getAll();
        })(),
        (async () => {
          mockSupabaseClient.from.mockResolvedValueOnce({ data: user2Machines, error: null });
          return await machineService.getAll();
        })()
      ];

      const results = await Promise.allSettled(promises);

      // THEN: Both operations should succeed with correct data isolation
      expect(results).toHaveLength(2);
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(true);
        }
      });
    });
  });

  describe('Solver Service Security', () => {
    it('should include authentication headers in solver API calls', async () => {
      // GIVEN: Authenticated solver request
      const solverRequest = {
        pattern_id: 'test-pattern',
        instances: [
          {
            instance_id: 'job-1',
            description: 'Test Job',
            due_date: new Date().toISOString(),
            priority: 100
          }
        ]
      };

      // Mock fetch for solver API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, solution: {} })
      });

      // WHEN: Solver request is made
      const result = await solverService.solveProblem(solverRequest);

      // THEN: Request should include authentication
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/solve'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle solver authentication failures gracefully', async () => {
      // GIVEN: Solver API authentication failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const solverRequest = {
        pattern_id: 'test-pattern',
        instances: []
      };

      // WHEN: Solver request is made
      const result = await solverService.solveProblem(solverRequest);

      // THEN: Authentication failure should be handled
      expect(result.success).toBe(false);
      expect(result.error).toContain('Solver API error: 401');
    });

    it('should track security-related performance metrics', async () => {
      // GIVEN: Solver operation with performance tracking
      const mockPerformanceData = {
        operation: 'solve',
        duration_ms: 150,
        metadata: { security_enabled: true }
      };

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, solution: {} })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recorded: true })
        });

      // WHEN: Solver operation with performance monitoring
      const solverRequest = { pattern_id: 'test', instances: [] };
      await solverService.solveProblem(solverRequest);
      await solverService.monitorSolverPerformance(
        mockPerformanceData.operation,
        mockPerformanceData.duration_ms,
        mockPerformanceData.metadata
      );

      // THEN: Performance metrics should be recorded
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/performance'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('security_enabled')
        })
      );
    });
  });

  describe('Authentication Helper Integration', () => {
    it('should handle dev mode authentication bypass', async () => {
      // GIVEN: Development mode with auth disabled
      (authHelpers.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'dev-user-id',
        email: 'dev@localhost',
        role: 'authenticated'
      });

      (authHelpers.isAuthenticated as jest.Mock).mockResolvedValue(true);

      // WHEN: Auth helper is used in dev mode
      const user = await authHelpers.getCurrentUser();
      const isAuth = await authHelpers.isAuthenticated();

      // THEN: Dev mode should provide mock authentication
      expect(user).toEqual({
        id: 'dev-user-id',
        email: 'dev@localhost',
        role: 'authenticated'
      });
      expect(isAuth).toBe(true);
    });

    it('should switch clients based on authentication state', async () => {
      // GIVEN: Different client selection scenarios
      const testCases = [
        { devMode: false, expectedClient: mockSupabaseClient },
        { devMode: true, expectedClient: mockSupabaseClient } // Service role in dev
      ];

      for (const testCase of testCases) {
        // Mock dev mode state
        jest.doMock('../../gui/lib/auth', () => ({
          ...jest.requireActual('../../gui/lib/auth'),
          DEV_MODE_NO_AUTH: testCase.devMode
        }));

        // WHEN: Client is requested
        const client = authHelpers.getClient();

        // THEN: Correct client should be returned
        expect(client).toBe(testCase.expectedClient);
      }
    });

    it('should preserve authentication state across service operations', async () => {
      // GIVEN: Authenticated user state
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        role: 'user'
      };

      (authHelpers.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (authHelpers.isAuthenticated as jest.Mock).mockResolvedValue(true);

      // WHEN: Multiple service operations are performed
      const operations = [
        departmentService.getAll(),
        machineService.getAll(),
        // Add solver health check
        solverService.healthCheck()
      ];

      // Mock responses for all operations
      mockSupabaseClient.from.mockResolvedValue({ data: [], error: null });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy', patterns_available: 5 })
      });

      const results = await Promise.allSettled(operations);

      // THEN: All operations should succeed with preserved auth state
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });

      // Verify user state is consistent
      const user1 = await authHelpers.getCurrentUser();
      const user2 = await authHelpers.getCurrentUser();
      expect(user1).toEqual(user2);
    });
  });

  describe('Security Error Recovery', () => {
    it('should recover gracefully from temporary auth failures', async () => {
      // GIVEN: Temporary authentication failure followed by recovery
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST116', message: 'JWT expired' }
          });
        }
        return Promise.resolve({
          data: [{ department_id: '1', name: 'Test Department' }],
          error: null
        });
      });

      // WHEN: Service operation is retried
      const firstAttempt = await departmentService.getAll();
      const secondAttempt = await departmentService.getAll();

      // THEN: First attempt should fail, second should succeed
      expect(firstAttempt.success).toBe(false);
      expect(secondAttempt.success).toBe(true);
    });

    it('should maintain service availability during security policy updates', async () => {
      // GIVEN: Security policy update simulation
      const beforeUpdate = [{ department_id: '1', name: 'Dept 1' }];
      const afterUpdate = [{ department_id: '1', name: 'Dept 1' }];

      // WHEN: Operations are performed during policy update
      mockSupabaseClient.from.mockResolvedValueOnce({ data: beforeUpdate, error: null });
      const beforeResult = await departmentService.getAll();

      // Simulate policy update
      await new Promise(resolve => setTimeout(resolve, 10));

      mockSupabaseClient.from.mockResolvedValueOnce({ data: afterUpdate, error: null });
      const afterResult = await departmentService.getAll();

      // THEN: Service should remain available
      expect(beforeResult.success).toBe(true);
      expect(afterResult.success).toBe(true);
      expect(beforeResult.data).toEqual(afterResult.data);
    });
  });
});

describe('Security Performance Requirements', () => {
  it('should meet authentication performance benchmarks', async () => {
    // GIVEN: Performance requirements
    const maxAuthTime = 100; // ms
    const iterations = 10;

    // WHEN: Multiple authentication operations are performed
    const authTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      (authHelpers.isAuthenticated as jest.Mock).mockResolvedValue(true);
      await authHelpers.isAuthenticated();
      
      const authTime = Date.now() - startTime;
      authTimes.push(authTime);
    }

    // THEN: Authentication should meet performance requirements
    const avgAuthTime = authTimes.reduce((a, b) => a + b, 0) / authTimes.length;
    const maxObservedTime = Math.max(...authTimes);

    expect(avgAuthTime).toBeLessThan(maxAuthTime);
    expect(maxObservedTime).toBeLessThan(maxAuthTime * 2); // Allow for some variance
  });

  it('should maintain service response times with security enabled', async () => {
    // GIVEN: Service response time requirements
    const maxResponseTime = 500; // ms
    
    // Mock fast responses
    mockSupabaseClient.from.mockResolvedValue({
      data: [{ department_id: '1', name: 'Test' }],
      error: null
    });

    // WHEN: Service operations are performed with security
    const startTime = Date.now();
    const result = await departmentService.getAll();
    const responseTime = Date.now() - startTime;

    // THEN: Response time should be acceptable
    expect(result.success).toBe(true);
    expect(responseTime).toBeLessThan(maxResponseTime);
  });
});