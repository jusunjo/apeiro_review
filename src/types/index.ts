export interface SearchRequestBody {
  keyword: string;
  pageType: string;
  sortType: string;
  facets: Record<string, unknown>;
  pageRequest: {
    page: number;
    size: number;
  };
}

export interface SearchResponse {
  meta: {
    result: string;
  };
  data: {
    keywordTypes: string[];
    list: ProductItem[];
    pagination: {
      page: number;
      size: number;
      hasNext: boolean;
      totalCount: number;
    };
  };
}

export interface ProductItem {
  itemId: number;
  itemType: string;
  itemEvent: {
    eventProperties: {
      itemNo: number;
      itemName: string;
    };
  };
}

export interface ReviewResponse {
  result: string;
  data: {
    count: number;
    results: Review[];
  };
}

export interface Review {
  itemReviewNo: number;
  itemNo: number;
  optionValue: string[];
  userId: string;
  contents: string;
  point: number;
  insertTimestamp: string;
}

export type Platform = '29cm' | 'musinsa' | 'instagram-followers' | 'instagram-search';

export interface InstagramHeaders {
  accept?: string;
  'accept-encoding'?: string;
  'accept-language'?: string;
  cookie: string;
  priority?: string;
  referer?: string;
  'sec-ch-prefers-color-scheme'?: string;
  'sec-ch-ua'?: string;
  'sec-ch-ua-full-version-list'?: string;
  'sec-ch-ua-mobile'?: string;
  'sec-ch-ua-model'?: string;
  'sec-ch-ua-platform'?: string;
  'sec-ch-ua-platform-version'?: string;
  'sec-fetch-dest'?: string;
  'sec-fetch-mode'?: string;
  'sec-fetch-site'?: string;
  'user-agent'?: string;
  'x-asbd-id'?: string;
  'x-csrftoken'?: string;
  'x-ig-app-id'?: string;
  'x-ig-www-claim'?: string;
  'x-requested-with'?: string;
  'x-web-session-id'?: string;
}

export interface InstagramFollower {
  pk: string;
  pk_id: string;
  id: string;
  full_name: string;
  username: string;
  profile_pic_url: string;
  is_verified: boolean;
  is_private: boolean;
}

export interface InstagramFollowersResponse {
  users: InstagramFollower[];
  big_list: boolean;
  page_size: number;
  next_max_id?: string;
  has_more: boolean;
  status: string;
}

// Instagram 검색 관련 타입
export interface InstagramSearchMedia {
  media: {
    pk: string;
    id: string;
    user?: {
      username: string;
    };
    owner?: {
      username: string;
    };
    caption?: {
      text: string;
      created_at: number;
    };
    like_count: number;
    comment_count: number;
    taken_at: number;
  };
}

export interface InstagramSearchResponse {
  media_grid: {
    sections: Array<{
      layout_content: {
        medias: InstagramSearchMedia[];
      };
    }>;
    next_max_id?: string | null;
    has_more: boolean;
  };
  status: string;
}

// Instagram 댓글 관련 타입
export interface InstagramComment {
  pk: string;
  user_id: number;
  text: string;
  created_at: number;
  created_at_utc: number;
  user: {
    pk: string;
    username: string;
    full_name: string;
  };
}

export interface InstagramCommentResponse {
  comments: InstagramComment[];
  comment_count: number;
  has_more_comments: boolean;
  has_more_headload_comments?: boolean;
  next_max_id?: string | null;
  next_min_id?: string | null;
  status: string;
}

// Instagram 검색 결과 데이터 (12개 컬럼)
// 하나의 게시글에 여러 댓글이 있으면 각 댓글마다 행 생성
export interface InstagramSearchRow {
  search: string; // 검색어
  ID: string; // 게시자 id (username)
  post: string; // post 개수 (detail - 나중에)
  followers: string; // follower 수 (detail - 나중에)
  following: string; // following 수 (detail - 나중에)
  post_date: string; // 게시 날짜 (created_at)
  post_like: number; // 게시글 좋아요 수 (like_count)
  post_content: string; // 게시글 내용 (caption.text)
  post_comments: number; // 게시글 댓글 개수 (comment_count)
  text_comments: string; // 게시글 댓글 내용 (comment)
  comment_id: string; // 댓글 작성자 (comment)
  comment_date: string; // 댓글 작성 날짜 (comment)
}

