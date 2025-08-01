const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oggdidyjvncncxgebcpy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZ2RpZHlqdm5jbmN4Z2ViY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMDQ4MDEsImV4cCI6MjA2ODc4MDgwMX0.7_YyKNm34NPPWs8_IkXJ3yTprEvJIxEpMEMO4s3xudk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTemplateTaskSubmission() {
  console.log('🧪 Testing Template Task form submission...');
  
  // Get a valid pattern_id first
  console.log('1. Getting valid pattern_id...');
  const { data: patterns } = await supabase
    .from('job_optimized_patterns')
    .select('pattern_id')
    .limit(1);
    
  if (!patterns || patterns.length === 0) {
    console.log('❌ No patterns found');
    return;
  }
  
  const validPatternId = patterns[0].pattern_id;
  console.log('✅ Using pattern_id:', validPatternId);
  
  // Get a valid department_id
  console.log('2. Getting valid department_id...');
  const { data: departments } = await supabase
    .from('departments')
    .select('department_id')
    .limit(1);
    
  if (!departments || departments.length === 0) {
    console.log('❌ No departments found');
    return;
  }
  
  const validDeptId = departments[0].department_id;
  console.log('✅ Using department_id:', validDeptId);
  
  // Test the exact formData structure from the TemplateTaskForm (lines 173-185)
  const formData = {
    pattern_id: validPatternId,
    name: 'Debug Test Task',
    position: 999,
    department_id: validDeptId,
    is_unattended: false,
    is_setup: false,
    sequence_id: null,
    requires_certification: false, // This field might not exist in DB
    min_skill_level: 'NOVICE', // This field might not exist in DB
    min_operators: 1,
    max_operators: 1,
  };
  
  console.log('3. Testing form submission...');
  console.log('Form data:', JSON.stringify(formData, null, 2));
  
  const { data, error } = await supabase
    .from('optimized_tasks')
    .insert([formData]);
    
  if (error) {
    console.log('❌ FORM SUBMISSION FAILED:');
    console.log('   Error message:', error.message);
    console.log('   Error code:', error.code);
    console.log('   Error details:', error.details);
    console.log('   Error hint:', error.hint);
  } else {
    console.log('✅ Form submission succeeded!');
    console.log('   Created record:', data);
    
    // Clean up test record
    if (data && data[0]) {
      console.log('4. Cleaning up test record...');
      await supabase
        .from('optimized_tasks')
        .delete()
        .eq('optimized_task_id', data[0].optimized_task_id);
      console.log('✅ Test record cleaned up');
    }
  }
  
  // Also test what fields actually exist in the table by trying to insert minimal data
  console.log('\n5. Testing minimal required fields...');
  const minimalData = {
    pattern_id: validPatternId,
    name: 'Minimal Test Task',
    position: 998,
  };
  
  const { data: minData, error: minError } = await supabase
    .from('optimized_tasks')
    .insert([minimalData]);
    
  if (minError) {
    console.log('❌ Minimal data failed:', minError.message);
  } else {
    console.log('✅ Minimal data succeeded');
    // Clean up
    if (minData && minData[0]) {
      await supabase
        .from('optimized_tasks')
        .delete()
        .eq('optimized_task_id', minData[0].optimized_task_id);
    }
  }
}

testTemplateTaskSubmission().catch(console.error);