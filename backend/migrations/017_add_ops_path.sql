-- §19/§26: persons.ops_path 컬럼 추가
-- 파일 저장 경로: uploads/{subdomain}/{ops_path}/profile.jpg
-- 관장(curator): ops_path = NULL → uploads/{subdomain}/profile.jpg
-- 아버지: ops_path = 'f'  → uploads/{subdomain}/f/profile.jpg
-- 어머니: ops_path = 'm'  → uploads/{subdomain}/m/profile.jpg

ALTER TABLE persons ADD COLUMN IF NOT EXISTS ops_path VARCHAR(50);

-- 기존 persons: 관장의 parent1_id(아버지), parent2_id(어머니)를 기준으로 ops_path 설정
UPDATE persons p SET ops_path = 'f'
FROM persons curator
WHERE curator.match_status = 'linked'
  AND curator.site_id = p.site_id
  AND curator.parent1_id = p.id;

UPDATE persons p SET ops_path = 'm'
FROM persons curator
WHERE curator.match_status = 'linked'
  AND curator.site_id = p.site_id
  AND curator.parent2_id = p.id;

-- 기존 관장 photo_url: /uploads/persons/{id}/profile.jpg → /uploads/{subdomain}/profile.jpg
UPDATE persons p
SET photo_url = '/uploads/' || fs.subdomain || '/profile.jpg'
FROM family_sites fs
WHERE p.site_id = fs.id
  AND p.match_status = 'linked'
  AND p.photo_url IS NOT NULL
  AND p.photo_url <> '';
