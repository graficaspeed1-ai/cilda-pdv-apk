// Configuração pública do Supabase para o PDV CILDA BIJU.
// A publishable key pode estar no frontend; a segurança depende das políticas RLS.
window.PDV_CONFIG = {
  url: 'https://cxawkwfrvdvrnxpofadr.supabase.co',
  key: 'sb_publishable_WPXzMqXQ08r3pH3ttfeBHA_m1WvCGvT',
  // Plano B para redes/operadoras onde *.supabase.co não resolve ("servidor não encontrado").
  // Cole aqui o endereço do proxy (veja proxy/README.md), ex.: 'https://pdv-proxy.SEU-USUARIO.workers.dev'
  // O app tenta o endereço direto e, se falhar, troca sozinho para o proxy.
  proxies: []
};
