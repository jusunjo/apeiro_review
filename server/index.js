import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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
    res.json(response.data);
  } catch (error) {
    console.error('Review API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      data: error.response?.data,
    });
  }
});

// 정적 파일 서빙 (빌드된 React 앱) - API 라우트 이후에 위치
app.use(express.static(join(__dirname, '../dist')));

// SPA 라우팅 지원 - 모든 경로를 index.html로 리다이렉트 (API 라우트 제외)
app.get('*', (req, res) => {
  // API 경로가 아니면 index.html 반환
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '../dist/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

