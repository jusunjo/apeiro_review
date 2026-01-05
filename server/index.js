import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const gunzip = promisify(zlib.gunzip);
const brotliDecompress = promisify(zlib.brotliDecompress);
const inflate = promisify(zlib.inflate);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 29CM 검색 API 프록시
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
    console.error('Error calling 29CM API:', error);
    res.status(500).json({ error: error.message });
  }
});

// 29CM 리뷰 크롤링 API
app.post('/api/reviews', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Instagram Followers API
app.post('/api/instagram/followers', async (req, res) => {
  console.log('[Instagram Followers] 1. Request received');
  
  try {
    const { userId, maxId, headers: requestHeaders } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('[Instagram Followers] 2. Headers parsed');
    
    // HTTPS Agent (SSL 인증서 검증 비활성화)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=12${maxId ? `&max_id=${maxId}` : ''}`;
    
    console.log('[Instagram Followers] 3. Calling Instagram API:', url);
    console.log('[Instagram Followers] 3b. Full response data:', { userId, maxId });
    
    const headers = {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'cookie': requestHeaders?.cookie || '',
      'origin': 'https://www.instagram.com',
      'referer': `https://www.instagram.com/${userId}/followers/`,
      'sec-ch-prefers-color-scheme': 'dark',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-full-version-list': '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.6.0"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'x-asbd-id': '359341',
      'x-csrftoken': requestHeaders?.['x-csrftoken'] || '',
      'x-ig-app-id': '936619743392459',
      'x-ig-www-claim': requestHeaders?.['x-ig-www-claim'] || '',
      'x-requested-with': 'XMLHttpRequest',
      'x-web-session-id': requestHeaders?.['x-web-session-id'] || '',
    };

    console.log('[Instagram Followers] 3b. Making request with headers...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      httpsAgent,
      headers,
    });

    console.log('[Instagram Followers] 3c. Content-Encoding:', response.headers['content-encoding']);
    console.log('[Instagram Followers] 4. Instagram API responded in', Date.now() - Date.now(), 'ms');
    console.log('[Instagram Followers] 4a. Response status:', response.status);
    console.log('[Instagram Followers] 4b. Full response data:', { status: response.status, data: response.data });
    console.log('[Instagram Followers] 4c. Has response data:', !!response.data);
    
    if (response.data) {
      console.log('[Instagram Followers] 4d. Response data (first 500 chars):');
      console.log(JSON.stringify(response.data).substring(0, 500));
    }

    console.log('[Instagram Followers] 5. Sending response to client...');
    res.json(response.data);
    console.log('[Instagram Followers] 6. Response sent successfully');
  } catch (error) {
    console.error('[Instagram Followers] Error:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        data: error.response?.data,
      });
    }
  }
});

// Instagram User ID API (HTML 파싱)
app.post('/api/instagram/user-id', async (req, res) => {
  console.log('[Instagram User ID] 1. Request received');
  
  try {
    const { url, headers: requestHeaders } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    console.log('[Instagram User ID] 2. Headers parsed');
    
    // HTTPS Agent (SSL 인증서 검증 비활성화)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    console.log('[Instagram User ID] 3. Calling Instagram page:', url);
    
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'cookie': requestHeaders?.cookie || '',
      'sec-ch-prefers-color-scheme': 'dark',
          'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-full-version-list': '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
          'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
          'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.6.0"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    };

    console.log('[Instagram User ID] 3b. Making request with headers...');
    
    const response = await axios.get(url, {
      timeout: 30000,
      httpsAgent,
      headers,
      responseType: 'text',
    });

    console.log('[Instagram User ID] 3c. Content-Encoding:', response.headers['content-encoding']);
    console.log('[Instagram User ID] 4. Instagram page responded');
    console.log('[Instagram User ID] 4a. Response status:', response.status);
    
    let html = response.data;

    // 압축 해제 (필요한 경우)
    if (response.headers['content-encoding'] === 'gzip') {
      html = await gunzip(Buffer.from(html, 'binary')).then(buf => buf.toString('utf-8'));
    } else if (response.headers['content-encoding'] === 'deflate') {
      html = await inflate(Buffer.from(html, 'binary')).then(buf => buf.toString('utf-8'));
    } else if (response.headers['content-encoding'] === 'br') {
      html = await brotliDecompress(Buffer.from(html, 'binary')).then(buf => buf.toString('utf-8'));
    }

    // HTML에서 user ID 추출
    const profilePageMatch = html.match(/"profilePage_(\d+)"/);
    const userId = profilePageMatch ? profilePageMatch[1] : null;

    console.log('[Instagram User ID] 5. User ID extracted:', userId);
    console.log('[Instagram User ID] 6. Sending response to client...');
    res.json({ userId });
    console.log('[Instagram User ID] 7. Response sent successfully');
  } catch (error) {
    console.error('[Instagram User ID] Error:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        data: error.response?.data,
      });
    }
  }
});

