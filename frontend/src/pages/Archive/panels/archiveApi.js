/**
 * hooks/archiveApi.js — ArchivePage 관련 API 함수 모음
 *
 * §25-1 코드 동기화 원칙: 모든 /api/* 호출 경로를 이 파일에 집중.
 * verify_api_routes.js 검증 대상.
 *
 * 사용처:
 *  - useArchiveData.js (초기화 시)
 *  - MyInfoPanel.jsx   (인물정보 저장, 사진 업로드)
 *  - FamilyPanel.jsx   (관계 CRUD)
 */

// ── 기본 fetch 헬퍼 ───────────────────────────────────────────────────────────
export async function apiFetch(path, opts = {}) {
  const res  = await fetch(path, { credentials: 'include', ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e    = new Error(json.message || `HTTP ${res.status}`);
    e.status   = res.status;
    throw e;
  }
  return json;
}

// ── 박물관 ────────────────────────────────────────────────────────────────────

/** GET /api/museum/:subdomain → { id, site_id, ... } */
export async function fetchMuseum(subdomain) {
  const data = await apiFetch(`/api/museum/${subdomain}`);
  return data.data ?? data.museum ?? data;
}

// ── 인물 ─────────────────────────────────────────────────────────────────────

/**
 * PUT /api/persons/:siteId/:personId
 * 인물 기본 정보 저장 (§8 좌측 폼)
 */
export async function savePerson(siteId, personId, fields) {
  return apiFetch(`/api/persons/${siteId}/${personId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/**
 * POST /api/persons/:siteId/:personId/photo
 * 프로필 사진 업로드 (§19: profile.jpg 로 저장)
 */
export async function uploadPhoto(siteId, personId, file) {
  const fd = new FormData();
  fd.append('photo', file);
  return apiFetch(`/api/persons/${siteId}/${personId}/photo`, {
    method: 'POST',
    body:   fd,
  });
}

/**
 * POST /api/persons/:siteId
 * 새 가족 추가 (§19: person_relations 기반, §28 자녀 생성 규칙)
 */
export async function createPerson(siteId, fields) {
  return apiFetch(`/api/persons/${siteId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/**
 * GET /api/persons/:siteId/:personId
 * 단일 인물 조회 (treeStore에 없는 ghost 인물용)
 */
export async function fetchPersonById(siteId, personId) {
  const d = await apiFetch(`/api/persons/${siteId}/${personId}`);
  return d.data ?? null;
}

/**
 * DELETE /api/persons/:siteId/:personId
 * 인물 트리 제거
 */
export async function deletePerson(siteId, personId) {
  return apiFetch(`/api/persons/${siteId}/${personId}`, { method: 'DELETE' });
}

// ── 관계 ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/persons/:siteId/relations
 * 관계 목록 조회 (§8/§9 관계 탭)
 */
export async function fetchRelations(siteId) {
  const d = await apiFetch(`/api/persons/${siteId}/relations`);
  return d.data ?? [];
}

/**
 * DELETE /api/persons/:siteId/relations/:relationId
 * 관계 해제 (§8/§9: "정말 관계를 해제하시겠습니까?" 확인 후 호출)
 */
export async function deleteRelation(siteId, relationId) {
  return apiFetch(`/api/persons/${siteId}/relations/${relationId}`, { method: 'DELETE' });
}

// ── 알림 ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications?siteId=:siteId
 * 통합 알림 조회 (§26-3 자동 통합 발생 시)
 */
export async function fetchMergeNotifications(siteId) {
  const d = await apiFetch(`/api/notifications?siteId=${siteId}`);
  return (d.data ?? []).filter(n => n.mergedPersonId);
}

export async function fetchExhibitionItems(siteId, type) {
  const d = await apiFetch(`/api/exhibitions/${siteId}/${type}`);
  return d.data ?? [];
}

export async function uploadExhibitionFile(siteId, type, files, meta = {}) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  if (meta.title)       form.append('title', meta.title);
  if (meta.description) form.append('description', meta.description);
  form.append('isPublic', meta.isPublic ? 'true' : 'false');
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/exhibitions/${siteId}/${type}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error((await res.json()).message || '업로드 실패');
  return res.json();
}

export async function deleteExhibitionItem(siteId, type, itemId) {
  return apiFetch(`/api/exhibitions/${siteId}/${type}/${itemId}`, { method: 'DELETE' });
}

// ── 사진자료실 폴더 (§8-A) ────────────────────────────────────────────────────

const photoBase = (siteId) => `/api/photo-folders/${siteId}`;

/** 폴더 목록 (사진 수 포함) */
export async function fetchPhotoFolders(siteId) {
  const d = await apiFetch(photoBase(siteId));
  return d.data ?? [];
}

/** 폴더 생성 */
export async function createPhotoFolder(siteId, name, sort_order = 0) {
  return apiFetch(photoBase(siteId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sort_order }),
  });
}

/** 폴더 이름 변경 */
export async function renamePhotoFolder(siteId, folderId, name) {
  return apiFetch(`${photoBase(siteId)}/${folderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

/** 폴더 삭제 */
export async function deletePhotoFolder(siteId, folderId) {
  return apiFetch(`${photoBase(siteId)}/${folderId}`, { method: 'DELETE' });
}

/** 드래그 순서 일괄 저장 */
export async function reorderPhotoFolders(siteId, orders) {
  return apiFetch(`${photoBase(siteId)}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
}

/** 전체 사진 수 */
export async function getPhotoCount(siteId) {
  const d = await apiFetch(`${photoBase(siteId)}/count`);
  return d.count ?? 0;
}

/** 폴더 사진 목록 */
export async function fetchFolderPhotos(siteId, folderId) {
  const d = await apiFetch(`${photoBase(siteId)}/${folderId}/photos`);
  return d.data ?? [];
}

/** 사진 업로드 */
export async function uploadFolderPhotos(siteId, folderId, files) {
  const form = new FormData();
  files.forEach(f => form.append('photos', f));
  const res = await fetch(`${photoBase(siteId)}/${folderId}/photos`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || '업로드 실패');
  return json;
}

/** 사진 메모/태그/대표 수정 */
export async function updateFolderPhoto(siteId, folderId, photoId, fields) {
  return apiFetch(`${photoBase(siteId)}/${folderId}/photos/${photoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

/** 사진 삭제 */
export async function deleteFolderPhoto(siteId, folderId, photoId) {
  return apiFetch(`${photoBase(siteId)}/${folderId}/photos/${photoId}`, { method: 'DELETE' });
}

// ── 주요자료실 폴더 (§8-B) ────────────────────────────────────────────────────

const docBase = (siteId) => `/api/document-folders/${siteId}`;

export async function fetchDocFolders(siteId) {
  const d = await apiFetch(docBase(siteId));
  return d.data ?? [];
}

export async function createDocFolder(siteId, name, sort_order = 0) {
  return apiFetch(docBase(siteId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sort_order }),
  });
}

export async function renameDocFolder(siteId, folderId, name) {
  return apiFetch(`${docBase(siteId)}/${folderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteDocFolder(siteId, folderId) {
  return apiFetch(`${docBase(siteId)}/${folderId}`, { method: 'DELETE' });
}

export async function reorderDocFolders(siteId, orders) {
  return apiFetch(`${docBase(siteId)}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
}

export async function getDocUsage(siteId) {
  const d = await apiFetch(`${docBase(siteId)}/usage`);
  return d;
}

export async function fetchFolderDocuments(siteId, folderId) {
  const d = await apiFetch(`${docBase(siteId)}/${folderId}/documents`);
  return d.data ?? [];
}

export async function uploadFolderDocument(siteId, folderId, file, title) {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);
  const res = await fetch(`${docBase(siteId)}/${folderId}/documents`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || '업로드 실패');
  return json;
}

export async function updateFolderDocument(siteId, folderId, docId, fields) {
  return apiFetch(`${docBase(siteId)}/${folderId}/documents/${docId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

export async function deleteFolderDocument(siteId, folderId, docId) {
  return apiFetch(`${docBase(siteId)}/${folderId}/documents/${docId}`, { method: 'DELETE' });
}

// ── §8-C 주요약력 ─────────────────────────────────────────────────────────────

const careerBase = (siteId) => `/api/career/${siteId}`;

/** GET /api/career/:siteId — 약력 목록 */
export async function fetchCareerItems(siteId) {
  const data = await apiFetch(careerBase(siteId));
  return data.items ?? [];
}

/** POST /api/career/:siteId — 항목 추가 */
export async function createCareerItem(siteId, fields) {
  return apiFetch(careerBase(siteId), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** PUT /api/career/:siteId/reorder — 순서 저장 */
export async function reorderCareerItems(siteId, orderedIds) {
  return apiFetch(`${careerBase(siteId)}/reorder`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ orderedIds }),
  });
}

/** PUT /api/career/:siteId/:itemId — 항목 수정 */
export async function updateCareerItem(siteId, itemId, fields) {
  return apiFetch(`${careerBase(siteId)}/${itemId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** DELETE /api/career/:siteId/:itemId — 항목 삭제 */
export async function deleteCareerItem(siteId, itemId) {
  return apiFetch(`${careerBase(siteId)}/${itemId}`, { method: 'DELETE' });
}

// ── §8-D 자서전 ───────────────────────────────────────────────────────────────

const autoBase = (siteId) => `/api/autobiography/${siteId}`;

/** GET /api/autobiography/:siteId — 챕터 + 파일 목록 */
export async function fetchAutoChapters(siteId) {
  return apiFetch(autoBase(siteId));
}

/** POST /api/autobiography/:siteId/chapters — 챕터 추가 */
export async function createAutoChapter(siteId, fields) {
  return apiFetch(`${autoBase(siteId)}/chapters`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** PUT /api/autobiography/:siteId/chapters/reorder */
export async function reorderAutoChapters(siteId, orderedIds) {
  return apiFetch(`${autoBase(siteId)}/chapters/reorder`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ orderedIds }),
  });
}

/** PUT /api/autobiography/:siteId/chapters/:id */
export async function updateAutoChapter(siteId, id, fields) {
  return apiFetch(`${autoBase(siteId)}/chapters/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** DELETE /api/autobiography/:siteId/chapters/:id */
export async function deleteAutoChapter(siteId, id) {
  return apiFetch(`${autoBase(siteId)}/chapters/${id}`, { method: 'DELETE' });
}

/** POST /api/autobiography/:siteId/upload — 파일 업로드 */
export async function uploadAutoFile(siteId, personId, file) {
  const form = new FormData();
  form.append('file', file);
  form.append('person_id', String(personId ?? 0));
  const res  = await fetch(autoBase(siteId) + '/upload', { method: 'POST', credentials: 'include', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ── §8-E 작품실 (artwork_folders) ────────────────────────────────────────────

const artworkBase = (siteId) => `/api/artwork-folders/${siteId}`;

export async function fetchArtworkFolders(siteId) {
  const d = await apiFetch(artworkBase(siteId));
  return d.data ?? [];
}

export async function createArtworkFolder(siteId, name, sort_order = 0, person_id) {
  return apiFetch(artworkBase(siteId), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, sort_order, person_id }),
  });
}

export async function renameArtworkFolder(siteId, folderId, name) {
  return apiFetch(`${artworkBase(siteId)}/${folderId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  });
}

export async function deleteArtworkFolder(siteId, folderId) {
  return apiFetch(`${artworkBase(siteId)}/${folderId}`, { method: 'DELETE' });
}

export async function reorderArtworkFolders(siteId, orders) {
  return apiFetch(`${artworkBase(siteId)}/reorder`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ orders }),
  });
}

export async function fetchFolderArtworks(siteId, folderId) {
  const d = await apiFetch(`${artworkBase(siteId)}/${folderId}/artworks`);
  return d.data ?? [];
}

export async function uploadArtwork(siteId, folderId, file, meta = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('title', meta.title || file.name);
  if (meta.year_created) form.append('year_created', String(meta.year_created));
  if (meta.description)  form.append('description',  meta.description);
  form.append('is_public', meta.is_public ? 'true' : 'false');
  if (meta.person_id)    form.append('person_id', String(meta.person_id));
  const res  = await fetch(`${artworkBase(siteId)}/${folderId}/artworks`, { method: 'POST', body: form, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || '업로드 실패');
  return json;
}

export async function updateArtwork(siteId, folderId, artId, fields) {
  return apiFetch(`${artworkBase(siteId)}/${folderId}/artworks/${artId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

export async function deleteArtwork(siteId, folderId, artId) {
  return apiFetch(`${artworkBase(siteId)}/${folderId}/artworks/${artId}`, { method: 'DELETE' });
}

// ── §8-F 음성·동영상 ──────────────────────────────────────────────────────────

const mediaBase = (siteId) => `/api/media/${siteId}`;

/** GET /api/media/:siteId — 목록 */
export async function fetchMediaItems(siteId) {
  const d = await apiFetch(mediaBase(siteId));
  return d.data ?? [];
}

/** POST /api/media/:siteId/upload — 파일 업로드 */
export async function uploadMediaFile(siteId, file, meta = {}) {
  const form = new FormData();
  form.append('file', file);
  if (meta.title)       form.append('title',       meta.title);
  if (meta.recorded_at) form.append('recorded_at', meta.recorded_at);
  if (meta.memo)        form.append('memo',        meta.memo);
  if (meta.person_id)   form.append('person_id',   String(meta.person_id));
  form.append('is_public', meta.is_public ? 'true' : 'false');
  const res  = await fetch(`${mediaBase(siteId)}/upload`, { method: 'POST', body: form, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || '업로드 실패');
  return json;
}

/** POST /api/media/:siteId/record — 브라우저 녹음 저장 */
export async function saveRecording(siteId, blob, meta = {}) {
  const form = new FormData();
  form.append('file', blob, 'recording.webm');
  if (meta.title)       form.append('title',       meta.title);
  if (meta.recorded_at) form.append('recorded_at', meta.recorded_at);
  if (meta.memo)        form.append('memo',        meta.memo);
  if (meta.person_id)   form.append('person_id',   String(meta.person_id));
  const res  = await fetch(`${mediaBase(siteId)}/record`, { method: 'POST', body: form, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || '저장 실패');
  return json;
}

/** PATCH /api/media/:siteId/:id — 수정 */
export async function updateMediaItem(siteId, id, fields) {
  return apiFetch(`${mediaBase(siteId)}/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** DELETE /api/media/:siteId/:id — 삭제 */
export async function deleteMediaItem(siteId, id) {
  return apiFetch(`${mediaBase(siteId)}/${id}`, { method: 'DELETE' });
}

// ── §8-G 공유앨범 ────────────────────────────────────────────────────────────

const albumBase = (siteId) => `/api/shared-album/${siteId}`;

/** GET /api/shared-album/:siteId — 앨범 + 사진 목록 */
export async function fetchSharedAlbum(siteId) {
  return apiFetch(albumBase(siteId));
}

/** POST /api/shared-album/:siteId/photos — 사진 업로드 */
export async function uploadSharedPhoto(siteId, file, uploaderName) {
  const form = new FormData();
  form.append('photo', file);
  if (uploaderName) form.append('uploader_name', uploaderName);
  const res  = await fetch(`${albumBase(siteId)}/photos`, { method: 'POST', body: form, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || '업로드 실패'), { code: json.code });
  return json;
}

/** DELETE /api/shared-album/:siteId/photos/:id */
export async function deleteSharedPhoto(siteId, id) {
  return apiFetch(`${albumBase(siteId)}/photos/${id}`, { method: 'DELETE' });
}

/** PATCH /api/shared-album/:siteId/settings — 공개범위/다운로드 설정 */
export async function updateAlbumSettings(siteId, fields) {
  return apiFetch(`${albumBase(siteId)}/settings`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });
}

/** POST /api/shared-album/:siteId/share-link — 공유 링크 생성 */
export async function createShareLink(siteId) {
  return apiFetch(`${albumBase(siteId)}/share-link`, { method: 'POST' });
}

/** DELETE /api/shared-album/:siteId/share-link — 링크 무효화 */
export async function revokeShareLink(siteId) {
  return apiFetch(`${albumBase(siteId)}/share-link`, { method: 'DELETE' });
}

/** GET /api/shared-album/link/:token — 토큰으로 앨범 접근 */
export async function fetchAlbumByToken(token) {
  return apiFetch(`/api/shared-album/link/${token}`);
}

/** POST /api/shared-album/link/:token/photos — 비로그인 업로드 */
export async function uploadByToken(token, file, uploaderName) {
  const form = new FormData();
  form.append('photo', file);
  if (uploaderName) form.append('uploader_name', uploaderName);
  const res  = await fetch(`/api/shared-album/link/${token}/photos`, { method: 'POST', body: form, credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || '업로드 실패'), { code: json.code });
  return json;
}

/**
 * GET /api/persons/:siteId/search-site?q=이름
 * 인물 추가 시 기존 인물 검색 (이름 포함)
 */
export async function searchPersonsInSite(siteId, q) {
  if (!q || !q.trim()) return [];
  const d = await apiFetch(`/api/persons/${siteId}/search-site?q=${encodeURIComponent(q.trim())}`);
  return d.data ?? [];
}

/**
 * POST /api/persons/:siteId/link-person
 * 기존 인물과 관계 연결 (새 인물 생성 없이)
 */
export async function linkExistingPerson(siteId, existingPersonId, relationType, relativeId) {
  return apiFetch(`/api/persons/${siteId}/link-person`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      existing_person_id: existingPersonId,
      relation_type:      relationType,
      relative_id:        relativeId,
    }),
  });
}

/**
 * POST /api/persons/:siteId/:personId/divorce
 * 이혼 처리 (§30-2: spouse 관계 해제)
 */
export async function divorceSpouse(siteId, personId) {
  return apiFetch(`/api/persons/${siteId}/${personId}/divorce`, { method: 'POST' });
}

/**
 * POST /api/persons/:siteId/repair-relations
 * 관계 누락 인물 자동 복구 (보완 구조 §3)
 */
export async function repairRelations(siteId) {
  return apiFetch(`/api/persons/${siteId}/repair-relations`, { method: 'POST' });
}
