/**
 * ARANA CLINIC — Supabase Client (ท่อเชื่อมต่อกลาง)
 * ทุกไฟล์ที่ต้องคุยกับฐานข้อมูลกลาง ให้เรียกใช้ตัวแปร `sb` จากไฟล์นี้
 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
