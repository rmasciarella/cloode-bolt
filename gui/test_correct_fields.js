const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oggdidyjvncncxgebcpy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZ2RpZHlqdm5jbmN4Z2ViY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMDQ4MDEsImV4cCI6MjA2ODc4MDgwMX0.7_YyKNm34NPPWs8_IkXJ3yTprEvJIxEpMEMO4s3xudk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCorrectFields() {
  console.log('🔧 Testing corrected form data without invalid fields...');
  
  // Get valid IDs
  const { data: patterns } = await supabase.from('job_optimized_patterns').select('pattern_id').limit(1);
  const { data: departments } = await supabase.from('departments').select('department_id').limit(1);
  
  const validPatternId = patterns[0].pattern_id;
  const validDeptId = departments[0].department_id;
  
  // Test with corrected data (remove fields that don't exist in DB)
  const correctedFormData = {
    pattern_id: validPatternId,
    name: 'Corrected Test Task',
    position: 997,
    department_id: validDeptId,
    is_unattended: false,
    is_setup: false,
    sequence_id: null,
    min_operators: 1,
    max_operators: 1,
    // Removed: requires_certification, min_skill_level
    // Missing: operator_efficiency_curve (exists in DB but not in form)
  };
  
  console.log('Testing corrected form data:', JSON.stringify(correctedFormData, null, 2));
  
  const { data, error } = await supabase
    .from('optimized_tasks')
    .insert([correctedFormData]);
    
  if (error) {
    console.log('❌ Still failed:', error.message);
  } else {
    console.log('✅ Corrected form submission succeeded!');
    // Clean up
    if (data && data[0]) {
      await supabase
        .from('optimized_tasks')
        .delete()
        .eq('optimized_task_id', data[0].optimized_task_id);
    }
  }
  
  // Test with operator_efficiency_curve included
  console.log('\n🔧 Testing with operator_efficiency_curve field...');
  const withEfficiencyCurve = {
    ...correctedFormData,
    name: 'Test with Efficiency Curve',
    position: 996,
    operator_efficiency_curve: 'linear' // This exists in DB
  };
  
  const { data: data2, error: error2 } = await supabase
    .from('optimized_tasks')
    .insert([withEfficiencyCurve]);
    
  if (error2) {
    console.log('❌ With efficiency curve failed:', error2.message);
  } else {
    console.log('✅ With efficiency curve succeeded!');
    // Clean up
    if (data2 && data2[0]) {
      await supabase
        .from('optimized_tasks')
        .delete()
        .eq('optimized_task_id', data2[0].optimized_task_id);
    }
  }
}

testCorrectFields().catch(console.error);