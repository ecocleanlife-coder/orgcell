-- 010: person_relations 테이블 (복잡한 가족 관계 지원)
-- 기존 persons.parent1_id/parent2_id/spouse_id 외에
-- 재혼, 입양, 의붓 등 다양한 관계를 유연하게 지원

CREATE TABLE IF NOT EXISTS person_relations (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person1_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person2_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  relation_type VARCHAR(30) NOT NULL,
  -- relation_type values:
  --   parent, spouse, ex_spouse, adopted, step_parent, sibling, half_sibling
  label VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_person_relation UNIQUE (site_id, person1_id, person2_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_person_relations_site ON person_relations(site_id);
CREATE INDEX IF NOT EXISTS idx_person_relations_p1 ON person_relations(person1_id);
CREATE INDEX IF NOT EXISTS idx_person_relations_p2 ON person_relations(person2_id);
