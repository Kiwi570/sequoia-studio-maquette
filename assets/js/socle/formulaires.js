/* Formulaires simulés [data-formulaire] : rien n'est envoyé, et le message le dit.
   - Choix déjà fait selon le bouton d'où l'on vient : paramètre dans l'adresse (?sujet=visite).
   - Vérification des champs, erreurs à côté du champ, lues par les lecteurs d'écran.
   - Bouton désactivé après le premier envoi (pas de double envoi). */
import { etat } from './etat.js?v=1';

const textes = {
  fr: { requis: 'Ce champ est à remplir.', email: 'Adresse e-mail à vérifier (exemple : nom@domaine.fr).', tel: 'Numéro à vérifier (10 chiffres).', envoye: 'Demande simulée : rien n’a été envoyé. Sur le site final, elle partira vers le client.' },
  en: { requis: 'Please fill in this field.', email: 'Please check this e-mail address (e.g. name@domain.com).', tel: 'Please check this phone number.', envoye: 'Simulated request: nothing has been sent. On the final site, it will reach the client.' },
};

function erreur(champ, message) {
  const id = 'erreur-' + (champ.id || champ.name);
  let p = document.getElementById(id);
  if (!message) { if (p) p.textContent = ''; champ.removeAttribute('aria-invalid'); return; }
  if (!p) {
    p = document.createElement('p');
    p.id = id; p.className = 'champ-erreur'; p.setAttribute('aria-live', 'polite');
    (champ.closest('.champ') || champ.parentElement).appendChild(p);
    champ.setAttribute('aria-describedby', [champ.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  }
  p.textContent = message;
  champ.setAttribute('aria-invalid', 'true');
}

function verifier(champ, t) {
  const v = (champ.value || '').trim();
  if (champ.required && (champ.type === 'checkbox' ? !champ.checked : !v)) return t.requis;
  if (v && champ.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return t.email;
  if (v && champ.type === 'tel' && v.replace(/[^\d]/g, '').length < 9) return t.tel;
  return '';
}

export function initFormulaires() {
  const t = textes[etat.langue] || textes.fr;
  const params = new URLSearchParams(location.search);
  document.querySelectorAll('[data-formulaire]').forEach((f) => {
    f.noValidate = true;
    params.forEach((valeur, nom) => {
      f.querySelectorAll(`[name="${CSS.escape(nom)}"]`).forEach((c) => {
        if (c.type === 'radio' || c.type === 'checkbox') c.checked = c.value === valeur;
        else c.value = valeur;
      });
    });
    f.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid')) erreur(e.target, verifier(e.target, t)); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const champs = [...f.querySelectorAll('input, select, textarea')].filter((c) => c.name);
      let premier = null;
      champs.forEach((c) => { const m = verifier(c, t); erreur(c, m); if (m && !premier) premier = c; });
      if (premier) { premier.focus(); return; }
      const envoi = f.querySelector('[type="submit"]');
      if (envoi) { envoi.disabled = true; envoi.setAttribute('aria-disabled', 'true'); }
      const msg = f.querySelector('[data-message-envoi]');
      if (msg) { msg.textContent = msg.dataset.texte || t.envoye; msg.hidden = false; msg.focus && msg.focus(); }
    });
  });
}
