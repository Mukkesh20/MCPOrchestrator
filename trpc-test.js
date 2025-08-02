// Test script to debug tRPC routes
// Run this with: node trpc-test.js

async function testTRPCRoutes() {
    const baseUrl = 'http://localhost:3002';
    
    console.log('🧪 Testing tRPC Routes...\n');
  
    // Test 1: Health endpoint
    try {
      console.log('1. Testing health endpoint...');
      const healthResponse = await fetch(`${baseUrl}/health`);
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint:', healthData);
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
    }
  
    // Test 2: tRPC health procedure
    try {
      console.log('\n2. Testing tRPC health procedure...');
      const trpcHealthResponse = await fetch(`${baseUrl}/trpc/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const trpcHealthData = await trpcHealthResponse.json();
      console.log('✅ tRPC health procedure:', trpcHealthData);
    } catch (error) {
      console.log('❌ tRPC health procedure failed:', error.message);
    }
  
    // Test 3: tRPC servers.list query
    try {
      console.log('\n3. Testing tRPC servers.list query...');
      const serversResponse = await fetch(`${baseUrl}/trpc/servers.list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const serversData = await serversResponse.json();
      console.log('✅ tRPC servers.list:', serversData);
    } catch (error) {
      console.log('❌ tRPC servers.list failed:', error.message);
    }
  
    // Test 4: tRPC middlewares.list query
    try {
      console.log('\n4. Testing tRPC middlewares.list query...');
      const middlewaresResponse = await fetch(`${baseUrl}/trpc/middlewares.list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const middlewaresData = await middlewaresResponse.json();
      console.log('✅ tRPC middlewares.list:', middlewaresData);
    } catch (error) {
      console.log('❌ tRPC middlewares.list failed:', error.message);
    }
  
    // Test 5: tRPC batch request (how React Query sends requests)
    try {
      console.log('\n5. Testing tRPC batch request...');
      const batchResponse = await fetch(`${baseUrl}/trpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            id: 1,
            method: 'query',
            params: {
              path: 'health',
              input: null
            }
          }
        ])
      });
      const batchData = await batchResponse.json();
      console.log('✅ tRPC batch request:', batchData);
    } catch (error) {
      console.log('❌ tRPC batch request failed:', error.message);
    }
  
    console.log('\n🏁 Test completed!');
  }
  
  // Only run if this script is executed directly
  if (typeof window === 'undefined') {
    testTRPCRoutes().catch(console.error);
  }