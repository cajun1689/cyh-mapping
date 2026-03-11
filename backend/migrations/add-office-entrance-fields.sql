-- Add office entrance image and internal directions for multi-office buildings
-- Youth requested: photo of internal office entrance + directions once inside the building

ALTER TABLE listings ADD COLUMN IF NOT EXISTS office_entrance_image_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS internal_directions TEXT;

COMMENT ON COLUMN listings.office_entrance_image_url IS 'Photo of the office entrance from inside the building (for multi-office buildings)';
COMMENT ON COLUMN listings.internal_directions IS 'Directions once inside the building (e.g., Take elevator to 2nd floor, turn left, third door on right)';
