const axios = require('axios');

async function testApi() {
  try {
    const concept = 'Luz';
    const groupId = 3;
    const url = `http://localhost:4000/api/budget/items/history?concept=${encodeURIComponent(concept)}&budget_group_id=${groupId}`;
    console.log('Testing URL:', url);
    const res = await axios.get(url);
    console.log('API Response:', JSON.stringify(res.data, null, 2));
  } catch (error) {
    console.error('API Error:', error.response ? error.response.data : error.message);
  }
}

testApi();
