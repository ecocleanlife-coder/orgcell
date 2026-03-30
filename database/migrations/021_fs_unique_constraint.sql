-- 021: FamilySearch person_id unique constraint per site
-- ON CONFLICT (site_id, fs_person_id) 사용을 위한 유니크 인덱스

CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_site_fs_person
    ON persons (site_id, fs_person_id)
    WHERE fs_person_id IS NOT NULL;

-- Rollback:
-- DROP INDEX IF EXISTS idx_persons_site_fs_person;
