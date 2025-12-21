import { useState } from 'react';
import type { Platform, ProductItem, Review } from './types';
import { searchProducts, fetchAllReviews } from './utils/api';
import { exportToExcel } from './utils/excel';

const App = () => {
  const [platform, setPlatform] = useState<Platform>('29cm');
  const [keyword, setKeyword] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
      const allProducts: ProductItem[] = [];
      for (let page = 1; page <= pageCount; page++) {
        setStatus(`상품 검색 중... (${page}/${pageCount} 페이지)`);
        const searchResponse = await searchProducts(keyword, page, 50);
        allProducts.push(...searchResponse.data.list);
        
        // 마지막 페이지거나 더 이상 없으면 중단
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
      
      // 2. 각 상품의 리뷰 수집
      const reviewsByProduct = new Map<number, Review[]>();
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

      // 3. Excel로 저장
      if (reviewsByProduct.size === 0) {
        alert('수집된 리뷰가 없습니다.');
        setIsLoading(false);
        return;
      }

      setStatus('Excel 파일 생성 중...');
      exportToExcel(reviewsByProduct);
      
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
          </div>
        </div>

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
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>검색 결과에서 상품을 찾고, 각 상품의 모든 리뷰를 수집합니다.</li>
            <li>API 호출 시 적절한 딜레이를 두어 서버 부하를 방지합니다.</li>
            <li>수집된 리뷰는 Excel 파일로 저장되며, 각 상품별로 열이 생성됩니다.</li>
            <li>수집 시간은 상품 수와 리뷰 수에 따라 달라질 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;

