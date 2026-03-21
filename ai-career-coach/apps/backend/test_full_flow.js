// test_full_flow.js
/**
 * Test complete job matching flow
 * ES Module version
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:4000';

async function testFullFlow() {
  console.log('='.repeat(70));
  console.log('TESTING FULL JOB MATCHING FLOW');
  console.log('='.repeat(70));
  
  let token;
  
  try {
    // Step 1: Login
    console.log('\n1️⃣ Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test1@example.com',
      password: 'SecurePass123!'
    });
    
    token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully');
    console.log(`User ID: ${loginRes.data.data.user.id}`);
    
    // Step 2: Upload CV to ML SERVICE (port 8000, not 4000!)
    console.log('\n2️⃣ Uploading CV...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('Shahram_Halimzoda_Software_Engineer.pdf'));
    
    const uploadRes = await axios.post(
      'http://localhost:8000/api/ml/parse-cv', // ML service, not backend!
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ CV uploaded and parsed');
    console.log(`   - Skills found: ${uploadRes.data.data?.skills?.length || 0}`);
    console.log(`   - Experience: ${uploadRes.data.data?.experience?.length || 0} positions`);
    
    // Step 3: Get job matches
    console.log('\n3️⃣ Finding job matches...');
    const matchRes = await axios.post(
      `${BASE_URL}/api/matching/find-jobs`,
      { top_k: 5 },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const matches = matchRes.data.data.matched_jobs;
    console.log('✅ Job matching completed');
    console.log(`   - Total analyzed: ${matchRes.data.data.total_analyzed}`);
    console.log(`   - Matches returned: ${matches.length}`);
    
    // Display top 3 matches
    console.log('\n📊 TOP 3 MATCHES:');
    console.log('='.repeat(70));
    
    matches.slice(0, 3).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title} at ${job.company}`);
      console.log(`   Match Score: ${job.match_score.toFixed(1)}%`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Salary: £${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}`);
      console.log(`   Matched Skills: ${job.match_breakdown.matched_skills.join(', ')}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 FULL FLOW TEST PASSED!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.response?.data || error.message);
  }
}

testFullFlow();