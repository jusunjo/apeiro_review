import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId, page = 0, size = 100, sort = 'BEST' } = req.query;
    
    const response = await axios.get(
      'https://review-api.29cm.co.kr/api/v4/reviews',
      {
        params: {
          itemId,
          page,
          size,
          sort,
        },
      }
    );
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Review API error:', error.message);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(error.response?.status || 500).json({
      error: error.message,
      data: error.response?.data,
    });
  }
}

