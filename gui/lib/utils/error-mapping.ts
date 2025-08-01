/**
 * Database Error Message Mapping Utility
 * Maps database constraints and error codes to user-friendly messages
 */

interface DatabaseError {
  code?: string
  message: string
  details?: string
  hint?: string
}

interface ErrorMapping {
  code?: string
  pattern?: RegExp
  userMessage: string
  category: 'validation' | 'constraint' | 'permission' | 'connection' | 'unknown'
}

// Common database error mappings
const ERROR_MAPPINGS: ErrorMapping[] = [
  // Unique constraint violations
  {
    code: '23505',
    pattern: /duplicate key value violates unique constraint/i,
    userMessage: 'This record already exists. Please check for duplicates.',
    category: 'constraint'
  },
  {
    pattern: /duplicate key.*"(\w+)".*unique/i,
    userMessage: 'A record with this value already exists.',
    category: 'constraint'
  },
  
  // Foreign key constraint violations
  {
    code: '23503',
    pattern: /violates foreign key constraint/i,
    userMessage: 'Cannot complete this action because related records exist.',
    category: 'constraint'
  },
  {
    pattern: /is still referenced from table "(\w+)"/i,
    userMessage: 'Cannot delete this record because it is still being used.',
    category: 'constraint'
  },
  
  // Not null constraint violations
  {
    code: '23502',
    pattern: /null value in column "(\w+)" violates not-null constraint/i,
    userMessage: 'Required field is missing. Please fill in all required fields.',
    category: 'validation'
  },
  
  // Check constraint violations
  {
    code: '23514',
    pattern: /violates check constraint/i,
    userMessage: 'The data entered does not meet the required format.',
    category: 'validation'
  },
  
  // Permission errors
  {
    pattern: /permission denied|insufficient privilege/i,
    userMessage: 'You do not have permission to perform this action.',
    category: 'permission'
  },
  
  // Connection errors
  {
    pattern: /connection.*refused|network.*unreachable/i,
    userMessage: 'Unable to connect to the database. Please try again.',
    category: 'connection'
  },
  
  // Timeout errors
  {
    pattern: /timeout|timed out/i,
    userMessage: 'The request took too long. Please try again.',
    category: 'connection'
  },
  
  // Specific business constraint mappings
  {
    pattern: /machine.*already.*assigned/i,
    userMessage: 'This machine is already assigned to another task.',
    category: 'constraint'
  },
  {
    pattern: /operator.*not.*available/i,
    userMessage: 'The selected operator is not available for this time slot.',
    category: 'constraint'
  },
  {
    pattern: /skill.*required.*missing/i,
    userMessage: 'The operator does not have the required skills for this task.',
    category: 'validation'
  },
  {
    pattern: /department.*capacity.*exceeded/i,
    userMessage: 'Department capacity has been exceeded for this time period.',
    category: 'constraint'
  },
  {
    pattern: /maintenance.*window.*conflict/i,
    userMessage: 'This task conflicts with scheduled maintenance.',
    category: 'constraint'
  }
]

export function mapDatabaseError(error: any): {
  userMessage: string
  category: string
  originalError: string
} {
  const errorMessage = typeof error === 'string' ? error : error?.message || String(error)
  const errorCode = error?.code || error?.error_code
  
  // Try to find a matching error mapping
  for (const mapping of ERROR_MAPPINGS) {
    // Check by error code first
    if (mapping.code && errorCode === mapping.code) {
      return {
        userMessage: mapping.userMessage,
        category: mapping.category,
        originalError: errorMessage
      }
    }
    
    // Check by pattern match
    if (mapping.pattern && mapping.pattern.test(errorMessage)) {
      let userMessage = mapping.userMessage
      
      // Extract field names or other details from the error message
      const match = errorMessage.match(mapping.pattern)
      if (match && match[1]) {
        // Replace generic terms with specific field names
        userMessage = userMessage.replace(/this value|this field/i, `"${match[1]}"`)
      }
      
      return {
        userMessage,
        category: mapping.category,
        originalError: errorMessage
      }
    }
  }
  
  // Fallback for unmapped errors
  return {
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    category: 'unknown',
    originalError: errorMessage
  }
}

// Helper function for form error handling
export function handleFormError(
  error: any,
  entityName: string = 'record',
  operation: string = 'save'
): {
  title: string
  description: string
  variant: 'destructive' | 'default'
} {
  const mappedError = mapDatabaseError(error)
  
  // Customize title based on category
  let title = 'Error'
  switch (mappedError.category) {
    case 'validation':
      title = 'Validation Error'
      break
    case 'constraint':
      title = 'Data Conflict'
      break
    case 'permission':
      title = 'Permission Denied'
      break
    case 'connection':
      title = 'Connection Error'
      break
    default:
      title = 'Error'
  }
  
  return {
    title,
    description: mappedError.userMessage,
    variant: 'destructive'
  }
}

// Development helper to log unmapped errors
export function logUnmappedError(error: any, context: string) {
  if (process.env.NODE_ENV === 'development') {
    const mappedError = mapDatabaseError(error)
    if (mappedError.category === 'unknown') {
      console.warn(`[ERROR-MAPPING] Unmapped error in ${context}:`, {
        originalError: mappedError.originalError,
        errorCode: error?.code,
        context
      })
    }
  }
}