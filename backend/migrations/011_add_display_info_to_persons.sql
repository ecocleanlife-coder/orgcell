-- Add display information fields for Family Tree museum blocks
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS display_info1 VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_info2 VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_info3 VARCHAR(50);
