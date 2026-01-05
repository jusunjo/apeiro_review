import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

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
    console.error('Search API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      data: error.response?.data,
    });
  }
});

// 29CM 리뷰 API 프록시
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

// 무신사 검색 API 프록시
app.get('/api/musinsa/search', async (req, res) => {
  console.log('[Musinsa Search] Request received:', req.query);
  
  try {
    const { keyword, page = 1, size = 60 } = req.query;

    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' });
    }

    console.log('[Musinsa Search] Calling Musinsa API...');
    
    const response = await axios.get(
      'https://api.musinsa.com/api2/dp/v1/plp/goods',
      {
        timeout: 5000,
        params: {
          gf: 'A',
          keyword,
          sortCode: 'POPULAR',
          isUsed: false,
          page,
          size,
          testGroup: '',
          seen: 0,
          seenAds: '',
          caller: 'SEARCH',
        },
      }
    );

    console.log('[Musinsa Search] Success, status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Musinsa Search] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        code: error.code,
        data: error.response?.data,
      });
    }
  }
});

// Instagram - User ID 추출
app.post('/api/instagram/user-id', async (req, res) => {
  console.log('[Instagram User ID] Request received');
  
  try {
    const { url, headers } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    
    if (!headers) {
      return res.status(400).json({ error: 'headers is required' });
    }
    
    console.log('[Instagram User ID] Extracting username from URL:', url);
    
    // URL에서 username 추출
    const urlMatch = url.match(/instagram\.com\/([^/?]+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid Instagram URL format' });
    }
    
    const username = urlMatch[1];
    console.log('[Instagram User ID] Username extracted:', username);
    
    // Instagram GraphQL API를 사용하여 user ID 가져오기
    // https://www.instagram.com/api/v1/users/web_profile_info/?username={username}
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    
    console.log('[Instagram User ID] Calling Instagram API:', profileUrl);
    
    const response = await axios.get(profileUrl, {
      headers: {
        ...headers,
        'accept': '*/*',
        'accept-language': headers['accept-language'] || 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': headers.referer || `https://www.instagram.com/${username}/`,
        'x-requested-with': 'XMLHttpRequest',
      },
      timeout: 10000,
    });
    
    console.log('[Instagram User ID] Response status:', response.status);
    
    if (response.data && response.data.data && response.data.data.user) {
      const targetId = response.data.data.user.id;
      console.log('[Instagram User ID] Target ID extracted:', targetId);
      res.json({ targetId });
    } else {
      console.error('[Instagram User ID] Unexpected response structure:', response.data);
      res.status(500).json({ error: 'Failed to extract user ID from response' });
    }
  } catch (error) {
    console.error('[Instagram User ID] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        code: error.code,
        data: error.response?.data,
      });
    }
  }
});

