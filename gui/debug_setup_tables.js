const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://oggdidyjvncncxgebcpy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZ2RpZHlqdm5jbmN4Z2ViY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMDQ4MDEsImV4cCI6MjA2ODc4MDgwMX0.7_YyKNm34NPPWs8_IkXJ3yTprEvJIxEpMEMO4s3xudk');

async function findSetupTimes() {
  console.log('🔍 Searching for setup times tables...\n');
  
  const setupTables = [
    'optimized_task_setup_times',
    'task_setup_times', 
    'setup_times',
    'template_setup_times',
    'optimized_setup_times'
  ];
  
  for (const table of setupTables) {
    try {
      const result = await supabase.from(table).select('*').limit(1);
      if (!result.error) {
        console.log('✅ ' + table + ': EXISTS');
        if (result.data && result.data[0]) {
          console.log('   Sample fields: ' + Object.keys(result.data[0]).join(', '));
          console.log('   Sample data: ' + JSON.stringify(result.data[0], null, 2));
        } else {
          console.log('   Table is empty');
        }
        console.log('');
      } else {
        console.log('❌ ' + table + ': DOES NOT EXIST - ' + result.error.message);
      }
    } catch (e) {
      console.log('❌ ' + table + ': ERROR - ' + e.message);
    }
  }
  
  // Also check what optimized_task_modes actually contains
  console.log('🔍 Double-checking optimized_task_modes structure:\n');
  try {
    const result = await supabase.from('optimized_task_modes').select('*').limit(3);
    if (!result.error) {
      console.log('optimized_task_modes sample data:', JSON.stringify(result.data, null, 2));
    }
  } catch (e) {
    console.log('Error checking optimized_task_modes:', e.message);
  }
}

findSetupTimes().catch(console.error);