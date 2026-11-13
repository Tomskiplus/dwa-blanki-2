// =====================================================================
// Dane połączenia z bazą Supabase (gra przez internet).
// Oba są PUBLICZNE z założenia – bazę chronią zasady dostępu
// w supabase/schema.sql. Klucza "secret" / "service_role" NIGDY tu nie wpisujemy!
// =====================================================================

// adres naszego projektu w Supabase
const SUPABASE_URL = "https://oouifjojlqkmipiekgua.supabase.co";

// publiczny klucz – mówi Supabase, że to nasza gra się łączy
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DFdFdtrd95lJS7GjFcurYQ_NVeRx3is";

// Captcha Cloudflare Turnstile – PUBLICZNY "Site key" (sprawdza, czy nowy gracz to człowiek).
// Klucz "Secret" jest tylko w ustawieniach Supabase – NIGDY tutaj.
// Pusty napis "" = gra loguje bez captchy.
const TURNSTILE_SITE_KEY = "0x4AAAAAAF_sUmHfwY7Z1ppM";