// Instagram - 검색 API
app.get('/api/instagram/search', async (req, res) => {
  console.log('[Instagram Search] Request received');
  console.log('[Instagram Search] Query:', req.query);
  console.log('[Instagram Search] Headers:', Object.keys(req.headers));
  
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
    
    // 헤더 파싱
    let headers = null;
    try {
      const headersString = req.headers['x-instagram-headers'];
      if (headersString) {
        headers = JSON.parse(headersString);
        console.log('[Instagram Search] Headers parsed successfully');
      } else {
        console.log('[Instagram Search] No x-instagram-headers found');
      }
    } catch (parseError) {
      console.error('[Instagram Search] Error parsing headers:', parseError);
      return res.status(400).json({ error: 'Invalid headers format', details: parseError.message });
    }
    
    if (!headers || !headers.cookie) {
      return res.status(400).json({ error: 'headers with cookie are required' });
    }
    
    console.log('[Instagram Search] Searching for query:', query);
    
    // Instagram 검색 API URL
    const searchUrl = `https://www.instagram.com/api/v1/fbsearch/web/top_serp/?enable_metadata=true&query=${encodeURIComponent(query)}&search_session_id=05dba6cb-78c6-4852-9899-4ca819bbff2d`;
    
    console.log('[Instagram Search] Calling Instagram API:', searchUrl);
    
    // referer를 검색어에 맞게 동적으로 설정 (없으면 기본값 사용)
    const referer = headers.referer || `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        ...headers,
        'referer': referer,
      },
      timeout: 30000,
    });
    
    console.log('[Instagram Search] Response status:', response.status);
    console.log('[Instagram Search] Response has data:', !!response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('[Instagram Search] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      stack: error.stack,
    });
    
    if (!res.headersSent) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.message || 'Unknown error';
      const errorData = error.response?.data || null;
      
      console.error('[Instagram Search] Sending error response:', {
        statusCode,
        errorMessage,
        hasErrorData: !!errorData,
      });
      
      res.status(statusCode).json({
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        data: errorData,
      });
    } else {
      console.error('[Instagram Search] Response already sent, cannot send error');
    }
  }
});

// Instagram - 댓글 API
app.get('/api/instagram/comments', async (req, res) => {
  console.log('[Instagram Comments] Request received');
  
  try {
    const { mediaId } = req.query;
    const headers = req.headers['x-instagram-headers'] 
      ? JSON.parse(req.headers['x-instagram-headers']) 
      : null;
    
    if (!mediaId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }
    
    if (!headers) {
      return res.status(400).json({ error: 'headers are required' });
    }
    
    console.log('[Instagram Comments] Fetching comments for mediaId:', mediaId);
    
    // Instagram 댓글 API URL
    const commentsUrl = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`;
    
    console.log('[Instagram Comments] Calling Instagram API:', commentsUrl);
    
    // referer는 전달된 헤더의 값을 사용하거나 기본값 사용
    const referer = headers.referer || 'https://www.instagram.com/';
    
    const response = await axios.get(commentsUrl, {
      headers: {
        ...headers,
        'referer': referer,
      },
      timeout: 30000,
    });
    
    console.log('[Instagram Comments] Response status:', response.status);
    console.log('[Instagram Comments] Comments count:', response.data?.comments?.length || 0);
    
    res.json(response.data);
  } catch (error) {
    console.error('[Instagram Comments] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        code: error.code,
        data: error.response?.data,
      });
    }
  }
});

// Instagram - Detail API (Selenium 사용)
app.get('/api/instagram/detail', async (req, res) => {
  console.log('[Instagram Detail] Request received');
  
  let driver = null;
  
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    
    console.log('[Instagram Detail] Fetching detail for username:', username);
    
    // Selenium WebDriver 설정
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    const profileUrl = `https://www.instagram.com/${username}/`;
    console.log('[Instagram Detail] Navigating to:', profileUrl);
    
    await driver.get(profileUrl);
    
    // 페이지 로드 대기
    console.log('[Instagram Detail] Waiting for page to load...');
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      const bodyText = await driver.executeScript(() => {
        return document.body ? document.body.innerText : '';
      });
      
      if (bodyText.includes('게시물') || bodyText.includes('Posts')) {
        console.log('[Instagram Detail] Page loaded successfully');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Page did not load properly');
    }
    
    // 추가 대기 시간
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    
    console.log('[Instagram Detail] Extracted stats:', stats);
    
    res.json({
      posts: stats.posts || '',
      followers: stats.followers || '',
      following: stats.following || ''
    });
    
  } catch (error) {
    console.error('[Instagram Detail] Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message,
        code: error.code,
      });
    }
  } finally {
    // WebDriver 종료
    if (driver) {
      try {
        await driver.quit();
        console.log('[Instagram Detail] WebDriver closed');
      } catch (quitError) {
        console.error('[Instagram Detail] Error closing WebDriver:', quitError);
      }
    }
  }
});

