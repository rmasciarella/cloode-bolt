const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkActualSchema() {
  try {
    console.log('🔍 Checking actual database schema...');
    
    // Try to get the table structure for sequence_resources
    console.log('\n📋 Checking sequence_resources table...');
    const { data, error } = await supabase
      .from('sequence_resources')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing sequence_resources:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('✅ sequence_resources table exists');
      if (data && data.length > 0) {
        console.log('Sample record structure:', Object.keys(data[0]));
      } else {
        console.log('Table is empty - trying to insert a test record to see column structure');
        
        // Try inserting with minimal data to see what columns are actually required/supported
        const { data: insertData, error: insertError } = await supabase
          .from('sequence_resources')
          .insert({
            sequence_id: 'SCHEMA_TEST',
            name: 'Schema Test Resource'
          })
          .select();
          
        if (insertError) {
          console.log('❌ Insert error (reveals actual schema):', insertError.message);
          console.log('Full error:', insertError);
        } else {
          console.log('✅ Successfully inserted test record');
          console.log('Returned record structure:', Object.keys(insertData[0]));
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkActualSchema();