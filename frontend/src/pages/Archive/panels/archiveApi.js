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
