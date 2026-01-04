import axios from 'axios';
import type { SearchRequestBody, SearchResponse, ReviewResponse, Review, InstagramHeaders, InstagramFollowersResponse, InstagramFollower, InstagramSearchResponse, InstagramSearchRow, InstagramCommentResponse } from '../types';

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

// Instagram - Target ID 및 프로필 정보 추출
export const getInstagramUserId = async (
  url: string,
  headers: InstagramHeaders
): Promise<{ targetId: string; postCount?: number | null; followerCount?: number | null; followingCount?: number | null }> => {
  console.log('[Frontend] 1. Calling getInstagramUserId with URL:', url);
  console.log('[Frontend] 2. Headers being sent:', {
    hasCookie: !!headers.cookie,
    cookieLength: headers.cookie?.length,
    csrfToken: headers['x-csrftoken'],
    appId: headers['x-ig-app-id'],
  });
  
  try {
    console.log('[Frontend] 3. Making POST request to /api/instagram/user-id');
    
    const response = await axios.post<{ 
      targetId: string; 
      postCount?: number | null; 
      followerCount?: number | null; 
      followingCount?: number | null;
    }>(
      '/api/instagram/user-id',
      {
        url,
        headers,
      }
    );
    
    console.log('[Frontend] 4. Response received:', response.data);
    console.log('[Frontend] 5. Target ID extracted:', response.data.targetId);
    console.log('[Frontend] 5a. Profile counts:', {
      postCount: response.data.postCount,
      followerCount: response.data.followerCount,
      followingCount: response.data.followingCount,
    });
    
    await delay(API_DELAY);
    return response.data;
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('[Frontend] ERROR in getInstagramUserId:', {
        message: error.message,
        status: 'response' in error ? (error as any).response?.status : undefined,
        statusText: 'response' in error ? (error as any).response?.statusText : undefined,
        data: 'response' in error ? (error as any).response?.data : undefined,
      });
    } else {
      console.error('[Frontend] ERROR in getInstagramUserId:', error);
    }
    throw error;
  }
};

// Instagram - 팔로워 가져오기
export const fetchInstagramFollowers = async (
  targetId: string,
  headers: InstagramHeaders,
  maxId?: string,
  count: number = 12
): Promise<InstagramFollowersResponse> => {
  const response = await axios.post<InstagramFollowersResponse>(
    '/api/instagram/followers',
    {
      targetId,
      count,
      maxId,
      headers,
    }
  );
  
  // 1초 ~ 1.5초 사이 랜덤 딜레이
  const randomDelay = 1000 + Math.random() * 500;
  console.log(`[Instagram Followers] Waiting ${(randomDelay / 1000).toFixed(2)}s before next request...`);
  await delay(randomDelay);
  return response.data;
};

// Instagram - 모든 팔로워 가져오기
export const fetchAllInstagramFollowers = async (
  targetId: string,
  headers: InstagramHeaders,
  maxFollowers?: number
): Promise<InstagramFollower[]> => {
  const allFollowers: InstagramFollower[] = [];
  let maxId: string | undefined = undefined;
  let hasMore = true;
  let pageCount = 0;
  
  console.log('[Instagram Followers] Starting fetch, maxFollowers:', maxFollowers || 'unlimited');
  
  while (hasMore) {
    try {
      pageCount++;
      console.log(`[Instagram Followers] Fetching page ${pageCount}, maxId: ${maxId || 'none'}, current total: ${allFollowers.length}`);
      
      const response = await fetchInstagramFollowers(targetId, headers, maxId, 50);
      
      console.log(`[Instagram Followers] Page ${pageCount} response:`, {
        usersCount: response.users?.length || 0,
        hasMore: response.has_more,
        nextMaxId: response.next_max_id,
        status: response.status,
      });
      
      if (response.users && response.users.length > 0) {
        allFollowers.push(...response.users);
        console.log(`[Instagram Followers] Added ${response.users.length} followers, total now: ${allFollowers.length}`);
        
        if (maxFollowers && allFollowers.length >= maxFollowers) {
          console.log(`[Instagram Followers] Reached maxFollowers limit (${maxFollowers}), stopping at ${allFollowers.length}`);
          return allFollowers.slice(0, maxFollowers);
        }
        
        if (response.has_more && response.next_max_id) {
          maxId = response.next_max_id;
          console.log(`[Instagram Followers] More followers available, next_max_id: ${maxId}`);
        } else {
          console.log(`[Instagram Followers] No more followers available (has_more: ${response.has_more}, next_max_id: ${response.next_max_id})`);
          hasMore = false;
        }
      } else {
        console.log(`[Instagram Followers] No users in response, stopping`);
        hasMore = false;
      }
    } catch (error) {
      console.error('[Instagram Followers] Error fetching page:', error);
      hasMore = false;
    }
  }
  
  console.log(`[Instagram Followers] Completed! Total pages: ${pageCount}, Total followers: ${allFollowers.length}`);
  return allFollowers;
};

