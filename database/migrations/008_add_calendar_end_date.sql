-- Migration 008: Add end_date for multi-day events (trip, event)
-- and event_type_detail for custom type info

ALTER TABLE family_calendar
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

-- Add 'trip' to supported event types
-- (event_type is a VARCHAR, no constraint to alter)
