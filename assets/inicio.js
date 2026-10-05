// Página inicial (index.html): apresentação e cartão de login.
import { progresso } from './progresso.js';
import { montarTopo } from './topo.js';
import { el, svg, ICONES, botaoGoogle } from './dom.js';

montarTopo(progresso, { ativo: 'inicio' });
const cartao = document.getElementById('login-card');

function pintar() {
  if (!progresso.nuvemDisponivel()) { cartao.hidden = true; return; }
  cartao.hidden = false;
  const u = progresso.usuario();
  if (!u) {
    cartao.replaceChildren(botaoGoogle(() => progresso.entrar(), { contornado: true }),
      el('p', { class: 'landing-login-hint' }, 'Entrar salva o seu progresso automaticamente e permite continuar de qualquer computador.'));
    return;
  }
  cartao.replaceChildren(el('div', { class: 'landing-logado' },
    el('span', { class: 'check-verde' }, svg(ICONES.check)),
    el('p', {}, 'Conectado como ', el('strong', {}, u.nome), '. Seu progresso está sendo salvo.')));
}
progresso.aoMudar(pintar);
pintar();
