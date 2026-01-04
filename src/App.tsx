import { useState } from 'react';
import type { Platform, ProductItem, Review, InstagramHeaders } from './types';
import { searchProducts, fetchAllReviews, searchMusinsaProducts, fetchAllMusinsaReviews, getInstagramUserId, fetchAllInstagramFollowers, fetchAllInstagramSearchResults } from './utils/api';
import { exportToExcel, exportInstagramToExcel, exportInstagramSearchToExcel } from './utils/excel';

const App = () => {
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
      const headers = getInstagramHeaders();
      headers.referer = instagramUrl.endsWith('/') ? `${instagramUrl}followers/` : `${instagramUrl}/followers/`;
      console.log('[App] 3. Headers prepared');

      // 1. Target ID 및 프로필 정보 추출
      console.log('[App] 4. Calling getInstagramUserId...');
      setStatus('사용자 ID를 추출하는 중...');
      const userInfo = await getInstagramUserId(instagramUrl, headers);
      const targetId = userInfo.targetId;
      console.log('[App] 5. Target ID received:', targetId);
      console.log('[App] 5a. Profile info:', {
        postCount: userInfo.postCount,
        followerCount: userInfo.followerCount,
        followingCount: userInfo.followingCount,
      });
      
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
          상품 리뷰 크롤러
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
    </div>
  );
};

export default App;

