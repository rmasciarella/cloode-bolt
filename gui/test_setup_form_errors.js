const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://oggdidyjvncncxgebcpy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZ2RpZHlqdm5jbmN4Z2ViY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMDQ4MDEsImV4cCI6MjA2ODc4MDgwMX0.7_YyKNm34NPPWs8_IkXJ3yTprEvJIxEpMEMO4s3xudk');

async function testFormOperations() {
  console.log('🧪 Testing SetupTimeForm operations that would fail...\n');
  
  // Test 1: Fetch setup times (what form tries to do)
  console.log('1. Testing fetchSetupTimes operation:');
  try {
    const result = await supabase
      .from('optimized_task_modes')
      .select('*')
      .limit(10);
    
    if (result.data && result.data.length > 0) {
      console.log('✅ Query succeeds but returns wrong data type');
      console.log('   Expected: setup time fields (from_template_task_id, to_template_task_id, setup_time_minutes)');
      console.log('   Actual: task mode fields (optimized_task_id, machine_resource_id, duration_minutes)');
      console.log('   First record:', JSON.stringify(result.data[0], null, 2));
    } else {
      console.log('⚠️  Query succeeds but returns no data');
    }
  } catch (e) {
    console.log('❌ Query fails:', e.message);
  }
  
  console.log('\n');
  
  // Test 2: Try to insert setup time data (what form tries to do)
  console.log('2. Testing setup time insert operation:');
  const setupTimeData = {
    from_template_task_id: 'test-from-id',
    to_template_task_id: 'test-to-id', 
    machine_resource_id: 'test-machine-id',
    setup_time_minutes: 15,
    setup_type: 'standard',
    complexity_level: 'simple',
    requires_certification: false,
    setup_cost: 10.50
  };
  
  try {
    const result = await supabase
      .from('optimized_task_modes')
      .insert([setupTimeData]);
    
    console.log('❌ This should fail - setup time fields dont exist in optimized_task_modes');
  } catch (e) {
    console.log('❌ Insert fails as expected:', e.message);
  }
  
  console.log('\n');
  
  // Test 3: Try to delete using mode_id (what form tries to do)  
  console.log('3. Testing delete with mode_id:');
  try {
    const result = await supabase
      .from('optimized_task_modes')
      .delete()
      .eq('mode_id', 'test-id');
    
    console.log('❌ Delete query should fail - mode_id field does not exist');
  } catch (e) {
    console.log('❌ Delete fails as expected:', e.message);
  }
  
  console.log('\n');
  
  // Test 4: Check template tasks query
  console.log('4. Testing template tasks query:');
  try {
    const result = await supabase
      .from('optimized_tasks')
      .select(`
        optimized_task_id,
        name,
        pattern_id,
        job_optimized_patterns!inner(name)
      `)
      .order('name', { ascending: true })
      .limit(3);
    
    if (result.error) {
      console.log('❌ Template tasks query fails:', result.error.message);
    } else {
      console.log('✅ Template tasks query succeeds');
      console.log('   Sample data:', JSON.stringify(result.data, null, 2));
    }
  } catch (e) {
    console.log('❌ Template tasks query error:', e.message);
  }
}

testFormOperations().catch(console.error);