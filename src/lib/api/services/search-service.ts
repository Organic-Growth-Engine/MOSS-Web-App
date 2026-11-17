/** Search — served by the API gateway, which fans out to content, media and accounts services. */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { searchMock } from "@/lib/api/mocks/search-mock"
import type { List, SearchParams, SearchResult } from "@/lib/api/types"

export interface SearchService {
  /** GET /workspaces/{workspaceId}/search */
  search(workspaceId: string, params: SearchParams): Promise<List<SearchResult>>
}

const searchApi: SearchService = {
  search: (id, params) => http.get("search", path`/workspaces/${id}/search`, { query: params }),
}

export const searchService: SearchService = apiConfig.useMock.search ? searchMock : searchApi
