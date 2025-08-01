const fs = require('fs');

console.log('🔍 Analyzing WorkCellForm schema mismatches...');

// Read the TypeScript types
const typesContent = fs.readFileSync('lib/database.types.ts', 'utf8');

// Extract work_cells Row interface
const workCellsMatch = typesContent.match(/work_cells:\s*{[\s\S]*?Row:\s*{([\s\S]*?)}\s*Insert:/);
if (workCellsMatch) {
  console.log('📋 Database work_cells Row fields:');
  const fields = workCellsMatch[1].split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes(':') && !line.startsWith('//'))
    .map(line => {
      const match = line.match(/^(\w+):\s*(.+)/);
      return match ? { name: match[1], type: match[2] } : null;
    })
    .filter(Boolean);
  
  fields.forEach(field => {
    console.log(`  - ${field.name}: ${field.type}`);
  });
  
  console.log(`\nTotal database fields: ${fields.length}`);
  
  // Check for specific issues
  const hasTargetUtilization = fields.some(f => f.name === 'target_utilization');
  const hasUtilizationTargetPercent = fields.some(f => f.name === 'utilization_target_percent');
  const hasCalendarId = fields.some(f => f.name === 'calendar_id');
  const hasAvgThroughput = fields.some(f => f.name === 'average_throughput_per_hour');
  
  console.log(`\n🔍 Key field analysis:`);
  console.log(`  - target_utilization: ${hasTargetUtilization ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  - utilization_target_percent: ${hasUtilizationTargetPercent ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  - calendar_id: ${hasCalendarId ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  - average_throughput_per_hour: ${hasAvgThroughput ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (hasTargetUtilization && hasUtilizationTargetPercent) {
    console.log(`\n⚠️ CRITICAL: Both target_utilization AND utilization_target_percent exist!`);
  }
}

// Now analyze the form fields
console.log('\n📝 Analyzing WorkCellForm.tsx fields...');
const formContent = fs.readFileSync('components/forms/WorkCellForm.tsx', 'utf8');

// Extract WorkCellFormData type
const formDataMatch = formContent.match(/type WorkCellFormData = {([\s\S]*?)}/);
if (formDataMatch) {
  console.log('📋 Form WorkCellFormData fields:');
  const formFields = formDataMatch[1].split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes(':') && !line.startsWith('//'))
    .map(line => {
      const match = line.match(/^(\w+):\s*(.+)/);
      return match ? { name: match[1], type: match[2] } : null;
    })
    .filter(Boolean);
  
  formFields.forEach(field => {
    console.log(`  - ${field.name}: ${field.type}`);
  });
  
  console.log(`\nTotal form fields: ${formFields.length}`);
}