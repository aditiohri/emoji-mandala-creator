// Which control sections are open. Pure helpers; main.js does the DOM and storage.
export const SECTION_IDS = ["palette", "shape", "background"];

// Desktop shows everything; a phone starts with just Shape open.
export function defaultSections(isPhone){
  return Object.fromEntries(SECTION_IDS.map(id => [id, isPhone ? id === "shape" : true]));
}

// Read a stored JSON string; anything unusable falls back to the defaults per section.
export function parseSections(raw, defaults){
  let saved = null;
  try { saved = JSON.parse(raw); } catch (e) {}
  const ok = saved && typeof saved === "object" && !Array.isArray(saved);
  return Object.fromEntries(SECTION_IDS.map(id =>
    [id, ok && typeof saved[id] === "boolean" ? saved[id] : defaults[id]]));
}

export function toggleSection(map, id){
  return { ...map, [id]: !map[id] };
}

export function setAll(open){
  return Object.fromEntries(SECTION_IDS.map(id => [id, open]));
}

// "Show all" / "Hide all" is one button: it hides when everything is open, else shows.
export function allOpen(map){
  return SECTION_IDS.every(id => map[id]);
}
