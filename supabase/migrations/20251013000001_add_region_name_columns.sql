-- Adds region_name column to relevant tables to store state/region information for geolocation
aLter table if exists public."oreino360-visitas" 
  add column if not exists region_name text;

aLter table if exists public."oreino360-identificador" 
  add column if not exists region_name text;