// Instagram Search API
app.get('/api/instagram/search', async (req, res) => {
  console.log('[Instagram Search] 1. Request received:', {
    query: req.query.query,
  });
  
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    console.log('[Instagram Search] 2. Headers parsed');
    
    // HTTPS Agent (SSL 인증서 검증 비활성화)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    // 검색 세션 ID 하드코딩
    const searchSessionId = '05dba6cb-78c6-4852-9899-4ca819bbff2d';
    
    // Query 인코딩 (이미 인코딩된 쿼리를 받음)
    const encodedQuery = encodeURIComponent(query);
    console.log('[Instagram Search] 2a. Encoded query:', encodedQuery);
    
    const url = `https://www.instagram.com/api/v1/fbsearch/web/top_serp/?enable_metadata=true&query=${encodedQuery}&search_session_id=${searchSessionId}`;
    
    console.log('[Instagram Search] 3. Calling Instagram API:', url);
    console.log('[Instagram Search] 3b. Making request with headers...');
    
    const headers = {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'cookie': 'datr=pplIaROuaDR-Eteezj66cqMu; ig_did=B58512E5-3D06-429B-9DAA-D7764F93040A; mid=aUiZpgAEAAGIUG6ENeYq6qCjWjJ; ig_nrcb=1; dpr=1; csrftoken=RmXzsdz237PHF7M0YzhbZnpdt51cbFx8; ds_user_id=2000629733; sessionid=2000629733%3Amaz7UtpYui3dL8%3A3%3AAYjXJdoD0H-JihOv7TAUtGWQqsFj__-KW1fNokMy1Q; wd=766x832; rur="HIL\\0542000629733\\0541799050400:01fe13a0a41b602544f33682b2944d8615c06054fdb1ac948020dbf700ac45fc24210465"',
      'priority': 'u=1, i',
      'referer': `https://www.instagram.com/explore/search/keyword/?q=${encodedQuery}`,
      'sec-ch-prefers-color-scheme': 'dark',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-full-version-list': '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.6.0"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'x-asbd-id': '359341',
      'x-csrftoken': 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8',
      'x-ig-app-id': '936619743392459',
      'x-ig-www-claim': 'hmac.AR0dSxfApOzgibnur3BvQQ8sbUZRzBbJoly1580wKwSKMZpl',
      'x-requested-with': 'XMLHttpRequest',
      'x-web-session-id': 'rgjrg7:xgqxqe:t4k3v2',
    };

    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 30000,
      httpsAgent,
      headers,
    });

    const elapsedTime = Date.now() - startTime;
    console.log('[Instagram Search] 3c. Content-Encoding:', response.headers['content-encoding']);
    console.log('[Instagram Search] 4. Instagram API responded in', elapsedTime, 'ms');
    console.log('[Instagram Search] 4a. Response status:', response.status);
    console.log('[Instagram Search] 4b. Response headers:', response.headers);
    console.log('[Instagram Search] 4c. Has response data:', !!response.data);
    
    if (response.data) {
      const responseStr = JSON.stringify(response.data);
      console.log('[Instagram Search] 4d. Response data (first 500 chars):');
      console.log(responseStr.substring(0, 500));
      console.log('[Instagram Search] 4e. Total response length:', responseStr.length, 'chars');
    }

    console.log('[Instagram Search] 5. Response data keys:', response.data ? Object.keys(response.data) : 'none');
    if (response.data?.status) {
      console.log('[Instagram Search] 5a. Response status field:', response.data.status);
    }
    if (response.data?.media_grid) {
      console.log('[Instagram Search] 5b. Has media_grid:', !!response.data.media_grid);
    }
    if (response.data?.media_grid?.sections) {
      console.log('[Instagram Search] 5c. Sections count:', response.data.media_grid.sections.length);
    }
    
    console.log('[Instagram Search] 6. Sending response to client...');
    res.json(response.data);
    console.log('[Instagram Search] 7. Response sent successfully');
  } catch (error) {
    console.error('[Instagram Search] Error:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        data: error.response?.data,
      });
    }
  }
});

