#!/usr/bin/env node

/**
 * Test API Connection Script
 * Tests connectivity to the backend API server
 */

const http = require('http');
const https = require('https');

// Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5001';
const TEST_ENDPOINTS = [
  '/health',
  '/send-meeting-invitations',
  '/transcribe'
];

function testEndpoint(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sync-Essence-Test-Client/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : null;
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: parsedData,
            url: url
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: responseData,
            url: url,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        url: url,
        code: error.code
      });
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testApiConnection() {
  console.log('🔍 Testing API Connection...\n');
  console.log(`📍 API Base URL: ${API_BASE_URL}\n`);
  
  const results = [];
  
  // Test basic connectivity
  try {
    console.log('1️⃣ Testing basic connectivity...');
    const healthResult = await testEndpoint(`${API_BASE_URL}/health`);
    results.push({
      endpoint: '/health',
      status: healthResult.status,
      success: healthResult.status >= 200 && healthResult.status < 300
    });
    console.log(`   ✅ Health check: ${healthResult.status} ${healthResult.statusText}`);
  } catch (error) {
    results.push({
      endpoint: '/health',
      status: 'ERROR',
      success: false,
      error: error.error || error.message
    });
    console.log(`   ❌ Health check failed: ${error.error || error.message}`);
  }

  // Test meeting invitations endpoint
  try {
    console.log('\n2️⃣ Testing meeting invitations endpoint...');
    const testInvitation = {
      title: "Test Meeting",
      date: "2024-01-15",
      time: "14:00",
      venue: "Test Venue",
      description: "Test meeting description",
      meetingLink: "https://test.com",
      organizer: "Test Organizer",
      agenda: ["Test agenda item"],
      attendees: [
        {
          email: "test@example.com",
          name: "Test User",
          type: "internal"
        }
      ]
    };
    
    const invitationResult = await testEndpoint(
      `${API_BASE_URL}/send-meeting-invitations`,
      'POST',
      testInvitation
    );
    
    results.push({
      endpoint: '/send-meeting-invitations',
      status: invitationResult.status,
      success: invitationResult.status >= 200 && invitationResult.status < 300
    });
    
    if (invitationResult.status >= 200 && invitationResult.status < 300) {
      console.log(`   ✅ Invitations endpoint: ${invitationResult.status} ${invitationResult.statusText}`);
      if (invitationResult.data) {
        console.log(`   📧 Response: ${JSON.stringify(invitationResult.data, null, 2)}`);
      }
    } else {
      console.log(`   ⚠️ Invitations endpoint: ${invitationResult.status} ${invitationResult.statusText}`);
    }
  } catch (error) {
    results.push({
      endpoint: '/send-meeting-invitations',
      status: 'ERROR',
      success: false,
      error: error.error || error.message
    });
    console.log(`   ❌ Invitations endpoint failed: ${error.error || error.message}`);
  }

  // Test transcription endpoint
  try {
    console.log('\n3️⃣ Testing transcription endpoint...');
    const transcriptionResult = await testEndpoint(`${API_BASE_URL}/transcribe`);
    results.push({
      endpoint: '/transcribe',
      status: transcriptionResult.status,
      success: transcriptionResult.status >= 200 && transcriptionResult.status < 300
    });
    console.log(`   ✅ Transcription endpoint: ${transcriptionResult.status} ${transcriptionResult.statusText}`);
  } catch (error) {
    results.push({
      endpoint: '/transcribe',
      status: 'ERROR',
      success: false,
      error: error.error || error.message
    });
    console.log(`   ❌ Transcription endpoint failed: ${error.error || error.message}`);
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const statusText = result.success ? 'SUCCESS' : `FAILED (${result.status})`;
    console.log(`${index + 1}. ${status} ${result.endpoint}: ${statusText}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 Overall: ${successfulTests}/${totalTests} tests passed`);
  
  if (successfulTests === totalTests) {
    console.log('🎉 All API endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️ Some API endpoints have issues. Check the backend server.');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testApiConnection().catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = { testApiConnection, testEndpoint };
