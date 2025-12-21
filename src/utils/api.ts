import axios from 'axios';
import type { SearchRequestBody, SearchResponse, ReviewResponse } from '../types';

const API_DELAY = 500; // API 호출 간 딜레이 (ms)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  const apiUrl = import.meta.env.PROD 
    ? '/api/search' 
    : 'http://localhost:3001/api/search';
  
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

export const fetchReviews = async (
  itemId: number,
  page: number = 0,
  size: number = 100
): Promise<ReviewResponse> => {
  const apiUrl = import.meta.env.PROD 
    ? '/api/reviews' 
    : 'http://localhost:3001/api/reviews';
  
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