// Instagram Comments API
app.get('/api/instagram/comments', async (req, res) => {
  console.log('[Instagram Comments] 1. Request received:', {
    mediaId: req.query.mediaId,
  });
  
  try {
    const { mediaId } = req.query;

    if (!mediaId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }

    console.log('[Instagram Comments] 2. Headers parsed');
    
    // HTTPS Agent (SSL 인증서 검증 비활성화)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`;
    
    console.log('[Instagram Comments] 3. Calling Instagram API:', url);
    console.log('[Instagram Comments] 3b. Making request with headers...');
    
    const headers = {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'cookie': 'datr=pplIaROuaDR-Eteezj66cqMu; ig_did=B58512E5-3D06-429B-9DAA-D7764F93040A; mid=aUiZpgAEAAGIUG6ENeYq6qCjWjJ; ig_nrcb=1; dpr=1; csrftoken=RmXzsdz237PHF7M0YzhbZnpdt51cbFx8; ds_user_id=2000629733; sessionid=2000629733%3Amaz7UtpYui3dL8%3A3%3AAYjXJdoD0H-JihOv7TAUtGWQqsFj__-KW1fNokMy1Q; wd=766x832; rur="HIL\\0542000629733\\0541799050400:01fe13a0a41b602544f33682b2944d8615c06054fdb1ac948020dbf700ac45fc24210465"',
      'priority': 'u=1, i',
      'referer': 'https://www.instagram.com/',
      'sec-ch-prefers-color-scheme': 'dark',
      'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-full-version-list': '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-platform-version': '"15.6.0"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'x-asbd-id': '359341',
      'x-csrftoken': 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8',
      'x-ig-app-id': '936619743392459',
      'x-ig-www-claim': 'hmac.AR0dSxfApOzgibnur3BvQQ8sbUZRzBbJoly1580wKwSKMZpl',
      'x-requested-with': 'XMLHttpRequest',
      'x-web-session-id': 'rgjrg7:xgqxqe:t4k3v2',
    };

    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 30000,
        httpsAgent,
      headers,
    });

    const elapsedTime = Date.now() - startTime;
    console.log('[Instagram Comments] 3c. Content-Encoding:', response.headers['content-encoding']);
    console.log('[Instagram Comments] 4. Instagram API responded in', elapsedTime, 'ms');
    console.log('[Instagram Comments] 4a. Response status:', response.status);
    console.log('[Instagram Comments] 4b. Has response data:', !!response.data);
    
    if (response.data?.comments) {
      console.log('[Instagram Comments] 5. Comments count:', response.data.comments.length);
    }
    
    console.log('[Instagram Comments] 6. Sending response to client...');
    res.json(response.data);
    console.log('[Instagram Comments] 7. Response sent successfully');
  } catch (error) {
    console.error('[Instagram Comments] Error:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        data: error.response?.data,
      });
    }
  }
});