// Instagram - 팔로워 가져오기
app.post('/api/instagram/followers', async (req, res) => {
  console.log('[Instagram Followers] Request received');
  
  try {
    const { targetId, count = 12, maxId, headers } = req.body;
    
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    
    if (!headers) {
      return res.status(400).json({ error: 'headers is required' });
    }
    
    console.log('[Instagram Followers] Fetching followers for targetId:', targetId);
    console.log('[Instagram Followers] Count:', count, 'MaxId:', maxId || 'none');
    
    // Instagram 팔로워 API URL 구성
    let followersUrl = `https://www.instagram.com/api/v1/friendships/${targetId}/followers/?count=${count}`;
    if (maxId) {
      followersUrl += `&max_id=${maxId}`;
    }
    
    console.log('[Instagram Followers] Calling Instagram API:', followersUrl);
    
    const response = await axios.get(followersUrl, {
      headers: {
        ...headers,
        'accept': '*/*',
        'accept-language': headers['accept-language'] || 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': headers.referer || `https://www.instagram.com/`,
        'x-requested-with': 'XMLHttpRequest',
      },
      timeout: 15000,
    });
    
    console.log('[Instagram Followers] Response status:', response.status);
    console.log('[Instagram Followers] Users count:', response.data?.users?.length || 0);
    
    res.json(response.data);
  } catch (error) {
    console.error('[Instagram Followers] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        code: error.code,
        data: error.response?.data,
      });
    }
  }
});