// Instagram - 검색 API 호출
export const searchInstagram = async (
  query: string,
  headers: InstagramHeaders
): Promise<InstagramSearchResponse> => {
  console.log('[Frontend] =================================');
  console.log('[Frontend] searchInstagram called with query:', query);
  
  try {
    console.log('[Frontend] Making axios request to /api/instagram/search...');
    const requestStartTime = Date.now();
    
    // query에 #이 포함되어 있을 수 있으므로 직접 URL에 포함
    const encodedQuery = encodeURIComponent(query);
    const response = await axios.get<InstagramSearchResponse>(
      `/api/instagram/search?query=${encodedQuery}`,
      {
        headers: {
          'x-instagram-headers': JSON.stringify(headers),
        },
        timeout: 30000, // 30초 타임아웃
      }
    );
    
    const requestElapsedTime = Date.now() - requestStartTime;
    console.log(`[Frontend] Request completed in ${requestElapsedTime}ms`);
    console.log('[Frontend] Response status:', response.status);
    console.log('[Frontend] Response has data:', !!response.data);
    
    if (response.data) {
      console.log('[Frontend] Response data keys:', Object.keys(response.data));
      console.log('[Frontend] Response status field:', response.data.status);
      console.log('[Frontend] Has media_grid:', !!response.data.media_grid);
      if (response.data.media_grid) {
        console.log('[Frontend] Sections count:', response.data.media_grid.sections?.length || 0);
      }
    } else {
      console.warn('[Frontend] WARNING: Response data is empty!');
    }
    
    console.log('[Frontend] =================================');
    return response.data;
  } catch (error) {
    console.error('[Frontend] =================================');
    console.error('[Frontend] searchInstagram ERROR:', error);
    if (error && typeof error === 'object') {
      if ('response' in error) {
        console.error('[Frontend] Error response:', {
          status: (error as any).response?.status,
          statusText: (error as any).response?.statusText,
          data: (error as any).response?.data,
        });
      }
      if ('message' in error) {
        console.error('[Frontend] Error message:', (error as any).message);
      }
      if ('code' in error) {
        console.error('[Frontend] Error code:', (error as any).code);
      }
    }
    console.error('[Frontend] =================================');
    throw error;
  }
};

// Instagram - 댓글 API 호출
export const fetchInstagramComments = async (
  mediaId: string,
  headers: InstagramHeaders
): Promise<InstagramCommentResponse> => {
  console.log('[Frontend] =================================');
  console.log('[Frontend] fetchInstagramComments called with mediaId:', mediaId);
  
  try {
    console.log('[Frontend] Making axios request to /api/instagram/comments...');
    const requestStartTime = Date.now();
    
    const response = await axios.get<InstagramCommentResponse>(
      `/api/instagram/comments?mediaId=${mediaId}`,
      {
        headers: {
          'x-instagram-headers': JSON.stringify(headers),
        },
        timeout: 30000, // 30초 타임아웃
      }
    );
    
    const requestElapsedTime = Date.now() - requestStartTime;
    console.log(`[Frontend] Request completed in ${requestElapsedTime}ms`);
    console.log('[Frontend] Response status:', response.status);
    console.log('[Frontend] Comments count:', response.data.comments?.length || 0);
    console.log('[Frontend] =================================');
    return response.data;
  } catch (error) {
    console.error('[Frontend] =================================');
    console.error('[Frontend] fetchInstagramComments ERROR:', error);
    if (error && typeof error === 'object') {
      if ('response' in error) {
        console.error('[Frontend] Error response:', {
          status: (error as any).response?.status,
          statusText: (error as any).response?.statusText,
          data: (error as any).response?.data,
        });
      }
      if ('message' in error) {
        console.error('[Frontend] Error message:', (error as any).message);
      }
    }
    console.error('[Frontend] =================================');
    throw error;
  }
};