// Instagram Detail 정보 API (Selenium 사용)
app.get('/api/instagram/detail', async (req, res) => {
  console.log('[Instagram Detail] 1. Request received:', {
    username: req.query.username,
  });
  
  let driver = null;
  
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    console.log('[Instagram Detail] 2. Launching Selenium WebDriver...');
    
    // Chrome 옵션 설정
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-setuid-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=924,505');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');
    
    // WebDriver 생성
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    try {
      console.log(`[Instagram Detail] 3. Navigating to https://www.instagram.com/${username}/...`);
      await driver.get(`https://www.instagram.com/${username}/`);
      
      // Cookie 설정 (중요: 로그인 세션)
      const cookies = [
        { name: 'datr', value: 'pplIaROuaDR-Eteezj66cqMu', domain: '.instagram.com' },
        { name: 'ig_did', value: 'B58512E5-3D06-429B-9DAA-D7764F93040A', domain: '.instagram.com' },
        { name: 'mid', value: 'aUiZpgAEAAGIUG6ENeYq6qCjWjJ', domain: '.instagram.com' },
        { name: 'ig_nrcb', value: '1', domain: '.instagram.com' },
        { name: 'dpr', value: '1', domain: '.instagram.com' },
        { name: 'csrftoken', value: 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8', domain: '.instagram.com' },
        { name: 'ds_user_id', value: '2000629733', domain: '.instagram.com' },
        { name: 'ps_l', value: '1', domain: '.instagram.com' },
        { name: 'ps_n', value: '1', domain: '.instagram.com' },
        { name: 'sessionid', value: '2000629733%3Amaz7UtpYui3dL8%3A3%3AAYivIYiD6as4oOsEffWfQHaNr53pc0-N9YiUgr2rYw', domain: '.instagram.com' },
        { name: 'wd', value: '924x505', domain: '.instagram.com' },
        { name: 'rur', value: '"HIL\\0542000629733\\0541799105663:01fe886a30a9f2839f85f87034238ec5c6968ff7e90be16f446c401e540fc7d6f8d0fe61"', domain: '.instagram.com' }
      ];
      
      // 쿠키를 설정하기 위해 먼저 페이지를 방문해야 함
      for (const cookie of cookies) {
        try {
          await driver.manage().addCookie(cookie);
        } catch (e) {
          console.log(`[Instagram Detail] Failed to add cookie ${cookie.name}:`, e.message);
        }
      }
      
      // 쿠키 설정 후 페이지 새로고침
      await driver.navigate().refresh();
      
      console.log('[Instagram Detail] 4. Waiting for profile stats to load completely...');
      
      // 프로필 통계가 완전히 로드될 때까지 대기 (게시물, 팔로워, 팔로우 텍스트가 모두 나타날 때까지)
      let statsLoaded = false;
      for (let i = 0; i < 20; i++) {
        try {
          const bodyText = await driver.executeScript('return document.body?.textContent || "";');
          const hasPosts = bodyText.includes('게시물') || bodyText.includes('Posts');
          const hasFollowers = bodyText.includes('팔로워') || bodyText.includes('followers');
          const hasFollowing = bodyText.includes('팔로우') || bodyText.includes('following');
          if (hasPosts && hasFollowers && hasFollowing) {
            statsLoaded = true;
            console.log('[Instagram Detail] 4a. Profile stats loaded successfully');
            break;
          }
        } catch (e) {
          console.log('[Instagram Detail] 4a. Error checking stats:', e.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!statsLoaded) {
        console.log('[Instagram Detail] 4a. Timeout waiting for profile stats, continuing...');
      }
      
      // 추가 안전 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 디버깅: 페이지 URL과 제목 확인
      const currentUrl = await driver.getCurrentUrl();
      const pageTitle = await driver.getTitle();
      console.log('[Instagram Detail] 4b. Current URL:', currentUrl);
      console.log('[Instagram Detail] 4c. Page title:', pageTitle);
      
      // 디버깅: 페이지가 로그인 페이지인지 확인 (제목이 정상이면 로그인 페이지 아님)
      const isLoginPage = pageTitle.includes('로그인') || pageTitle.includes('Login') || currentUrl.includes('/accounts/login');
      if (isLoginPage) {
        console.log('[Instagram Detail] WARNING: Login page detected! Cookie may be expired or invalid.');
      } else {
        console.log('[Instagram Detail] 4d. Profile page loaded successfully');
      }
      
      console.log('[Instagram Detail] 5. Extracting profile statistics...');
      
      // 프로필 통계 추출
      const stats = await driver.executeScript(() => {
        // 숫자 변환 함수 (만/천/K/M 형식을 숫자로 변환)
        const convertNumberFormat = (value) => {
          if (!value || typeof value !== 'string') return value;
          
          const trimmed = value.trim();
          
          // 숫자만 있는 경우 그대로 반환
          if (/^\d+$/.test(trimmed)) {
            return trimmed;
          }
          
          // 만/천/K/M 형식 변환
          const match = trimmed.match(/^(\d+\.?\d*)(만|천|K|M)?$/i);
          if (!match) return value;
          
          const number = parseFloat(match[1]);
          const unit = match[2]?.toUpperCase();
          
          let multiplier = 1;
          if (unit === '만') multiplier = 10000;
          else if (unit === '천') multiplier = 1000;
          else if (unit === 'K') multiplier = 1000;
          else if (unit === 'M') multiplier = 1000000;
          
          const converted = Math.round(number * multiplier);
          return converted.toString();
        };
        
        const result = {
          posts: null,
          followers: null,
          following: null
        };
        
        // 방법: "게시물", "팔로워", "팔로우" 텍스트를 포함하는 요소 찾기
        const divs = Array.from(document.querySelectorAll('div'));
        for (const div of divs) {
          const text = div.textContent || '';
          
          // 게시물 찾기
          if (text.includes('게시물') || text.includes('Posts')) {
            const span = div.querySelector('span.html-span');
            if (span) {
              const num = span.textContent.trim();
              // 숫자만 또는 숫자+만/천/K/M 형식 허용
              if ((/^\d+$/.test(num) || /^\d+\.?\d*(만|천|K|M)?$/i.test(num)) && !result.posts) {
                result.posts = convertNumberFormat(num);
              }
            }
          }
        }
        
        // 팔로워/팔로우는 a 태그에 있음
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
          const text = link.textContent || '';
          const span = link.querySelector('span.html-span');
          
          if (span) {
            const num = span.textContent.trim();
            // 숫자만 또는 숫자+만/천/K/M 형식 허용 (예: "1.5만", "15K", "1.2M")
            if (/^\d+\.?\d*(만|천|K|M)?$/i.test(num)) {
              if ((text.includes('팔로워') || text.includes('followers')) && !result.followers) {
                result.followers = convertNumberFormat(num);
              } else if ((text.includes('팔로우') || text.includes('following')) && !result.following) {
                result.following = convertNumberFormat(num);
              }
            }
          }
        }
        
        return result;
      });
      
      // 디버깅: HTML 스니펫 확인
      const htmlSnippet = await driver.executeScript(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        for (const div of divs) {
          const text = div.textContent || '';
          if (text.includes('게시물') || text.includes('Posts') || text.includes('팔로워') || text.includes('followers')) {
            return div.innerHTML.substring(0, 1000);
          }
        }
        return 'Not found';
      });
      
      console.log('[Instagram Detail] 5a. HTML snippet:', htmlSnippet.substring(0, 500));
      
      console.log('[Instagram Detail] 6. Stats extracted:', stats);
      
      // 디버깅: 페이지 전체 텍스트 일부 확인
      const pageText = await driver.executeScript('return document.body.textContent?.substring(0, 2000) || "";');
      console.log('[Instagram Detail] 6a. Page text preview:', pageText.substring(0, 500));
      
      await driver.quit();
      driver = null;
      
      if (!stats.posts || !stats.followers || !stats.following) {
        console.log('[Instagram Detail] WARNING: Some stats are missing');
        console.log('[Instagram Detail] Missing stats:', {
          posts: !stats.posts,
          followers: !stats.followers,
          following: !stats.following,
        });
      }
      
      console.log('[Instagram Detail] 7. Sending response...');
      res.json({
        posts: stats.posts || '',
        followers: stats.followers || '',
        following: stats.following || '',
      });
    } catch (pageError) {
      if (driver) {
        await driver.quit();
        driver = null;
      }
      throw pageError;
    }
  } catch (error) {
    if (driver) {
      await driver.quit();
      driver = null;
    }
    console.error('[Instagram Detail] Error:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message,
      });
    }
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