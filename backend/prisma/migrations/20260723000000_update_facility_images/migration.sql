-- Update facility imageUrl from relative paths to HTTP Unsplash URLs
-- This makes images work on both web and mobile

UPDATE "Facility"
SET "imageUrl" = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=450&fit=crop&q=80'
WHERE "registrationNumber" = 'UP-AGR-CS-2024-001';

UPDATE "Facility"
SET "imageUrl" = 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=450&fit=crop&q=80'
WHERE "registrationNumber" = 'MP-IDR-CS-2022-001';

UPDATE "Facility"
SET "imageUrl" = 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?w=800&h=450&fit=crop&q=80'
WHERE "registrationNumber" = 'MH-NSK-CS-2023-001';
