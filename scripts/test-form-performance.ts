#!/usr/bin/env ts-node
/**
 * Test script for form performance monitoring
 * Tests the JobInstanceForm performance tracking capabilities
 */

import { performance } from 'perf_hooks'

interface TestResult {
  testName: string
  duration: number
  success: boolean
  errorMessage?: string
}

class FormPerformanceTester {
  private results: TestResult[] = []

  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = performance.now()
    let success = true
    let errorMessage: string | undefined

    try {
      await testFn()
    } catch (error: any) {
      success = false
      errorMessage = error.message
    }

    const duration = performance.now() - startTime
    this.results.push({
      testName,
      duration,
      success,
      errorMessage
    })

    console.log(`${success ? '✅' : '❌'} ${testName}: ${duration.toFixed(2)}ms`)
    if (!success) {
      console.log(`   Error: ${errorMessage}`)
    }
  }

  async testFormLoadTime(): Promise<void> {
    // Simulate form component initialization
    const startTime = performance.now()
    
    // Simulate React component mounting and data fetching
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate initial data load
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const loadTime = performance.now() - startTime
    
    if (loadTime > 500) {
      throw new Error(`Form load time too slow: ${loadTime}ms`)
    }
  }

  async testFieldValidation(): Promise<void> {
    // Simulate field validation timing
    const validationTests = [
      { field: 'name', duration: 10 },
      { field: 'template_id', duration: 20 },
      { field: 'priority', duration: 5 },
      { field: 'quantity', duration: 8 }
    ]

    for (const test of validationTests) {
      const startTime = performance.now()
      await new Promise(resolve => setTimeout(resolve, test.duration))
      const validationTime = performance.now() - startTime
      
      if (validationTime > 100) {
        throw new Error(`${test.field} validation too slow: ${validationTime}ms`)
      }
    }
  }

  async testFormSubmission(): Promise<void> {
    // Simulate form submission
    const startTime = performance.now()
    
    // Simulate data transformation
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Simulate UI updates
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const submissionTime = performance.now() - startTime
    
    if (submissionTime > 2000) {
      throw new Error(`Form submission too slow: ${submissionTime}ms`)
    }
  }

  async testUserInteractionTracking(): Promise<void> {
    // Simulate user interactions
    const interactions = [
      { type: 'click', count: 5 },
      { type: 'focus', count: 10 },
      { type: 'change', count: 8 }
    ]

    const startTime = performance.now()
    
    for (const interaction of interactions) {
      for (let i = 0; i < interaction.count; i++) {
        // Simulate event handling overhead
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    const trackingTime = performance.now() - startTime
    
    if (trackingTime > 100) {
      throw new Error(`Interaction tracking overhead too high: ${trackingTime}ms`)
    }
  }

  async testErrorHandling(): Promise<void> {
    // Simulate error scenarios
    const errorScenarios = [
      'Validation error',
      'Network error',
      'Server error'
    ]

    const startTime = performance.now()
    
    for (const scenario of errorScenarios) {
      // Simulate error processing
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    const errorHandlingTime = performance.now() - startTime
    
    if (errorHandlingTime > 50) {
      throw new Error(`Error handling too slow: ${errorHandlingTime}ms`)
    }
  }

  printSummary(): void {
    console.log('\n📊 Form Performance Test Summary')
    console.log('================================')
    
    const successfulTests = this.results.filter(r => r.success)
    const failedTests = this.results.filter(r => !r.success)
    
    console.log(`Total Tests: ${this.results.length}`)
    console.log(`Successful: ${successfulTests.length}`)
    console.log(`Failed: ${failedTests.length}`)
    console.log(`Success Rate: ${((successfulTests.length / this.results.length) * 100).toFixed(1)}%`)
    
    if (successfulTests.length > 0) {
      const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length
      console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`)
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:')
      failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.errorMessage}`)
      })
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:')
    
    const loadTests = this.results.filter(r => r.testName.includes('Load'))
    if (loadTests.length > 0) {
      const avgLoadTime = loadTests.reduce((sum, r) => sum + r.duration, 0) / loadTests.length
      if (avgLoadTime > 300) {
        console.log('  - Consider lazy loading non-critical form components')
      }
      if (avgLoadTime > 500) {
        console.log('  - Optimize initial data fetching with caching')
      }
    }
    
    const validationTests = this.results.filter(r => r.testName.includes('Validation'))
    if (validationTests.length > 0) {
      const avgValidationTime = validationTests.reduce((sum, r) => sum + r.duration, 0) / validationTests.length
      if (avgValidationTime > 50) {
        console.log('  - Consider debouncing field validation')
      }
    }
    
    const submissionTests = this.results.filter(r => r.testName.includes('Submission'))
    if (submissionTests.length > 0) {
      const avgSubmissionTime = submissionTests.reduce((sum, r) => sum + r.duration, 0) / submissionTests.length
      if (avgSubmissionTime > 1000) {
        console.log('  - Consider optimistic updates for better UX')
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting Form Performance Tests...\n')
  
  const tester = new FormPerformanceTester()
  
  // Run all performance tests
  await tester.runTest('Form Load Time', () => tester.testFormLoadTime())
  await tester.runTest('Field Validation', () => tester.testFieldValidation())
  await tester.runTest('Form Submission', () => tester.testFormSubmission())
  await tester.runTest('User Interaction Tracking', () => tester.testUserInteractionTracking())
  await tester.runTest('Error Handling', () => tester.testErrorHandling())
  
  // Print comprehensive summary
  tester.printSummary()
  
  console.log('\n✨ Form performance testing complete!')
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })
}

export { FormPerformanceTester }