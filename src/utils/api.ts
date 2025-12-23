import axios from 'axios';
import type { SearchRequestBody, SearchResponse, ReviewResponse, Review } from '../types';

const API_DELAY = 500; // API 호출 간 딜레이 (ms)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 29CM 검색
export const searchProducts = async (
  keyword: string,
  page: number,
  size: number = 50
): Promise<SearchResponse> => {
  const body: SearchRequestBody = {
    keyword,
    pageType: 'SRP',
    sortType: 'MOST_REVIEWED',
    facets: {},
    pageRequest: {
      page,
      size,
    },
  };

  // 프로덕션에서는 상대 경로 사용 (같은 도메인의 Express 서버)
  const apiUrl = '/api/search';
  
  const response = await axios.post<SearchResponse>(
    apiUrl,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  await delay(API_DELAY);
  return response.data;
};

// 29CM 리뷰
export const fetchReviews = async (
  itemId: number,
  page: number = 0,
  size: number = 100
): Promise<ReviewResponse> => {
  // 프로덕션에서는 상대 경로 사용 (같은 도메인의 Express 서버)
  const apiUrl = '/api/reviews';
  
  const response = await axios.get<ReviewResponse>(
    apiUrl,
    {
      params: {
        itemId,
        page,
        size,
        sort: 'BEST',
      },
    }
  );

  await delay(API_DELAY);
  return response.data;
};

export const fetchAllReviews = async (itemId: number): Promise<ReviewResponse['data']['results']> => {
  const allReviews: ReviewResponse['data']['results'] = [];
  let page = 0;
  const size = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetchReviews(itemId, page, size);
      const reviews = response.data.results;

      if (reviews.length === 0) {
        hasMore = false;
      } else {
        allReviews.push(...reviews);
        // 만약 받은 리뷰 수가 size보다 작으면 더 이상 없음
        if (reviews.length < size) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.error(`Error fetching reviews for item ${itemId} page ${page}:`, error);
      hasMore = false;
    }
  }

  return allReviews;
};

// 무신사 타입
interface MusinsaSearchGoods {
  goodsNo: number;
  goodsName: string;
}

interface MusinsaSearchResponse {
  data: {
    list: MusinsaSearchGoods[];
    pagination: {
      page: number;
      size: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
    };
  };
  meta: {
    result: string;
  };
}

interface MusinsaReviewUserProfileInfo {
  userNickName: string;
}

interface MusinsaReviewGoods {
  goodsNo: number;
}

interface MusinsaReviewItem {
  no: number;
  content: string;
  grade: string;
  createDate: string;
  goodsOption?: string;
  userProfileInfo: MusinsaReviewUserProfileInfo;
  goods: MusinsaReviewGoods;
}

interface MusinsaReviewPageInfo {
  page: number;
  totalPages: number;
}

interface MusinsaReviewResponse {
  data: {
    list: MusinsaReviewItem[];
    page: MusinsaReviewPageInfo;
  };
}

// 무신사 검색
export const searchMusinsaProducts = async (
  keyword: string,
  page: number,
  size: number = 60
): Promise<MusinsaSearchResponse> => {
  const response = await axios.get<MusinsaSearchResponse>(
    '/api/musinsa/search',
    {
      timeout: 10000,
      params: {
        keyword,
        page,
        size,
      },
    }
  );

  await delay(API_DELAY);
  return response.data;
};

// 무신사 리뷰 전체 수집 (공통 Review 타입으로 변환)
export const fetchAllMusinsaReviews = async (goodsNo: number): Promise<Review[]> => {
  const allReviews: Review[] = [];
  let page = 0;
  const pageSize = 20;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get<MusinsaReviewResponse>(
        '/api/musinsa/reviews',
        {
          timeout: 10000,
          params: {
            goodsNo,
            page,
            pageSize,
          },
        }
      );

      const list = response.data.data.list;

      if (list.length === 0) {
        hasMore = false;
      } else {
        const mapped: Review[] = list.map((item) => ({
          itemReviewNo: item.no,
          itemNo: item.goods.goodsNo,
          optionValue: item.goodsOption ? [item.goodsOption] : [],
          userId: item.userProfileInfo.userNickName,
          contents: item.content,
          point: Number(item.grade),
          insertTimestamp: item.createDate,
        }));

        allReviews.push(...mapped);

        const pageInfo = response.data.data.page;
        if (pageInfo.page + 1 >= pageInfo.totalPages) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // 랜덤 딜레이 300~400ms
      const randomDelay = 300 + Math.random() * 100;
      await delay(randomDelay);
    } catch (error) {
      console.error(`Error fetching musinsa reviews for goods ${goodsNo} page ${page}:`, error);
      hasMore = false;
    }
  }

  return allReviews;
};

