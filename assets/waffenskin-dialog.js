import { closeModal, el, head, html, modal } from './app.js';
import { art } from './katalog.js';
import { weaponNames } from './katalog-abgleich.js';
import { SKIN_GROUPS, skinDefinition } from './waffenskin-katalog.js';
import { renderWeaponSkins } from './waffenskin-renderer.js';

export function chooseWeaponSkin(weapon, selected, apply) {
  let choice = selected;
  const activeGroup = SKIN_GROUPS.find(group => group.skins.some(skin => skin.id === choice));
  modal(
    head('Skin wählen', weaponNames(weapon).de) +
      '<div class="skin-preview weapon-stage" id="skinPreviewArt"></div>' +
      '<div class="skin-gallery-toolbar"><label>Kategorie <select id="weaponSkinGroup">' +
      SKIN_GROUPS.map(group =>
        '<option value="' + group.id + '"' + (group === activeGroup ? ' selected' : '') + '>' +
        html(group.name) + '</option>',
      ).join('') + '</select></label><strong id="skinPreviewName" aria-live="polite"></strong></div>' +
      '<div id="weaponSkinOptions" class="skin-gallery" role="group" aria-label="Skins dieser Kategorie"></div>' +
      '<div class="dialog-actions skin-dialog-actions"><button id="applyWeaponSkin" type="button" class="primary-btn">Skin übernehmen</button></div>',
    'skin',
  );
  const category = el('weaponSkinGroup');
  const options = el('weaponSkinOptions');
  const preview = el('skinPreviewArt');
  const applyButton = el('applyWeaponSkin');
  el('modalBody').append(applyButton.parentElement);

  function previewChoice() {
    el('skinPreviewName').textContent = skinDefinition(choice)?.name || 'Grunddesign';
    preview.innerHTML = art(weapon, choice);
    renderWeaponSkins(preview);
    for (const button of options.querySelectorAll('[data-skin-option]')) {
      button.setAttribute('aria-pressed', String(button.dataset.skinOption === choice));
    }
  }

  function drawOptions() {
    const group = SKIN_GROUPS.find(group => group.id === category.value) || SKIN_GROUPS[0];
    const skins = [{ id: '', name: 'Grunddesign' }, ...group.skins];
    options.innerHTML = skins.map(skin =>
      '<button type="button" class="skin-option" data-skin-option="' + skin.id + '" aria-label="' + html(skin.name) +
      '" aria-pressed="' + (skin.id === choice) + '"><span class="skin-option-art weapon-stage">' +
      art(weapon, skin.id) + '</span><span>' + html(skin.name) + '</span></button>',
    ).join('');
    renderWeaponSkins(options);
  }

  options.addEventListener('click', event => {
    const button = event.target.closest('[data-skin-option]');
    if (!button || button.dataset.skinOption === choice) return;
    choice = button.dataset.skinOption;
    previewChoice();
  });
  category.addEventListener('change', drawOptions);
  applyButton.addEventListener('click', () => {
    closeModal();
    apply(choice);
  });
  drawOptions();
  previewChoice();
}