// 무신사 리뷰 API 프록시
app.get('/api/musinsa/reviews', async (req, res) => {
  console.log('[Musinsa Review] Request received:', req.query);
  
  try {
    const {
      goodsNo,
      page = 0,
      pageSize = 20,
      sort = 'up_cnt_desc',
      selectedSimilarNo,
    } = req.query;

    if (!goodsNo) {
      return res.status(400).json({ error: 'goodsNo is required' });
    }

    console.log('[Musinsa Review] Calling Musinsa API...');
    
    const response = await axios.get(
      'https://goods.musinsa.com/api2/review/v1/view/list',
      {
        timeout: 5000,
        headers: {
          'accept': 'application/json',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'cookie': '_gf=A; tr[vid]=693a86bc407790.44802866; tr[vd]=1765443260; _gcl_au=1.1.1712885698.1765443260; _ga=GA1.1.1295278825.1765443260; _fwb=4i9D618QDqw9iK5nwhk0Y.1765443261337; _kmpid=km|musinsa.com|1765443261346|574f0009-08e9-4d9d-972b-7268b0c78900; _fbp=fb.1.1765443262585.11952566568884093; _pin_unauth=dWlkPU16UXdOR1l4WXpBdE5qWmlZUzAwT1ROaExUazBZMlV0TURWa09XTXhNVEl3WXpRMA; _hjSessionUser_1491926=eyJpZCI6Ijk4Y2M2ZTJlLWQyZjYtNTVhYS05YTY2LTU5NDcxMGE5OWRjYSIsImNyZWF0ZWQiOjE3NjU0NDMyNjI2MjQsImV4aXN0aW5nIjp0cnVlfQ==; one_pc=TVVTSU5TQQ; app_atk=Hy0f4INWumpEaanJ7dSaDD9HBiw6NI3owg9GkHCGju1YVbgkiLLDzC13G7TzjHXs02wCHF69JCTaNqa08qVG1nQKMCfB9ifDGuL%2BDoBQx8NWEwQXEto8LPSKdXiRGVYmNQ%2FBXcpm5YL0Jjjn0g%2BUzVNNNQ4dXXXNa5%2Fd%2Bkwv6iRKL7ZsA%2BHY7geNcSfTIFYg5AeN0ehUqaWoFBVanELlTJr4JcaNcpCKzR3O4AVoB5ZW8kMbCMWS7TS1wBbMygh0e1xZcAnToFRLBolIQzP6pwyBDSFqQfgODy2RaIy51xyRnE%2FwB7VEcVNAnyEJyX%2Fxe8TbLx6%2BgfTwe8Tokp%2FqbCvziRTNhr1BMnOPULnfng%2BA8Ag600q8wXWHCIdGHGPffUCD8VWrrwte0OU8KvuGAcbidtDBDsk%2Byoij8gg8QiXcRQYjvGmwBrib%2F8mFluS%2F99z5f8NUxGDn5TUJLx74wG%2BZG4cDi4PNhxBDMCSbkBv%2FPSQa3W2fIrR%2B7aW4aic3GjzDLWu7rdIo43%2BaNWLpc68Q8hgcEgu6AGQKMg2jkICeOdHnUSn%2F1q5yRibl8fniPXm7FH4vYw6IKSu3ijYN%2FmO6sw7jA11VJRgoP3AC03KjK%2B53w3FbY2UY9mBGuFqAE7F4z9EIMylALR%2FCos8Xlkou5%2B%2FoQH5c%2F7Zm6nUfr0iAfcloics%2BC%2BspF3LOpY225TC1K8wuA%2BbXpHoCDxREm4IKQcaVIhMU9%2FW%2BlC%2FjQrK1T4b7sy8Q13HRxeGWb7p0; app_rtk=56023094a447efb7ff60b400868aad44aeacb953; mss_last_login=20251211; _tt_enable_cookie=1; _ttp=01KC6A05QR9BK53DJ67VBNZ5P6_.tt.1; viewKind=3GridView; tr[fr]=https%3A%2F%2Fsearch.naver.com%2F; tr[ad]=NEWBRCP1550; tr[advt_dt]=1765945539; cart_no=qUtKcoY37VwsM8m5mcr50CdTHNFGJRynnGTGi4Vce9E%3D; tr[vt]=1766451811; tr[vc]=3; _hjSession_1491926=eyJpZCI6ImVkOWQwNDY1LWI0MmItNGUzMy05YzI2LTlhODcwNDI1ZjlkNiIsImMiOjE3NjY0NTE4MTE1ODMsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; _ds_sessions=y; mss_mac=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5ZjU4ODcwYTYxMTFhNjg4M2YwMjU2M2EzMjRhMTcwMSIsImhhc2hlZFVpZCI6IjE1MjU3MmZiZDgzNmVjMDBmOGZjODg3NjI5Nzg1MmQ2Y2QzZjE2OGQyMWVkMmNjMTIxZjllMDI0MjhkNWU5YzEiLCJoYXNoZWRFbWFpbCI6IjBlYTdjMmM5MzM0NGUzNjlmYjVkOGFkNjI1MDBkMTdkNTYxNTBiMTc4NWE5MjBkOWQyMGY2ZmYxMzI4MWQ5YzkiLCJnZW5kZXIiOiJNIiwib3JkZXJDb3VudCI6IjE0NiIsInNlbGZDZXJ0aWZ5Ijp0cnVlLCJoYXNoSWQiOiI5ZjU4ODcwYTYxMTFhNjg4M2YwMjU2M2EzMjRhMTcwMSIsIm1lbWJlckdyb3VwTGlzdCI6WyJTTkFQX1VTRVIiXSwib25lbWVtYmVySGFzaElkIjoiMGE5ZjJlYmViNTIxYmYyN2RmM2Q4NjJmMzEwM2I5OTljNDc2OGI2N2Q5Mjg1NDU0NWU1YmE5YmM2YWU0ZDMyZCIsImJpcnRoWWVhciI6IjE5OTYiLCJvcmRlckFtb3VudFJhbmdlIjoiNzQw66eM7JuQ64yAIiwibmlja25hbWUiOiLrrLTsi6DsgqzrnpHsgqzrnpHtlbQiLCJhZ2VCYW5kIjoiMjUiLCJncm91cExldmVsIjoiNiIsImV4cCI6MTc5Nzk4NTM3NywiaGFzaGVkUGhvbmVOdW1iZXIiOiIwYWM0ZTgyNzg0ZTdhOTlhMDQxZGE2NTRmNTU1ZGRhYmFiZmQxMWM2NDczNTAxODlhMWUyZWVjMTU4M2FkNGNlIiwiaWF0IjoxNzY2NDQ5Mzc3LCJhZENvbnNlbnRZbiI6IlkiLCJyZWdpc3RlckRhdGUiOiIyMDE1LTA3LTI0IiwidXNlckJ1Y2tldCI6IjkyMSJ9.p5L2gv7CAIi4Uh1zh5yBnM7r6_k8xGeN2kkaqEPwFqQ; ab.storage.deviceId.1773491f-ef03-4901-baf8-dbf84e1de25b=%7B%22g%22%3A%22ed920bca-c071-3183-d3c0-c3fcd5a67b8c%22%2C%22c%22%3A1765443315603%2C%22l%22%3A1766451823608%7D; ab.storage.userId.1773491f-ef03-4901-baf8-dbf84e1de25b=%7B%22g%22%3A%229f58870a6111a6883f02563a324a1701%22%2C%22c%22%3A1765443346371%2C%22l%22%3A1766451823609%7D; SimilarGoodsTooltipClosed=true; tr[pv]=4; AMP_74a056ea4a=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJkODY3ZmZiMi04NjEyLTQzMGYtYmNmYy0xYzY1MDFlNjJkODIlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjI5ZjU4ODcwYTYxMTFhNjg4M2YwMjU2M2EzMjRhMTcwMSUyMiUyQyUyMnNlc3Npb25JZCUyMiUzQTE3NjYzOTQ3NjkwMzclMkMlMjJvcHRPdXQlMjIlM0FmYWxzZSUyQyUyMmxhc3RFdmVudFRpbWUlMjIlM0ExNzY2Mzk0NzczNzc1JTJDJTIybGFzdEV2ZW50SWQlMjIlM0EwJTJDJTIycGFnZUNvdW50ZXIlMjIlM0EwJTdE; cto_bundle=HYJN_V92Q3QlMkJHMXFaaUx3M3hpWXFIY0tyVjclMkJJekxHcmElMkZ4RXJ2VzZxSXFoYlRscloyR09rUUFXMm5aVEViaFQwN2FEdmtCVkQlMkZYUVdDV28yZFAxdTU0JTJGJTJCNGxTRGRXJTJCaEIxZUh5eE14U0VneHRkc1VVU25KWDdqTEtodTZYR3VJUSUyQnl0NFZtJTJCREdNYVMwWTFramhpaWY3blElM0QlM0Q; _ga_8PEGV51YTJ=GS2.1.s1766451811$o8$g0$t1766451856$j15$l0$h0; ttcsid_CF2AOI3C77UCCRP8DVQG=1766451823170::lhGrdWgnxQ5P44NmgC9u.5.1766451856951.1; ttcsid=1766451823170::clGtuP-UD8i8egHFO8T4.5.1766451856951.0; ab.storage.sessionId.1773491f-ef03-4901-baf8-dbf84e1de25b=%7B%22g%22%3A%2280195501-3caa-ba90-16d6-91547e25aca8%22%2C%22e%22%3A1766453657185%2C%22c%22%3A1766451823607%2C%22l%22%3A1766451857185%7D',
          'origin': 'https://www.musinsa.com',
          'priority': 'u=1, i',
          'referer': 'https://www.musinsa.com/',
          'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        },
        params: {
          page,
          pageSize,
          goodsNo,
          sort,
          selectedSimilarNo: selectedSimilarNo || goodsNo,
          myFilter: false,
          hasPhoto: false,
          isExperience: false,
        },
      }
    );

    console.log('[Musinsa Review] Success, status:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('[Musinsa Review] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: error.message,
        code: error.code,
        data: error.response?.data,
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

