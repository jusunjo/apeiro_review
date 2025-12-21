import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 검색 API 프록시
app.post('/api/search', async (req, res) => {
  try {
    const response = await axios.post(
      'https://display-bff-api.29cm.co.kr/api/v1/listing/items?colorchipVariant=treatment',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Search API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      data: error.response?.data,
    });
  }
});

// 리뷰 API 프록시
app.get('/api/reviews', async (req, res) => {
  try {
    const { itemId, page = 0, size = 20, sort = 'BEST' } = req.query;
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
    res.json(response.data);
  } catch (error) {
    console.error('Review API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      data: error.response?.data,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

