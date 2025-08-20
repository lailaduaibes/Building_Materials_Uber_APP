// Test script to verify support ticket API
const API_BASE_URL = 'https://threatening-gui-def-joined.trycloudflare.com/api/v1';

async function testSupportTicketAPI() {
  try {
    // First, let's test the health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    console.log('Health response:', healthResponse.status, await healthResponse.text());

    // Test creating a user first (since we need authentication)
    console.log('\nTesting user registration...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123456',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'
      }),
    });

    const registerData = await registerResponse.json();
    console.log('Register response:', registerResponse.status, registerData);

    if (!registerResponse.ok) {
      // Try to login instead
      console.log('\nTrying to login...');
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123456'
        }),
      });

      const loginData = await loginResponse.json();
      console.log('Login response:', loginResponse.status, loginData);

      if (loginResponse.ok && loginData.data?.token) {
        console.log('\nTesting support ticket creation...');
        const ticketResponse = await fetch(`${API_BASE_URL}/support/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.data.token}`,
          },
          body: JSON.stringify({
            subject: 'Test Support Ticket',
            description: 'This is a test support ticket created via API',
            category: 'general',
            priority: 'medium',
          }),
        });

        const ticketData = await ticketResponse.json();
        console.log('Support ticket response:', ticketResponse.status, ticketData);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSupportTicketAPI();
