const collections = [
  ['eupdate', 'eUpdate', [
    ['schwarzgold', 'Schwarzgold', '#171b20', '#cc9419', '#ffe18a', 'bands', { angle: -12, width: .14, scale: 1.4 }],
    ['goldsplitter', 'Goldsplitter', '#292521', '#a26517', '#ffd061', 'chips', { scale: 1.2 }],
    ['gelbes-raster', 'Gelbes Raster', '#282721', '#debc37', '#fff4ad', 'grid', { scale: .82 }],
    ['schachgold', 'Schachgold', '#272420', '#80591b', '#e8b648', 'checks', { angle: 12, scale: 1.51 }],
    ['asphaltgelb', 'Asphaltgelb', '#323638', '#e1ad25', '#e9d8a6', 'flecks', { scale: .72 }],
  ]],
  ['metall', 'Metall', [
    ['kupferkante', 'Kupferkante', '#343537', '#af673e', '#ffbc82', 'edges', { scale: 1.1 }],
    ['buerststahl', 'Bürststahl', '#666f77', '#a8b9c6', '#e6eff2', 'brush', { angle: 0, scale: .58 }],
    ['dunkle-bronze', 'Dunkle Bronze', '#46352d', '#80623e', '#badbb0', 'patina', { scale: .65 }],
    ['anlaufblau', 'Anlaufblau', '#283448', '#315d87', '#cb96b5', 'iridescent', { angle: -13, scale: .91 }],
    ['rose-aluminium', 'Rosé-Aluminium', '#79565d', '#be8394', '#f5dace', 'machined', { angle: 7, scale: .84 }],
  ]],
  ['frost', 'Frost', [
    ['frostlinien', 'Frostlinien', '#507889', '#85bad1', '#e8ffff', 'facets', { angle: 16, scale: 1.08 }],
    ['schneestaub', 'Schneestaub', '#8296a1', '#d8f0f6', '#f9fffc', 'flecks', { scale: .48 }],
    ['eiswellen', 'Eiswellen', '#365b72', '#638eaa', '#bae9ed', 'waves', { count: 7, scale: 1.27 }],
    ['polarlicht', 'Polarlicht', '#253849', '#63c899', '#9aa8ef', 'aurora', { angle: -26, scale: 1.15 }],
    ['gletscherbruch', 'Gletscherbruch', '#9dbcca', '#d1ecf5', '#3194a6', 'cracks', { scale: 1.46 }],
  ]],
  ['glut', 'Glut', [
    ['glutadern', 'Glutadern', '#362528', '#a8463a', '#ffae65', 'cracks', { scale: .76 }],
    ['orange-kontur', 'Orange Kontur', '#382d2b', '#f78439', '#ffcf6d', 'contours', { angle: -12, scale: 1.08 }],
    ['sonnenringe', 'Sonnenringe', '#6d342a', '#dd7249', '#ffcb75', 'rings', { count: 4, scale: 1.4 }],
    ['korallenwelle', 'Korallenwelle', '#694552', '#e27a83', '#ffc3a9', 'waves', { count: 4, scale: 1.92 }],
    ['terrakotta', 'Terrakotta', '#80503f', '#b47754', '#edc69e', 'patina', { scale: 1.48 }],
  ]],
  ['neon', 'Neon', [
    ['nachtraster', 'Nachtraster', '#382852', '#38ccb7', '#c99bf5', 'grid', { angle: -14, scale: 1.24 }],
    ['jadepuls', 'Jadepuls', '#203637', '#50c995', '#ccfca2', 'circuits', { angle: 3, scale: 1.12 }],
    ['pinkfrequenz', 'Pinkfrequenz', '#4f3059', '#e36fae', '#ffd2e6', 'waves', { count: 11, scale: .63 }],
    ['uv-kacheln', 'UV-Kacheln', '#3a345a', '#8976cb', '#f09eda', 'blocks', { angle: 22, scale: .91 }],
    ['cyanfaeden', 'Cyanfäden', '#1d3d49', '#3faec7', '#bffbfa', 'brush', { angle: -31, scale: 1.24 }],
  ]],
  ['geometrie', 'Geometrie', [
    ['waben', 'Waben', '#34434a', '#7c9ba1', '#d4e6d9', 'hexagons', { scale: 1.12 }],
    ['schraegflaechen', 'Schrägflächen', '#41516c', '#809699', '#d9b9a2', 'bands', { angle: -36, width: .67, scale: 1.98 }],
    ['faltlinien', 'Faltlinien', '#474658', '#a280a8', '#dcd6bf', 'facets', { angle: -24, scale: 1.70 }],
    ['versatz', 'Versatz', '#3c535b', '#70aca9', '#e9bf7c', 'blocks', { angle: 0, scale: 1.52 }],
    ['rautenfeld', 'Rautenfeld', '#414a55', '#8194a5', '#e3d7ab', 'checks', { angle: 45, scale: 1.02 }],
  ]],
  ['retro', 'Retro', [
    ['pixelmeer', 'Pixelmeer', '#345268', '#4ca5b3', '#badacd', 'blocks', { angle: 0, scale: .55 }],
    ['kassettenstreifen', 'Kassettenstreifen', '#2c333c', '#dc8660', '#edcc8c', 'bands', { angle: 0, width: .27, scale: 2.9 }],
    ['punktmatrix', 'Punktmatrix', '#4a495c', '#bba7c6', '#f5dec0', 'dots', { scale: 1.25 }],
    ['farbbloecke-84', 'Farbblöcke 84', '#4d5668', '#c68b9d', '#ecbb7b', 'panels', { angle: -15, scale: 1.73 }],
    ['rasterdruck', 'Rasterdruck', '#405264', '#b87e79', '#efdbc6', 'scan', { scale: .61 }],
  ]],
  ['natur', 'Natur', [
    ['moosstein', 'Moosstein', '#404c3d', '#80936b', '#c8c1a4', 'patina', { scale: 1.83 }],
    ['sandrippel', 'Sandrippel', '#8f7857', '#bfa277', '#f1d6ac', 'waves', { count: 10, scale: 2.25 }],
    ['tiefsee', 'Tiefsee', '#214251', '#317b91', '#9fd7c4', 'contours', { angle: 37, scale: 1.54 }],
    ['birkenrinde', 'Birkenrinde', '#9da59f', '#e4e9d7', '#55545a', 'bark', { angle: 0, scale: .72 }],
    ['schieferbruch', 'Schieferbruch', '#404954', '#6d8492', '#bac2bd', 'chips', { scale: 1.84 }],
  ]],
  ['weltraum', 'Weltraum', [
    ['sternfeld', 'Sternfeld', '#2b3a5c', '#7083b5', '#fce9d0', 'stars', { scale: .84 }],
    ['mondkrater', 'Mondkrater', '#727686', '#9ea5b2', '#e1e6dd', 'craters', { scale: 1.14 }],
    ['orbit', 'Orbit', '#2c354e', '#8f82ba', '#e8cb9c', 'rings', { count: 7, scale: 2.2 }],
    ['dunkler-nebel', 'Dunkler Nebel', '#2c294a', '#8b4488', '#7fafd2', 'aurora', { angle: 45, scale: 2.11 }],
    ['kometenschweif', 'Kometenschweif', '#413851', '#bf8499', '#f5d7ad', 'comets', { angle: -26, scale: 1.17 }],
  ]],
  ['kunst', 'Kunst', [
    ['tintenwirbel', 'Tintenwirbel', '#33425c', '#7253a7', '#d9cadb', 'swirls', { scale: 1.29 }],
    ['terrazzo', 'Terrazzo', '#737271', '#d58f81', '#e6d7b8', 'chips', { scale: .81 }],
    ['kreidestrich', 'Kreidestrich', '#515563', '#a1aca3', '#f4ece4', 'hatch', { angle: 56, scale: .57 }],
    ['pinselwelle', 'Pinselwelle', '#514b65', '#9c6b91', '#e9ba90', 'brushstrokes', { angle: -13, scale: 1.82 }],
    ['risslack', 'Risslack', '#535865', '#99a2a1', '#e4cca1', 'cracks', { scale: 2.24 }],
  ]],
];

export const SKIN_GROUPS = collections.map(([id, name, rows]) => ({
  id,
  name,
  skins: rows.map(([id, name, base, color, highlight, pattern, options]) => ({
    id, name, base, color, highlight, pattern, ...options,
  })),
}));

const byId = new Map(SKIN_GROUPS.flatMap(({ skins }) => skins.map(skin => [skin.id, skin])));

export function skinDefinition(id) {
  return byId.get(id);
}

export function weaponSkin(loadout, slot) {
  return skinDefinition(loadout?.weaponSkins?.[slot])?.id || '';
}
