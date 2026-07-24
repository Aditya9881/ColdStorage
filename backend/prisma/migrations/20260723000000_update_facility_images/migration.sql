-- Update facility image_url from relative paths to HTTP Unsplash URLs
-- This makes images work on both web and mobile

UPDATE facilities
SET image_url = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800'
WHERE registration_number = 'UP-AGR-CS-2024-001' AND (image_url IS NULL OR image_url NOT LIKE 'https://%');

UPDATE facilities
SET image_url = 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800'
WHERE registration_number = 'MP-IDR-CS-2022-001' AND (image_url IS NULL OR image_url NOT LIKE 'https://%');

UPDATE facilities
SET image_url = 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800'
WHERE registration_number = 'MH-NSK-CS-2023-001' AND (image_url IS NULL OR image_url NOT LIKE 'https://%');