// Instagram - 검색 결과를 Row 데이터로 변환 (댓글 포함)
// 하나의 게시글에 여러 댓글이 있으면 각 댓글마다 행 생성
export const parseInstagramSearchResponse = (
  response: InstagramSearchResponse,
  searchQuery: string
): Array<{ row: InstagramSearchRow; mediaPk: string }> => {
  const result: Array<{ row: InstagramSearchRow; mediaPk: string }> = [];
  
  if (!response.media_grid?.sections) {
    return result;
  }
  
  for (const section of response.media_grid.sections) {
    if (!section.layout_content?.medias) {
      continue;
    }
    
    for (const mediaItem of section.layout_content.medias) {
      const media = mediaItem.media;
      
      // 게시자 ID 추출 (user 또는 owner에서)
      const username = media.user?.username || media.owner?.username || '';
      
      // 게시 날짜 변환 (Unix timestamp를 날짜 문자열로)
      const postDate = media.caption?.created_at 
        ? new Date(media.caption.created_at * 1000).toISOString().split('T')[0]
        : (media.taken_at ? new Date(media.taken_at * 1000).toISOString().split('T')[0] : '');
      
      // 게시글 내용 추출
      const postContent = media.caption?.text || '';
      
      // 기본 행 데이터 (댓글이 없어도 하나의 행은 생성)
      const baseRow: InstagramSearchRow = {
        search: searchQuery,
        ID: username,
        post: '', // detail - 나중에
        followers: '', // detail - 나중에
        following: '', // detail - 나중에
        post_date: postDate,
        post_like: media.like_count || 0,
        post_content: postContent,
        post_comments: media.comment_count || 0,
        text_comments: '', // comment - 나중에
        comment_id: '', // comment - 나중에
        comment_date: '', // comment - 나중에
      };
      
      // 댓글이 없어도 하나의 행은 생성 (댓글 정보는 빈 값)
      result.push({
        row: baseRow,
        mediaPk: media.pk,
      });
    }
  }
  
  return result;
};

// Instagram - 검색 결과 가져오기 (댓글 포함)
// 하나의 게시글에 여러 댓글이 있으면 각 댓글마다 행 생성
export const fetchAllInstagramSearchResults = async (
  query: string,
  headers: InstagramHeaders,
  maxResults?: number,
  onProgress?: (current: number, total: number) => void
): Promise<InstagramSearchRow[]> => {
  console.log('[Instagram Search] =================================');
  console.log('[Instagram Search] Starting search, query:', query, 'maxResults:', maxResults || 'unlimited');
  console.log('[Instagram Search] =================================');
  
  try {
    console.log('[Instagram Search] Step 1: Calling searchInstagram...');
    const startTime = Date.now();
    
    const response = await searchInstagram(query, headers);
    
    const elapsedTime = Date.now() - startTime;
    console.log(`[Instagram Search] Step 2: searchInstagram completed in ${elapsedTime}ms`);
    console.log('[Instagram Search] Step 2a: Response received:', {
      hasResponse: !!response,
      status: response?.status,
      hasMediaGrid: !!response?.media_grid,
      sectionsCount: response?.media_grid?.sections?.length || 0,
    });
    
    if (!response) {
      throw new Error('No response received from searchInstagram');
    }
    
    console.log('[Instagram Search] Step 3: Parsing response...');
    const parsedResults = parseInstagramSearchResponse(response, query);
    
    console.log(`[Instagram Search] Step 4: Parsing completed. Media count:`, parsedResults.length);
    
    // 각 게시글에 대해 댓글 가져오기
    const finalRows: InstagramSearchRow[] = [];
    const totalMedia = parsedResults.length;
    
    for (let i = 0; i < parsedResults.length; i++) {
      const { row: baseRow, mediaPk } = parsedResults[i];
      
      if (onProgress) {
        onProgress(i + 1, totalMedia);
      }
      
      try {
        console.log(`[Instagram Search] Step 5.${i + 1}: Fetching comments for media ${mediaPk}...`);
        const commentsResponse = await fetchInstagramComments(mediaPk, headers);
        
        if (commentsResponse.comments && commentsResponse.comments.length > 0) {
          // 각 댓글마다 행 생성
          for (const comment of commentsResponse.comments) {
            const commentDate = comment.created_at 
              ? new Date(comment.created_at * 1000).toISOString().split('T')[0]
              : '';
            
            finalRows.push({
              ...baseRow,
              text_comments: comment.text || '',
              comment_id: comment.user?.username || '',
              comment_date: commentDate,
            });
          }
        } else {
          // 댓글이 없어도 하나의 행은 생성 (댓글 정보는 빈 값)
          finalRows.push(baseRow);
        }
        
        // API 호출 간 딜레이
        await delay(API_DELAY);
      } catch (commentError) {
        console.error(`[Instagram Search] Error fetching comments for media ${mediaPk}:`, commentError);
        // 댓글 가져오기 실패해도 기본 행은 추가
        finalRows.push(baseRow);
      }
    }
    
    console.log(`[Instagram Search] Step 6: Completed! Total rows: ${finalRows.length} (from ${totalMedia} media)`);
    
    // maxResults가 설정되어 있으면 제한
    if (maxResults && finalRows.length > maxResults) {
      console.log(`[Instagram Search] Step 7: Limiting results to ${maxResults} (from ${finalRows.length})`);
      return finalRows.slice(0, maxResults);
    }
    
    console.log('[Instagram Search] =================================');
    return finalRows;
  } catch (error) {
    console.error('[Instagram Search] =================================');
    console.error('[Instagram Search] ERROR:', error);
    if (error instanceof Error) {
      console.error('[Instagram Search] Error message:', error.message);
      console.error('[Instagram Search] Error stack:', error.stack);
    }
    console.error('[Instagram Search] =================================');
    throw error;
  }
};

