import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

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

// Instagram User ID 추출 API
app.post('/api/instagram/user-id', async (req, res) => {
  console.log('[Instagram User ID] 1. Request received:', req.body);
  
  try {
    const { url, headers } = req.body;

    if (!url) {
      console.log('[Instagram User ID] ERROR: URL is missing');
      return res.status(400).json({ error: 'url is required' });
    }

    console.log('[Instagram User ID] 2. URL validated:', url);
    console.log('[Instagram User ID] 3. Calling Instagram with headers...');
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const response = await axios.get(url, {
      timeout: 10000,
      httpsAgent,
      responseType: 'arraybuffer', // 바이너리 데이터로 받기
      decompress: false, // 수동으로 압축 해제
      headers: {
        'accept': headers.accept || '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': headers['accept-language'] || 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'cookie': headers.cookie,
        'priority': headers.priority || 'u=1, i',
        'referer': url,
        'sec-ch-prefers-color-scheme': headers['sec-ch-prefers-color-scheme'] || 'dark',
        'sec-ch-ua': headers['sec-ch-ua'] || '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-full-version-list': headers['sec-ch-ua-full-version-list'] || '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
        'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'] || '?0',
        'sec-ch-ua-model': headers['sec-ch-ua-model'] || '""',
        'sec-ch-ua-platform': headers['sec-ch-ua-platform'] || '"macOS"',
        'sec-ch-ua-platform-version': headers['sec-ch-ua-platform-version'] || '"15.6.0"',
        'sec-fetch-dest': headers['sec-fetch-dest'] || 'empty',
        'sec-fetch-mode': headers['sec-fetch-mode'] || 'cors',
        'sec-fetch-site': headers['sec-fetch-site'] || 'same-origin',
        'user-agent': headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'x-asbd-id': headers['x-asbd-id'] || '359341',
        'x-csrftoken': headers['x-csrftoken'],
        'x-ig-app-id': headers['x-ig-app-id'] || '936619743392459',
        'x-ig-www-claim': headers['x-ig-www-claim'],
        'x-requested-with': headers['x-requested-with'] || 'XMLHttpRequest',
        'x-web-session-id': headers['x-web-session-id']
      },
    });

    console.log('[Instagram User ID] 4. Instagram response received, status:', response.status);
    console.log('[Instagram User ID] 4a. Content-Encoding:', response.headers['content-encoding']);
    console.log('[Instagram User ID] 4b. Response data type:', typeof response.data);
    console.log('[Instagram User ID] 4c. Is Buffer?:', Buffer.isBuffer(response.data));
    
    let html = '';
    
    // 압축 해제 처리
    const contentEncoding = response.headers['content-encoding'];
    console.log('[Instagram User ID] 5. Decompressing data...');
    
    try {
      if (Buffer.isBuffer(response.data)) {
        if (contentEncoding === 'gzip') {
          console.log('[Instagram User ID] 5a. Decompressing gzip...');
          const decompressed = await gunzip(response.data);
          html = decompressed.toString('utf-8');
        } else if (contentEncoding === 'br') {
          console.log('[Instagram User ID] 5a. Decompressing brotli...');
          const decompressed = await brotliDecompress(response.data);
          html = decompressed.toString('utf-8');
        } else if (contentEncoding === 'deflate') {
          console.log('[Instagram User ID] 5a. Decompressing deflate...');
          const decompressed = await inflate(response.data);
          html = decompressed.toString('utf-8');
        } else if (!contentEncoding) {
          console.log('[Instagram User ID] 5a. No compression header, trying auto-detect...');
          // 압축 헤더가 없는 경우, gzip 시도
          try {
            const decompressed = await gunzip(response.data);
            html = decompressed.toString('utf-8');
            console.log('[Instagram User ID] 5a-1. Auto-detected as gzip');
          } catch (e) {
            // gzip이 아니면 그냥 문자열로 변환
            html = response.data.toString('utf-8');
            console.log('[Instagram User ID] 5a-1. Not compressed, using raw data');
          }
        } else {
          console.log('[Instagram User ID] 5a. Unknown compression:', contentEncoding);
          console.log('[Instagram User ID] 5a. Trying raw conversion...');
          html = response.data.toString('utf-8');
        }
      } else if (typeof response.data === 'string') {
        console.log('[Instagram User ID] 5a. Data is already string');
        html = response.data;
      } else {
        console.log('[Instagram User ID] 5a. Converting data to string...');
        html = String(response.data);
      }
      
      console.log('[Instagram User ID] 5b. Decompression complete, HTML length:', html.length);
    } catch (decompressError) {
      console.error('[Instagram User ID] 5c. Decompression error:', decompressError.message);
      console.error('[Instagram User ID] 5c. Stack:', decompressError.stack);
      // 압축 해제 실패시 원본 그대로 시도
      html = response.data.toString('utf-8');
    }

    console.log('[Instagram User ID] 6. Response data length:', html.length);
    
    // HTML 앞부분 일부 출력 (디버깅용)
    console.log('[Instagram User ID] 7. HTML preview (first 500 chars):', html.substring(0, 500));
    
    // HTML에서 <script type="application/json" data-content-len="..." data-sjs> 태그 찾기
    const scriptRegex = /<script type="application\/json" data-content-len="[^"]*" data-sjs>(.*?)<\/script>/gs;
    const matches = Array.from(html.matchAll(scriptRegex));
    
    console.log('[Instagram User ID] 8. Found script tags count:', matches.length);
    
    let targetId = null;
    let scriptIndex = 0;
    
    for (const match of matches) {
      scriptIndex++;
      console.log(`[Instagram User ID] 9-${scriptIndex}. Processing script tag ${scriptIndex}/${matches.length}`);
      
      try {
        const jsonStr = match[1];
        console.log(`[Instagram User ID] 9-${scriptIndex}a. JSON string length:`, jsonStr.length);
        
        const jsonData = JSON.parse(jsonStr);
        console.log(`[Instagram User ID] 9-${scriptIndex}b. JSON parsed successfully`);
        
        // JSON 깊이 탐색하여 target_id 찾기
        const findTargetId = (obj, depth = 0) => {
          if (depth > 20) return null; // 무한 루프 방지
          
          if (obj && typeof obj === 'object') {
            if ('target_id' in obj) {
              console.log(`[Instagram User ID] 9-${scriptIndex}c. Found target_id at depth ${depth}:`, obj.target_id);
              return obj.target_id;
            }
            for (const key in obj) {
              const result = findTargetId(obj[key], depth + 1);
              if (result) return result;
            }
          }
          return null;
        };
        
        targetId = findTargetId(jsonData);
        if (targetId) {
          console.log(`[Instagram User ID] 10. SUCCESS! Found target_id in script ${scriptIndex}:`, targetId);
          break;
        } else {
          console.log(`[Instagram User ID] 9-${scriptIndex}d. No target_id found in this script tag`);
        }
      } catch (e) {
        console.log(`[Instagram User ID] 9-${scriptIndex}e. JSON parse error:`, e.message);
        // JSON 파싱 실패하면 다음 스크립트 태그 시도
        continue;
      }
    }
    
    if (!targetId) {
      console.log('[Instagram User ID] 11. FAILED: target_id not found in any script tag');
      console.log('[Instagram User ID] 12. Attempting alternative method - looking for "profile_id"');
      
      // 대안: profile_id 찾기
      const profileIdMatch = html.match(/"profile_id":"(\d+)"/);
      if (profileIdMatch) {
        targetId = profileIdMatch[1];
        console.log('[Instagram User ID] 13. SUCCESS! Found profile_id:', targetId);
      } else {
        console.log('[Instagram User ID] 14. FAILED: profile_id also not found');
        
        // 추가 대안: user_id 찾기
        console.log('[Instagram User ID] 15. Attempting another method - looking for "user_id"');
        const userIdMatch = html.match(/"user_id":"(\d+)"/);
        if (userIdMatch) {
          targetId = userIdMatch[1];
          console.log('[Instagram User ID] 16. SUCCESS! Found user_id:', targetId);
        } else {
          console.log('[Instagram User ID] 17. FAILED: All methods exhausted');
          return res.status(404).json({ error: 'target_id not found in HTML' });
        }
      }
    }

    // 게시물 수, 팔로워 수, 팔로우 수 추출
    let postCount = null;
    let followerCount = null;
    let followingCount = null;
    
    // JSON 데이터에서 찾기
    for (const match of matches) {
      try {
        const jsonStr = match[1];
        const jsonData = JSON.parse(jsonStr);
        
        // 깊이 탐색하여 정보 찾기
        const findValue = (obj, keys, depth = 0) => {
          if (depth > 20) return null;
          
          if (obj && typeof obj === 'object') {
            // 키 배열의 모든 키가 존재하는지 확인
            let current = obj;
            for (const key of keys) {
              if (current && typeof current === 'object' && key in current) {
                current = current[key];
              } else {
                return null;
              }
            }
            if (current !== null && current !== undefined) {
              return current;
            }
            
            // 재귀적으로 탐색
            for (const key in current) {
              const result = findValue(current[key], keys, depth + 1);
              if (result !== null) return result;
            }
          }
          return null;
        };
        
        // edge_owner_to_timeline_media.count (게시물 수)
        if (!postCount) {
          postCount = findValue(jsonData, ['edge_owner_to_timeline_media', 'count']) ||
                     findValue(jsonData, ['edge_owner_to_timeline_media', 'edge_count']) ||
                     findValue(jsonData, ['media_count']);
        }
        
        // edge_followed_by.count (팔로워 수)
        if (!followerCount) {
          followerCount = findValue(jsonData, ['edge_followed_by', 'count']) ||
                         findValue(jsonData, ['follower_count']) ||
                         findValue(jsonData, ['edge_followed_by', 'edge_count']);
        }
        
        // edge_follow.count (팔로우 수)
        if (!followingCount) {
          followingCount = findValue(jsonData, ['edge_follow', 'count']) ||
                          findValue(jsonData, ['following_count']) ||
                          findValue(jsonData, ['edge_follow', 'edge_count']);
        }
        
        if (postCount && followerCount && followingCount) {
          break; // 모두 찾았으면 중단
        }
      } catch (e) {
        continue;
      }
    }
    
    // 정규식으로도 시도
    if (!postCount) {
      const postMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/);
      if (postMatch) postCount = parseInt(postMatch[1]);
    }
    
    if (!followerCount) {
      const followerMatch = html.match(/"edge_followed_by":\{"count":(\d+)/);
      if (followerMatch) followerCount = parseInt(followerMatch[1]);
    }
    
    if (!followingCount) {
      const followingMatch = html.match(/"edge_follow":\{"count":(\d+)/);
      if (followingMatch) followingCount = parseInt(followingMatch[1]);
    }
    
    console.log('[Instagram User ID] Extracted counts:', {
      postCount,
      followerCount,
      followingCount,
    });
    
    console.log('[Instagram User ID] FINAL SUCCESS, target_id:', targetId);
    res.json({ 
      targetId,
      postCount: postCount || null,
      followerCount: followerCount || null,
      followingCount: followingCount || null,
    });
  } catch (error) {
    console.error('[Instagram User ID] EXCEPTION ERROR:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
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

// Instagram Followers API
app.post('/api/instagram/followers', async (req, res) => {
  console.log('[Instagram Followers] 1. Request received:', {
    targetId: req.body.targetId,
    count: req.body.count,
    maxId: req.body.maxId,
  });
  
  try {
    const { targetId, count = 12, maxId, headers } = req.body;

    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }

    console.log('[Instagram Followers] 2. Calling Instagram API with params:', { targetId, count, maxId });
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const params = {
      count,
      search_surface: 'follow_list_page'
    };
    
    if (maxId) {
      params.max_id = maxId;
      console.log('[Instagram Followers] 2a. Using max_id for pagination:', maxId);
    }
    
    const response = await axios.get(
      `https://www.instagram.com/api/v1/friendships/${targetId}/followers/`,
      {
        timeout: 10000,
        httpsAgent,
        headers: {
          'accept': headers.accept || '*/*',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': headers['accept-language'] || 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'cookie': headers.cookie,
          'priority': headers.priority || 'u=1, i',
          'referer': headers.referer || `https://www.instagram.com/${targetId}/followers/`,
          'sec-ch-prefers-color-scheme': headers['sec-ch-prefers-color-scheme'] || 'dark',
          'sec-ch-ua': headers['sec-ch-ua'] || '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
          'sec-ch-ua-full-version-list': headers['sec-ch-ua-full-version-list'] || '"Google Chrome";v="143.0.7499.170", "Chromium";v="143.0.7499.170", "Not A(Brand";v="24.0.0.0"',
          'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'] || '?0',
          'sec-ch-ua-model': headers['sec-ch-ua-model'] || '""',
          'sec-ch-ua-platform': headers['sec-ch-ua-platform'] || '"macOS"',
          'sec-ch-ua-platform-version': headers['sec-ch-ua-platform-version'] || '"15.6.0"',
          'sec-fetch-dest': headers['sec-fetch-dest'] || 'empty',
          'sec-fetch-mode': headers['sec-fetch-mode'] || 'cors',
          'sec-fetch-site': headers['sec-fetch-site'] || 'same-origin',
          'user-agent': headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'x-asbd-id': headers['x-asbd-id'] || '359341',
          'x-csrftoken': headers['x-csrftoken'],
          'x-ig-app-id': headers['x-ig-app-id'] || '936619743392459',
          'x-ig-www-claim': headers['x-ig-www-claim'],
          'x-requested-with': headers['x-requested-with'] || 'XMLHttpRequest',
          'x-web-session-id': headers['x-web-session-id']
        },
        params
      }
    );

    console.log('[Instagram Followers] 3. Success! Response details:', {
      usersCount: response.data.users?.length || 0,
      hasMore: response.data.has_more,
      nextMaxId: response.data.next_max_id,
      bigList: response.data.big_list,
      pageSize: response.data.page_size,
      status: response.data.status,
    });
    
    // 전체 응답 구조 확인 (디버깅용)
    console.log('[Instagram Followers] 3a. Full response keys:', Object.keys(response.data));
    console.log('[Instagram Followers] 3b. Full response data:', JSON.stringify(response.data, null, 2));
    
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

// Instagram 검색 API
app.get('/api/instagram/search', async (req, res) => {
  console.log('[Instagram Search] 1. Request received:', {
    query: req.query.query,
  });
  
  try {
    const { query } = req.query;
    const headersJson = req.headers['x-instagram-headers'];

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    if (!headersJson) {
      return res.status(400).json({ error: 'Instagram headers are required' });
    }

    const headers = JSON.parse(headersJson);
    console.log('[Instagram Search] 2. Headers parsed');

    // query가 이미 인코딩되어 올 수도 있으므로, #이 포함되어 있는지 확인
    // #이 없으면 원본 query를 인코딩, 있으면 이미 인코딩된 것으로 간주
    let encodedQuery;
    if (query.includes('%23') || query.includes('#')) {
      // 이미 인코딩되어 있거나 #이 포함된 경우
      encodedQuery = query.includes('%23') ? query : encodeURIComponent(query);
    } else {
      encodedQuery = encodeURIComponent(query);
    }
    
    console.log('[Instagram Search] 2a. Original query:', query);
    console.log('[Instagram Search] 2b. Encoded query:', encodedQuery);
    
    // 하드코딩된 search_session_id
    const searchSessionId = '05dba6cb-78c6-4852-9899-4ca819bbff2d';
    
    const url = `https://www.instagram.com/api/v1/fbsearch/web/top_serp/?enable_metadata=true&query=${encodedQuery}&search_session_id=${searchSessionId}`;

    console.log('[Instagram Search] 3. Calling Instagram API:', url);
    console.log('[Instagram Search] 3a. Search session ID:', searchSessionId);
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    console.log('[Instagram Search] 3b. Making request with headers...');
    const requestStartTime = Date.now();
    
    try {
      // referer를 검색 URL로 동적 생성
      const refererUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodedQuery}`;
      
      const response = await axios.get(url, {
        timeout: 30000, // 30초로 증가
        httpsAgent,
        // axios가 자동으로 gzip, deflate, br 압축 해제를 처리함
        headers: {
          'accept': '*/*',
          'accept-encoding': 'gzip, deflate, br', // zstd 제거 (Node.js에서 지원 안 함, axios가 자동 압축 해제)
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'cookie': headers.cookie || 'datr=pplIaROuaDR-Eteezj66cqMu; ig_did=B58512E5-3D06-429B-9DAA-D7764F93040A; mid=aUiZpgAEAAGIUG6ENeYq6qCQjWjJ; ig_nrcb=1; dpr=1; csrftoken=RmXzsdz237PHF7M0YzhbZnpdt51cbFx8; ds_user_id=2000629733; sessionid=2000629733%3Amaz7UtpYui3dL8%3A3%3AAYjXJdoD0H-JihOv7TAUtGWQqsFj__-KW1fNokMy1Q; wd=766x832; rur="HIL\\0542000629733\\0541799050400:01fe13a0a41b602544f33682b2944d8615c06054fdb1ac948020dbf700ac45fc24210465"',
          'priority': 'u=1, i',
          'referer': refererUrl,
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
          'x-csrftoken': headers['x-csrftoken'] || 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8',
          'x-ig-app-id': '936619743392459',
          'x-ig-www-claim': headers['x-ig-www-claim'] || 'hmac.AR0dSxfApOzgibnur3BvQQ8sbUZRzBbJoly1580wKwSKMZpl',
          'x-requested-with': 'XMLHttpRequest',
          'x-web-session-id': 'rgjrg7:xgqxqe:t4k3v2',
        },
      });

      // axios가 자동으로 gzip, deflate, br 압축 해제를 처리함
      console.log('[Instagram Search] 3c. Content-Encoding:', response.headers['content-encoding']);

      const requestElapsedTime = Date.now() - requestStartTime;
      console.log(`[Instagram Search] 4. Instagram API responded in ${requestElapsedTime}ms`);
      console.log('[Instagram Search] 4a. Response status:', response.status);
      console.log('[Instagram Search] 4b. Response headers:', response.headers);
      console.log('[Instagram Search] 4c. Has response data:', !!response.data);
      
      if (response.data) {
        // 응답 데이터를 문자열로 변환하여 앞 500자 출력
        const responseString = JSON.stringify(response.data, null, 2);
        const first500Chars = responseString.substring(0, 500);
        console.log('[Instagram Search] 4d. Response data (first 500 chars):');
        console.log(first500Chars);
        console.log('[Instagram Search] 4e. Total response length:', responseString.length, 'chars');
        
        console.log('[Instagram Search] 5. Response data keys:', Object.keys(response.data));
        console.log('[Instagram Search] 5a. Response status field:', response.data.status);
        console.log('[Instagram Search] 5b. Has media_grid:', !!response.data.media_grid);
        if (response.data.media_grid) {
          console.log('[Instagram Search] 5c. Sections count:', response.data.media_grid.sections?.length || 0);
        }
      } else {
        console.warn('[Instagram Search] WARNING: Response data is empty!');
      }
      
      console.log('[Instagram Search] 6. Sending response to client...');
      res.json(response.data);
      console.log('[Instagram Search] 7. Response sent successfully');
    } catch (axiosError) {
      const requestElapsedTime = Date.now() - requestStartTime;
      console.error(`[Instagram Search] Instagram API request failed after ${requestElapsedTime}ms`);
      throw axiosError;
    }
  } catch (error) {
    console.error('[Instagram Search] Error:', {
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

// Instagram 댓글 API
app.get('/api/instagram/comments', async (req, res) => {
  console.log('[Instagram Comments] 1. Request received:', {
    mediaId: req.query.mediaId,
  });
  
  try {
    const { mediaId } = req.query;
    const headersJson = req.headers['x-instagram-headers'];

    if (!mediaId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }

    if (!headersJson) {
      return res.status(400).json({ error: 'Instagram headers are required' });
    }

    const headers = JSON.parse(headersJson);
    console.log('[Instagram Comments] 2. Headers parsed');

    const url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&permalink_enabled=false`;

    console.log('[Instagram Comments] 3. Calling Instagram API:', url);
    
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    console.log('[Instagram Comments] 3b. Making request with headers...');
    const requestStartTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 30000, // 30초
        httpsAgent,
        headers: {
          'accept': '*/*',
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'cookie': headers.cookie || 'datr=pplIaROuaDR-Eteezj66cqMu; ig_did=B58512E5-3D06-429B-9DAA-D7764F93040A; mid=aUiZpgAEAAGIUG6ENeYq6qCQjWjJ; ig_nrcb=1; dpr=1; csrftoken=RmXzsdz237PHF7M0YzhbZnpdt51cbFx8; ds_user_id=2000629733; sessionid=2000629733%3Amaz7UtpYui3dL8%3A3%3AAYjXJdoD0H-JihOv7TAUtGWQqsFj__-KW1fNokMy1Q; wd=766x832; rur="HIL\\0542000629733\\0541799050400:01fe13a0a41b602544f33682b2944d8615c06054fdb1ac948020dbf700ac45fc24210465"',
          'priority': 'u=1, i',
          'referer': `https://www.instagram.com/p/${mediaId}/`,
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
          'x-csrftoken': headers['x-csrftoken'] || 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8',
          'x-ig-app-id': '936619743392459',
          'x-ig-www-claim': headers['x-ig-www-claim'] || 'hmac.AR0dSxfApOzgibnur3BvQQ8sbUZRzBbJoly1580wKwSKMZpl',
          'x-requested-with': 'XMLHttpRequest',
          'x-web-session-id': 'rgjrg7:xgqxqe:t4k3v2',
        },
      });

      // axios가 자동으로 gzip, deflate, br 압축 해제를 처리함
      console.log('[Instagram Comments] 3c. Content-Encoding:', response.headers['content-encoding']);

      const requestElapsedTime = Date.now() - requestStartTime;
      console.log(`[Instagram Comments] 4. Instagram API responded in ${requestElapsedTime}ms`);
      console.log('[Instagram Comments] 4a. Response status:', response.status);
      console.log('[Instagram Comments] 4b. Has response data:', !!response.data);
      
      if (response.data) {
        console.log('[Instagram Comments] 5. Comments count:', response.data.comments?.length || 0);
      }
      
      console.log('[Instagram Comments] 6. Sending response to client...');
      res.json(response.data);
      console.log('[Instagram Comments] 7. Response sent successfully');
    } catch (axiosError) {
      const requestElapsedTime = Date.now() - requestStartTime;
      console.error(`[Instagram Comments] Instagram API request failed after ${requestElapsedTime}ms`);
      throw axiosError;
    }
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

