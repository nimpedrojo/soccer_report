const AREA_LABELS = {
  tecnica: 'Tecnica',
  tactica: 'Tactica',
  fisica: 'Fisica',
  psicologica: 'Psicologica',
  personalidad: 'Personalidad',
};

function getAreaLabel(areaKey) {
  return AREA_LABELS[areaKey] || areaKey;
}

module.exports = {
  AREA_LABELS,
  getAreaLabel,
};
