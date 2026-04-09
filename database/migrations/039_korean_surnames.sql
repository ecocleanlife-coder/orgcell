-- 039: 한국 성씨 본관 DB (Subdomain 자동배정용)
-- §26-1-1: 성씨영문 + 본관번호 + 순번 → LEE006-1 형식

CREATE TABLE IF NOT EXISTS korean_surnames (
  id              SERIAL PRIMARY KEY,
  surname_ko      VARCHAR(10)  NOT NULL,
  surname_en      VARCHAR(20)  NOT NULL,
  bon_gwan_ko     VARCHAR(30),           -- NULL = 본관 미확정 placeholder
  bon_gwan_en     VARCHAR(50),
  population_rank INTEGER,
  code            VARCHAR(3),            -- '001'~'999', NULL = 미확정 row
  seq_counter     INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- bon_gwan 확정 row: (surname_en, code) 유일
CREATE UNIQUE INDEX IF NOT EXISTS idx_ks_code
  ON korean_surnames(surname_en, code) WHERE code IS NOT NULL;

-- 미확정 row: surname_en 당 1개
CREATE UNIQUE INDEX IF NOT EXISTS idx_ks_no_bon_gwan
  ON korean_surnames(surname_en) WHERE code IS NULL;

CREATE INDEX IF NOT EXISTS idx_ks_lookup
  ON korean_surnames(surname_ko, bon_gwan_ko);

-- ─────────────────────────────────────────
-- 시드: 한국 주요 성씨 본관 (인구 기준 상위)
-- ─────────────────────────────────────────
-- 미확정 placeholder row (bon_gwan 없을 때 사용)
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('김','KIM', NULL, NULL, 1,  NULL),
('이','LEE', NULL, NULL, 2,  NULL),
('박','PARK',NULL, NULL, 3,  NULL),
('최','CHOI',NULL, NULL, 4,  NULL),
('정','JUNG',NULL, NULL, 5,  NULL),
('강','KANG',NULL, NULL, 6,  NULL),
('조','CHO', NULL, NULL, 7,  NULL),
('윤','YOON',NULL, NULL, 8,  NULL),
('장','JANG',NULL, NULL, 9,  NULL),
('임','LIM', NULL, NULL, 10, NULL),
('한','HAN', NULL, NULL, 11, NULL),
('오','OH',  NULL, NULL, 12, NULL),
('서','SEO', NULL, NULL, 13, NULL),
('신','SHIN',NULL, NULL, 14, NULL),
('권','KWON',NULL, NULL, 15, NULL),
('황','HWANG',NULL,NULL, 16, NULL),
('안','AHN', NULL, NULL, 17, NULL),
('송','SONG',NULL, NULL, 18, NULL),
('류','RYU', NULL, NULL, 19, NULL),
('홍','HONG',NULL, NULL, 20, NULL),
('전','JEON',NULL, NULL, 21, NULL),
('고','KO',  NULL, NULL, 22, NULL),
('문','MOON',NULL, NULL, 23, NULL),
('양','YANG',NULL, NULL, 24, NULL),
('손','SON', NULL, NULL, 25, NULL),
('배','BAE', NULL, NULL, 26, NULL),
('백','BAEK',NULL, NULL, 27, NULL),
('허','HEO', NULL, NULL, 28, NULL),
('유','YOO', NULL, NULL, 29, NULL),
('남','NAM', NULL, NULL, 30, NULL),
('심','SHIM',NULL, NULL, 31, NULL),
('노','RO',  NULL, NULL, 32, NULL),
('하','HA',  NULL, NULL, 33, NULL),
('곽','KWAK',NULL, NULL, 34, NULL),
('성','SUNG',NULL, NULL, 35, NULL),
('차','CHA', NULL, NULL, 36, NULL),
('주','JU',  NULL, NULL, 37, NULL),
('우','WOO', NULL, NULL, 38, NULL),
('구','KOO', NULL, NULL, 39, NULL),
('민','MIN', NULL, NULL, 40, NULL)
ON CONFLICT DO NOTHING;

-- 김(KIM) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('김','KIM','김해','Gimhae',  1,'001'),
('김','KIM','경주','Gyeongju',2,'002'),
('김','KIM','광산','Gwangsan',3,'003'),
('김','KIM','안동','Andong',  4,'004'),
('김','KIM','전주','Jeonju',  5,'005'),
('김','KIM','밀양','Miryang',  6,'006'),
('김','KIM','청풍','Cheongpung',7,'007'),
('김','KIM','의성','Uiseong', 8,'008'),
('김','KIM','강릉','Gangneung',9,'009'),
('김','KIM','삼척','Samcheok',10,'010')
ON CONFLICT DO NOTHING;

-- 이(LEE) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('이','LEE','전주','Jeonju',  1,'001'),
('이','LEE','경주','Gyeongju',2,'002'),
('이','LEE','광주','Gwangju', 3,'003'),
('이','LEE','한산','Hansan',  4,'004'),
('이','LEE','연안','Yeonan',  5,'005'),
('이','LEE','덕수','Deoksu',  6,'006'),
('이','LEE','성주','Seongju', 7,'007'),
('이','LEE','여주','Yeoju',   8,'008'),
('이','LEE','공주','Gongju',  9,'009'),
('이','LEE','우봉','Ubong',  10,'010'),
('이','LEE','재령','Jaeryeong',11,'011'),
('이','LEE','아산','Asan',   12,'012'),
('이','LEE','벽진','Byeokjin',13,'013'),
('이','LEE','청안','Cheongan',14,'014'),
('이','LEE','영천','Yeongcheon',15,'015')
ON CONFLICT DO NOTHING;

-- 박(PARK) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('박','PARK','밀양','Miryang', 1,'001'),
('박','PARK','반남','Bannam',  2,'002'),
('박','PARK','함양','Hamyang', 3,'003'),
('박','PARK','고령','Goryeong',4,'004'),
('박','PARK','죽산','Juksan',  5,'005'),
('박','PARK','순천','Suncheon',6,'006'),
('박','PARK','충주','Chungju', 7,'007')
ON CONFLICT DO NOTHING;

-- 최(CHOI) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('최','CHOI','전주','Jeonju',  1,'001'),
('최','CHOI','경주','Gyeongju',2,'002'),
('최','CHOI','해주','Haeju',   3,'003'),
('최','CHOI','강릉','Gangneung',4,'004'),
('최','CHOI','화순','Hwasun',  5,'005'),
('최','CHOI','탐진','Tamjin',  6,'006')
ON CONFLICT DO NOTHING;

-- 정(JUNG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('정','JUNG','동래','Dongnae', 1,'001'),
('정','JUNG','경주','Gyeongju',2,'002'),
('정','JUNG','진양','Jinyang', 3,'003'),
('정','JUNG','하동','Hadong',  4,'004'),
('정','JUNG','온양','Onyang',  5,'005'),
('정','JUNG','청주','Cheongju',6,'006'),
('정','JUNG','나주','Naju',    7,'007')
ON CONFLICT DO NOTHING;

-- 강(KANG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('강','KANG','진주','Jinju',   1,'001'),
('강','KANG','수원','Suwon',   2,'002'),
('강','KANG','신천','Sincheon',3,'003'),
('강','KANG','금천','Geumcheon',4,'004')
ON CONFLICT DO NOTHING;

-- 조(CHO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('조','CHO','한양','Hanyang',  1,'001'),
('조','CHO','풍양','Pungyang', 2,'002'),
('조','CHO','창녕','Changnyeong',3,'003'),
('조','CHO','함안','Haman',    4,'004'),
('조','CHO','옥천','Okcheon',  5,'005')
ON CONFLICT DO NOTHING;

-- 윤(YOON) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('윤','YOON','파평','Papyeong', 1,'001'),
('윤','YOON','해평','Haepyeong',2,'002'),
('윤','YOON','칠원','Chirwon',  3,'003'),
('윤','YOON','남원','Namwon',   4,'004')
ON CONFLICT DO NOTHING;

-- 장(JANG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('장','JANG','인동','Indong',  1,'001'),
('장','JANG','덕수','Deoksu',  2,'002'),
('장','JANG','안동','Andong',  3,'003'),
('장','JANG','흥성','Heungseong',4,'004')
ON CONFLICT DO NOTHING;

-- 임(LIM) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('임','LIM','평택','Pyeongtaek',1,'001'),
('임','LIM','나주','Naju',     2,'002'),
('임','LIM','풍천','Pungcheon',3,'003'),
('임','LIM','진천','Jincheon', 4,'004')
ON CONFLICT DO NOTHING;

-- 한(HAN) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('한','HAN','청주','Cheongju',1,'001'),
('한','HAN','곡산','Goksan', 2,'002')
ON CONFLICT DO NOTHING;

-- 오(OH) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('오','OH','해주','Haeju',   1,'001'),
('오','OH','동복','Dongbok', 2,'002'),
('오','OH','보성','Boseong', 3,'003')
ON CONFLICT DO NOTHING;

-- 서(SEO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('서','SEO','달성','Dalseong',1,'001'),
('서','SEO','이천','Icheon',  2,'002'),
('서','SEO','부여','Buyeo',   3,'003')
ON CONFLICT DO NOTHING;

-- 신(SHIN) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('신','SHIN','평산','Pyeongsan',1,'001'),
('신','SHIN','고령','Goryeong', 2,'002'),
('신','SHIN','아주','Aju',      3,'003'),
('신','SHIN','영산','Yeongsan', 4,'004')
ON CONFLICT DO NOTHING;

-- 권(KWON) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('권','KWON','안동','Andong', 1,'001'),
('권','KWON','예천','Yecheon',2,'002')
ON CONFLICT DO NOTHING;

-- 황(HWANG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('황','HWANG','장수','Jangsu',    1,'001'),
('황','HWANG','평해','Pyeonghae', 2,'002'),
('황','HWANG','창원','Changwon',  3,'003'),
('황','HWANG','상주','Sangju',    4,'004')
ON CONFLICT DO NOTHING;

-- 안(AHN) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('안','AHN','순흥','Sunheung',1,'001'),
('안','AHN','광주','Gwangju', 2,'002'),
('안','AHN','죽산','Juksan',  3,'003')
ON CONFLICT DO NOTHING;

-- 송(SONG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('송','SONG','여산','Yeosan',  1,'001'),
('송','SONG','은진','Eunjin',  2,'002'),
('송','SONG','진천','Jincheon',3,'003')
ON CONFLICT DO NOTHING;

-- 류(RYU) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('류','RYU','문화','Munhwa',  1,'001'),
('류','RYU','풍산','Pungsan', 2,'002'),
('류','RYU','진주','Jinju',   3,'003')
ON CONFLICT DO NOTHING;

-- 홍(HONG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('홍','HONG','남양','Namyang', 1,'001'),
('홍','HONG','풍산','Pungsan', 2,'002'),
('홍','HONG','부계','Bugye',   3,'003')
ON CONFLICT DO NOTHING;

-- 전(JEON) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('전','JEON','천안','Cheonan',   1,'001'),
('전','JEON','정선','Jeongseon', 2,'002')
ON CONFLICT DO NOTHING;

-- 고(KO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('고','KO','제주','Jeju',    1,'001'),
('고','KO','장흥','Jangheung',2,'002')
ON CONFLICT DO NOTHING;

-- 문(MOON) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('문','MOON','남평','Nampyeong',1,'001'),
('문','MOON','감천','Gamcheon', 2,'002')
ON CONFLICT DO NOTHING;

-- 양(YANG) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('양','YANG','남원','Namwon',  1,'001'),
('양','YANG','제주','Jeju',    2,'002'),
('양','YANG','청주','Cheongju',3,'003')
ON CONFLICT DO NOTHING;

-- 손(SON) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('손','SON','밀양','Miryang', 1,'001'),
('손','SON','경주','Gyeongju',2,'002'),
('손','SON','일직','Iljik',   3,'003')
ON CONFLICT DO NOTHING;

-- 배(BAE) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('배','BAE','흥해','Heunghae',1,'001'),
('배','BAE','성산','Seongsan',2,'002')
ON CONFLICT DO NOTHING;

-- 백(BAEK) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('백','BAEK','수원','Suwon',1,'001'),
('백','BAEK','해미','Haemi',2,'002')
ON CONFLICT DO NOTHING;

-- 허(HEO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('허','HEO','김해','Gimhae',  1,'001'),
('허','HEO','양천','Yangcheon',2,'002')
ON CONFLICT DO NOTHING;

-- 유(YOO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('유','YOO','기계','Gigye',   1,'001'),
('유','YOO','강릉','Gangneung',2,'002'),
('유','YOO','진주','Jinju',   3,'003')
ON CONFLICT DO NOTHING;

-- 남(NAM) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('남','NAM','의령','Uiryeong',1,'001'),
('남','NAM','영양','Yeongyang',2,'002')
ON CONFLICT DO NOTHING;

-- 심(SHIM) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('심','SHIM','청송','Cheongsong',1,'001'),
('심','SHIM','풍산','Pungsan',   2,'002')
ON CONFLICT DO NOTHING;

-- 노(RO) 본관
INSERT INTO korean_surnames (surname_ko, surname_en, bon_gwan_ko, bon_gwan_en, population_rank, code) VALUES
('노','RO','광주','Gwangju',  1,'001'),
('노','RO','풍천','Pungcheon',2,'002')
ON CONFLICT DO NOTHING;

-- Rollback:
-- DROP TABLE IF EXISTS korean_surnames;
