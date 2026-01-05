import { useState, useEffect } from 'react';
import type { Platform, ProductItem, Review, InstagramHeaders } from '../types';
import { searchProducts, fetchAllReviews, searchMusinsaProducts, fetchAllMusinsaReviews, getInstagramUserId, fetchAllInstagramFollowers, fetchAllInstagramSearchResults } from '../utils/api';
import { exportToExcel, exportInstagramToExcel, exportInstagramSearchToExcel } from '../utils/excel';

const HomePage = () => {
  const [platform, setPlatform] = useState<Platform>('29cm');
  const [keyword, setKeyword] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Instagram 관련 상태
  const [instagramUrl, setInstagramUrl] = useState('');
  const [maxFollowers, setMaxFollowers] = useState<number>(0);
  const [instagramSearchQuery, setInstagramSearchQuery] = useState('');
  const [maxSearchResults, setMaxSearchResults] = useState<number>(0);
  const [instagramHeadersInput, setInstagramHeadersInput] = useState('');
  const [showHeaderGuideModal, setShowHeaderGuideModal] = useState(false);
  const [headerGuideStep, setHeaderGuideStep] = useState(0);
  
  // 로컬 스토리지에서 헤더 불러오기
  useEffect(() => {
    const savedHeaders = localStorage.getItem('instagramHeadersInput');
    if (savedHeaders) {
      setInstagramHeadersInput(savedHeaders);
    }
  }, []);
  
  // 헤더 입력 값이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    if (instagramHeadersInput) {
      localStorage.setItem('instagramHeadersInput', instagramHeadersInput);
    } else {
      localStorage.removeItem('instagramHeadersInput');
    }
  }, [instagramHeadersInput]);
  
  // 하드코딩된 Instagram 인증 정보
  const instagramCookie = 'datr=pplIaROuaDR-Eteezj66cqMu; ig_did=B58512E5-3D06-429B-9DAA-D7764F93040A; mid=aUiZpgAEAAGIUG6ENeYq6qCQjWjJ; ig_nrcb=1; dpr=1; csrftoken=RmXzsdz237PHF7M0YzhbZnpdt51cbFx8; ds_user_id=2000629733; wd=562x832; sessionid=2000629733%3Amaz7UtpYui3dL8%3A3%3AAYjXJdoD0H-JihOv7TAUtGWQqsFj__-KW1fNokMy1Q; rur="HIL\\0542000629733\\0541799048072:01fed911b37bf328e4b3beb0c639cbd78851257157dbe092c7ff16cbe3cdc2d6f5f7a4a1"';
  const instagramCsrfToken = 'RmXzsdz237PHF7M0YzhbZnpdt51cbFx8';
  
  const getInstagramHeaders = (): InstagramHeaders => ({
    cookie: instagramCookie,
    'x-csrftoken': instagramCsrfToken,
    'accept': '*/*',
    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
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
    'x-ig-app-id': '936619743392459',
    'x-ig-www-claim': 'hmac.AR0dSxfApOzgibnur3BvQQ8sbUZRzBbJoly1580wKwSKMZpl',
    'x-requested-with': 'XMLHttpRequest',
    'x-web-session-id': 'un9yck:xgqxqe:5sj7kw',
  });

  // 헤더 텍스트를 파싱하여 헤더 객체로 변환
  // 지원 형식:
  // 1. 헤더명\n값\n헤더명\n값...
  // 2. 헤더명: 값\n헤더명: 값...
  const parseHeaders = (headersText: string): Partial<InstagramHeaders> | null => {
    if (!headersText.trim()) {
      return null;
    }

    try {
      const headers: Record<string, string> = {};
      const lines = headersText.split('\n');
      
      let currentKey = '';
      let currentValue = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 빈 줄은 무시
        if (!line) {
          continue;
        }
        
        // 콜론이 있는 경우 (헤더명: 값 형식)
        if (line.includes(':')) {
          // 이전 키-값 쌍 저장
          if (currentKey && currentValue) {
            headers[currentKey.toLowerCase()] = currentValue.trim();
          }
          
          const colonIndex = line.indexOf(':');
          currentKey = line.substring(0, colonIndex).trim();
          currentValue = line.substring(colonIndex + 1).trim();
          
          // 값이 있으면 바로 저장하고 초기화
          if (currentValue) {
            headers[currentKey.toLowerCase()] = currentValue;
            currentKey = '';
            currentValue = '';
          }
        } else {
          // 콜론이 없는 경우
          if (!currentKey) {
            // 키가 없으면 헤더명으로 간주
            currentKey = line;
          } else {
            // 키가 있으면 값으로 간주 (여러 줄 값 지원)
            if (currentValue) {
              currentValue += ' ' + line;
            } else {
              currentValue = line;
            }
            // 값이 설정되었으므로 저장
            headers[currentKey.toLowerCase()] = currentValue.trim();
            currentKey = '';
            currentValue = '';
          }
        }
      }
      
      // 마지막 키-값 쌍 저장 (값이 있는 경우만)
      if (currentKey && currentValue) {
        headers[currentKey.toLowerCase()] = currentValue.trim();
      }
      
      return headers as Partial<InstagramHeaders>;
    } catch (error) {
      console.error('헤더 파싱 오류:', error);
      return null;
    }
  };

  const handleInstagramCrawl = async () => {
    console.log('[App] =================================');
    console.log('[App] Instagram Crawl Started');
    console.log('[App] =================================');
    
    if (!instagramUrl.trim()) {
      alert('Instagram URL을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setStatus('Instagram 사용자 ID 추출 중...');
    setProgress({ current: 0, total: 0 });

    try {
      console.log('[App] 1. Validating Instagram URL:', instagramUrl);
      
      // URL에서 username 추출
      const urlMatch = instagramUrl.match(/instagram\.com\/([^/?]+)/);
      if (!urlMatch) {
        alert('올바른 Instagram URL 형식이 아닙니다.');
        setIsLoading(false);
        return;
      }
      const username = urlMatch[1];
      console.log('[App] Extracted username:', username);
      console.log('[App] Full URL:', instagramUrl);
      console.log('[App] 2. Username extracted:', username);

      // 헤더 준비
      let headers: InstagramHeaders;
      const parsedHeaders = parseHeaders(instagramHeadersInput);
      
      if (parsedHeaders && parsedHeaders.cookie) {
        // 파싱된 헤더에 필수 속성(cookie)이 있는 경우 사용
        headers = {
          ...parsedHeaders,
          referer: instagramUrl.endsWith('/') ? `${instagramUrl}followers/` : `${instagramUrl}/followers/`,
        } as InstagramHeaders;
        console.log('[App] 3. Headers prepared from user input');
      } else {
        headers = getInstagramHeaders();
        headers.referer = instagramUrl.endsWith('/') ? `${instagramUrl}followers/` : `${instagramUrl}/followers/`;
        console.log('[App] 3. Headers prepared (default)');
      }

      // 1. Target ID 추출
      console.log('[App] 4. Calling getInstagramUserId...');
      setStatus('사용자 ID를 추출하는 중...');
      const targetId = await getInstagramUserId(instagramUrl, headers);
      console.log('[App] 5. Target ID received:', targetId);
      
      setStatus(`사용자 ID: ${targetId} - 팔로워 수집 시작...`);

      // 2. 팔로워 가져오기
      console.log('[App] 6. Fetching followers...');
      const followers = await fetchAllInstagramFollowers(
        targetId,
        headers,
        maxFollowers > 0 ? maxFollowers : undefined
      );
      console.log('[App] 7. Followers fetched:', followers.length);

      if (followers.length === 0) {
        alert('팔로워가 없습니다.');
        setIsLoading(false);
        return;
      }

      console.log('[App] 8. Exporting to Excel...');
      setStatus('Excel 파일 생성 중...');
      exportInstagramToExcel(username, followers);

      setStatus(`완료! 총 ${followers.length}명의 팔로워를 수집했습니다.`);
      alert(`완료! 총 ${followers.length}명의 팔로워를 Excel 파일로 저장했습니다.`);
      console.log('[App] 9. SUCCESS! Export complete');
    } catch (error) {
      console.error('[App] ERROR during Instagram crawl:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('[App] Error details:', {
          message: error.message,
          response: 'response' in error ? (error as any).response?.data : undefined,
          status: 'response' in error ? (error as any).response?.status : undefined,
        });
      }
      alert('오류가 발생했습니다. 콘솔을 확인해주세요.');
      setStatus('오류 발생');
    } finally {
      setIsLoading(false);
      console.log('[App] =================================');
      console.log('[App] Instagram Crawl Finished');
      console.log('[App] =================================');
    }
  };

  const handleInstagramSearch = async () => {
    console.log('[App] =================================');
    console.log('[App] Instagram Search Started');
    console.log('[App] =================================');
    
    if (!instagramSearchQuery.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setStatus('Instagram 검색 중...');
    setProgress({ current: 0, total: 0 });

    try {
      const headers = getInstagramHeaders();
      
      setStatus(`검색어 "${instagramSearchQuery}"로 검색 중...`);
      
      const rows = await fetchAllInstagramSearchResults(
        instagramSearchQuery,
        headers,
        maxSearchResults > 0 ? maxSearchResults : undefined,
        (current, total) => {
          setStatus(`댓글 수집 중... (${current}/${total} 게시글)`);
          setProgress({ current, total });
        }
      );

      console.log(`[App] Search completed, total rows: ${rows.length}`);

      if (rows.length === 0) {
        alert('검색 결과가 없습니다.');
        return;
      }

      try {
        console.log('[App] Exporting to Excel...');
        setStatus('Excel 파일 생성 중...');
        exportInstagramSearchToExcel(rows);

        setStatus(`완료! 총 ${rows.length}개의 검색 결과를 수집했습니다.`);
        alert(`완료! 총 ${rows.length}개의 검색 결과를 Excel 파일로 저장했습니다.`);
        console.log('[App] SUCCESS! Export complete');
      } catch (exportError) {
        console.error('[App] ERROR during Excel export:', exportError);
        alert(`데이터는 수집되었지만 Excel 파일 저장 중 오류가 발생했습니다. 콘솔을 확인해주세요. (수집된 데이터: ${rows.length}개)`);
        setStatus('Excel 저장 오류 발생');
      }
    } catch (error) {
      console.error('[App] ERROR during Instagram search:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('[App] Error details:', {
          message: error.message,
          response: 'response' in error ? (error as any).response?.data : undefined,
          status: 'response' in error ? (error as any).response?.status : undefined,
        });
      }
      alert('오류가 발생했습니다. 콘솔을 확인해주세요.');
      setStatus('오류 발생');
    } finally {
      setIsLoading(false);
      console.log('[App] =================================');
      console.log('[App] Instagram Search Finished');
      console.log('[App] =================================');
    }
  };

  const handleCrawl = async () => {
    if (!keyword.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setStatus('상품 검색 중...');
    setProgress({ current: 0, total: 0 });

    try {
      // 1. 검색하여 상품 목록 가져오기
      const reviewsByProduct = new Map<number, Review[]>();

      if (platform === '29cm') {
        const allProducts: ProductItem[] = [];
        for (let page = 1; page <= pageCount; page++) {
          setStatus(`상품 검색 중... (${page}/${pageCount} 페이지)`);
          const searchResponse = await searchProducts(keyword, page, 50);
          allProducts.push(...searchResponse.data.list);

          if (!searchResponse.data.pagination.hasNext || page === pageCount) {
            break;
          }
        }

        if (allProducts.length === 0) {
          alert('검색 결과가 없습니다.');
          setIsLoading(false);
          return;
        }

        setStatus(`총 ${allProducts.length}개의 상품을 찾았습니다. 리뷰 수집 시작...`);

        const totalProducts = allProducts.length;

        for (let i = 0; i < allProducts.length; i++) {
          const product = allProducts[i];
          const itemNo = product.itemEvent.eventProperties.itemNo;

          setStatus(`리뷰 수집 중... (${i + 1}/${totalProducts} 상품)`);
          setProgress({ current: i + 1, total: totalProducts });

          try {
            const reviews = await fetchAllReviews(itemNo);
            if (reviews.length > 0) {
              reviewsByProduct.set(itemNo, reviews);
            }
          } catch (error) {
            console.error(`Error fetching reviews for item ${itemNo}:`, error);
            setStatus(`상품 ${itemNo}의 리뷰를 가져오는 중 오류 발생 (계속 진행)`);
          }
        }
      } else if (platform === 'musinsa') {
        const allGoods: { goodsNo: number }[] = [];

        for (let page = 1; page <= pageCount; page++) {
          setStatus(`무신사 상품 검색 중... (${page}/${pageCount} 페이지)`);
          const searchResponse = await searchMusinsaProducts(keyword, page, 60);
          allGoods.push(...searchResponse.data.list);

          if (!searchResponse.data.pagination.hasNext || page === pageCount) {
            break;
          }
        }

        if (allGoods.length === 0) {
          alert('검색 결과가 없습니다.');
          setIsLoading(false);
          return;
        }

        setStatus(`총 ${allGoods.length}개의 무신사 상품을 찾았습니다. 리뷰 수집 시작...`);

        const totalProducts = allGoods.length;

        for (let i = 0; i < allGoods.length; i++) {
          const goods = allGoods[i];
          const goodsNo = goods.goodsNo;

          setStatus(`무신사 리뷰 수집 중... (${i + 1}/${totalProducts} 상품)`);
          setProgress({ current: i + 1, total: totalProducts });

          try {
            const reviews = await fetchAllMusinsaReviews(goodsNo);
            if (reviews.length > 0) {
              reviewsByProduct.set(goodsNo, reviews);
            }
          } catch (error) {
            console.error(`Error fetching musinsa reviews for goods ${goodsNo}:`, error);
            setStatus(`무신사 상품 ${goodsNo}의 리뷰를 가져오는 중 오류 발생 (계속 진행)`);
          }
        }
      }

      // 3. Excel로 저장
      if (reviewsByProduct.size === 0) {
        alert('수집된 리뷰가 없습니다.');
        setIsLoading(false);
        return;
      }

      setStatus('Excel 파일 생성 중...');
      exportToExcel(platform, reviewsByProduct);
      
      const totalReviews = Array.from(reviewsByProduct.values()).reduce(
        (sum, reviews) => sum + reviews.length,
        0
      );
      
      setStatus(`완료! ${reviewsByProduct.size}개 상품, 총 ${totalReviews}개의 리뷰를 수집했습니다.`);
      alert(`완료! ${reviewsByProduct.size}개 상품, 총 ${totalReviews}개의 리뷰를 Excel 파일로 저장했습니다.`);
    } catch (error) {
      console.error('Error during crawl:', error);
      alert('오류가 발생했습니다. 콘솔을 확인해주세요.');
      setStatus('오류 발생');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          아페로 크롤러
        </h1>

        {/* 플랫폼 탭 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            플랫폼 선택
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPlatform('29cm')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                platform === '29cm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isLoading}
            >
              29cm
            </button>
            <button
              type="button"
              onClick={() => setPlatform('musinsa')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                platform === 'musinsa'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isLoading}
            >
              무신사
            </button>
            <button
              type="button"
              onClick={() => setPlatform('instagram-followers')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                platform === 'instagram-followers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isLoading}
            >
              인스타 팔로워
            </button>
            <button
              type="button"
              onClick={() => setPlatform('instagram-search')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                platform === 'instagram-search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isLoading}
            >
              인스타 검색
            </button>
          </div>
        </div>

        {/* Instagram 팔로워 전용 입력 */}
        {platform === 'instagram-followers' ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {/* Instagram URL */}
            <div className="mb-4">
              <label
                htmlFor="instagramUrl"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Instagram URL
              </label>
              <input
                id="instagramUrl"
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/username/"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 최대 팔로워 수 */}
            <div className="mb-4">
              <label
                htmlFor="maxFollowers"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                최대 팔로워 수 (0 = 전체)
              </label>
              <input
                id="maxFollowers"
                type="number"
                min="0"
                value={maxFollowers}
                onChange={(e) => setMaxFollowers(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 헤더 입력 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="instagramHeadersInput"
                  className="block text-sm font-medium text-gray-700"
                >
                  헤더 (선택사항, 빈 값이면 기본 헤더 사용)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderGuideModal(true);
                    setHeaderGuideStep(0);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  헤더 추출 방법 보기
                </button>
              </div>
              <textarea
                id="instagramHeadersInput"
                value={instagramHeadersInput}
                onChange={(e) => setInstagramHeadersInput(e.target.value)}
                placeholder="헤더명&#10;값&#10;&#10;예:&#10;accept&#10;*/*&#10;cookie&#10;datr=..."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                형식: 헤더명과 값을 줄바꿈으로 구분하여 입력하세요. (예: accept\n*/*)
              </p>
            </div>

            {/* 팔로워 수집 실행 버튼 */}
            <button
              type="button"
              onClick={handleInstagramCrawl}
              disabled={isLoading || !instagramUrl.trim()}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isLoading || !instagramUrl.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? '수집 중...' : '팔로워 수집 시작'}
            </button>
          </div>
        ) : platform === 'instagram-search' ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {/* 검색어 입력 */}
            <div className="mb-4">
              <label
                htmlFor="instagramSearchQuery"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                검색어 (예: #이벤트, 키워드)
              </label>
              <input
                id="instagramSearchQuery"
                type="text"
                value={instagramSearchQuery}
                onChange={(e) => setInstagramSearchQuery(e.target.value)}
                placeholder="#이벤트 또는 검색어 입력"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 최대 검색 결과 수 */}
            <div className="mb-4">
              <label
                htmlFor="maxSearchResults"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                최대 검색 결과 수 (0 = 전체)
              </label>
              <input
                id="maxSearchResults"
                type="number"
                min="0"
                value={maxSearchResults}
                onChange={(e) => setMaxSearchResults(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 검색 실행 버튼 */}
            <button
              type="button"
              onClick={handleInstagramSearch}
              disabled={isLoading || !instagramSearchQuery.trim()}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isLoading || !instagramSearchQuery.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLoading ? '검색 중...' : '검색 시작'}
            </button>
          </div>
        ) : (
          <>
            {/* 검색어 입력 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <label
                htmlFor="keyword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                검색어
              </label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색할 상품 키워드를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* 페이지 수 선택 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <label
                htmlFor="pageCount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                페이지 수 (한 페이지당 50개 상품)
              </label>
              <select
                id="pageCount"
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}페이지 ({num * 50}개 상품 예상)
                  </option>
                ))}
              </select>
            </div>

            {/* 실행 버튼 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <button
                type="button"
                onClick={handleCrawl}
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? '수집 중...' : '리뷰 수집 시작'}
              </button>
            </div>
          </>
        )}

        {/* 상태 표시 */}
        {status && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="text-sm text-gray-700 mb-2">
              <strong>상태:</strong> {status}
            </div>
            {progress.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>진행률</span>
                  <span>
                    {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 안내사항 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">안내사항</h2>
          {platform === 'instagram-followers' ? (
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Instagram URL을 입력하면 해당 계정의 팔로워를 수집합니다.</li>
              <li>수집된 팔로워는 Excel 파일로 저장됩니다 (A: 계정명, B: 팔로워명, C: 이름).</li>
              <li>최대 팔로워 수를 설정하지 않으면 모든 팔로워를 수집합니다.</li>
              <li>인증 정보는 자동으로 사용됩니다.</li>
            </ul>
          ) : platform === 'instagram-search' ? (
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>검색어(해시태그 포함)를 입력하면 해당 게시글들을 수집합니다.</li>
              <li>수집된 데이터는 Excel 파일로 저장됩니다 (12개 컬럼: search, ID, post, followers, following, post_date, post_like, post_content, post_comments, text_comments, comment_id, comment_date).</li>
              <li>현재는 search 데이터만 채워지며, detail과 comment 데이터는 추후 추가 예정입니다.</li>
              <li>최대 검색 결과 수를 설정하지 않으면 모든 결과를 수집합니다.</li>
              <li>인증 정보는 자동으로 사용됩니다.</li>
            </ul>
          ) : (
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>검색 결과에서 상품을 찾고, 각 상품의 모든 리뷰를 수집합니다.</li>
              <li>API 호출 시 적절한 딜레이를 두어 서버 부하를 방지합니다.</li>
              <li>수집된 리뷰는 Excel 파일로 저장되며, 각 상품별로 열이 생성됩니다.</li>
              <li>수집 시간은 상품 수와 리뷰 수에 따라 달라질 수 있습니다.</li>
            </ul>
          )}
        </div>
      </div>

      {/* 헤더 추출 방법 모달 */}
      {showHeaderGuideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">헤더 추출 방법</h2>
                <button
                  type="button"
                  onClick={() => setShowHeaderGuideModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* 단계 표시 */}
              <div className="flex items-center justify-center mb-6">
                {[0, 1, 2].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        headerGuideStep === step
                          ? 'bg-blue-600 text-white'
                          : headerGuideStep > step
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step + 1}
                    </div>
                    {step < 2 && (
                      <div
                        className={`w-16 h-1 mx-2 ${
                          headerGuideStep > step ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* 이미지 및 설명 */}
              <div className="mb-6">
                {headerGuideStep === 0 && (
                  <div>
                    <div className="mb-4 flex justify-center">
                      <img
                        src="/header-guide-1.png"
                        alt="Step 1: F12를 누르고 Network 탭에서 Fetch/XHR 클릭"
                        className="max-w-2xl w-full rounded-lg border border-gray-300 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3 text-lg">1단계: 개발자 도구 열기</h3>
                      <ol className="text-blue-800 space-y-2 list-decimal list-inside">
                        <li>팔로워를 가져오고 싶은 <strong>Instagram 계정 페이지</strong>로 이동합니다</li>
                        <li>키보드에서 <strong className="bg-blue-100 px-1 rounded">F12</strong> 키를 누릅니다</li>
                        <li>하단에 나타난 개발자 도구에서 <strong>Network</strong> 탭을 클릭합니다</li>
                        <li>필터 버튼 중 <strong>Fetch/XHR</strong>을 클릭합니다</li>
                      </ol>
                    </div>
                  </div>
                )}

                {headerGuideStep === 1 && (
                  <div>
                    <div className="mb-4 flex justify-center">
                      <img
                        src="/header-guide-2.png"
                        alt="Step 2: 팔로워 클릭하고 followers/?count로 시작하는 텍스트 클릭"
                        className="max-w-2xl w-full rounded-lg border border-gray-300 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3 text-lg">2단계: 팔로워 API 요청 찾기</h3>
                      <ol className="text-blue-800 space-y-2 list-decimal list-inside">
                        <li>Instagram 프로필 페이지에서 <strong>"팔로워"</strong> 버튼을 클릭합니다</li>
                        <li>Network 탭의 요청 목록에서 <strong className="bg-blue-100 px-1 rounded">followers/?count</strong>로 시작하는 항목을 찾습니다</li>
                        <li>해당 항목을 <strong>클릭</strong>하여 상세 정보를 엽니다</li>
                      </ol>
                    </div>
                  </div>
                )}

                {headerGuideStep === 2 && (
                  <div>
                    <div className="mb-4 flex justify-center">
                      <img
                        src="/header-guide-3.png"
                        alt="Step 3: Request Headers에서 Accept부터 최하단까지 복사"
                        className="max-w-2xl w-full rounded-lg border border-gray-300 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3 text-lg">3단계: 헤더 복사하기</h3>
                      <ol className="text-blue-800 space-y-2 list-decimal list-inside">
                        <li>우측 상세 패널에서 <strong>Headers</strong> 탭이 선택되어 있는지 확인합니다</li>
                        <li>아래로 스크롤하여 <strong>Request Headers</strong> 섹션을 찾습니다</li>
                        <li>
                          <strong className="text-red-600">제외할 항목:</strong>{' '}
                          <code className="bg-gray-200 px-1 rounded">:authority</code>,{' '}
                          <code className="bg-gray-200 px-1 rounded">:method</code>,{' '}
                          <code className="bg-gray-200 px-1 rounded">:path</code>,{' '}
                          <code className="bg-gray-200 px-1 rounded">:scheme</code>
                        </li>
                        <li>
                          <strong className="text-green-600">복사할 항목:</strong>{' '}
                          <code className="bg-gray-200 px-1 rounded">Accept</code>부터 시작하여{' '}
                          <strong>최하단까지</strong> 모든 헤더를 복사합니다
                        </li>
                        <li>복사한 내용을 위의 <strong>"헤더"</strong> 입력란에 붙여넣습니다</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setHeaderGuideStep(Math.max(0, headerGuideStep - 1))}
                  disabled={headerGuideStep === 0}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    headerGuideStep === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  ← 이전
                </button>

                <div className="text-sm text-gray-600">
                  {headerGuideStep + 1} / 3
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (headerGuideStep < 2) {
                      setHeaderGuideStep(headerGuideStep + 1);
                    } else {
                      setShowHeaderGuideModal(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {headerGuideStep < 2 ? '다음 →' : '완료'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;

