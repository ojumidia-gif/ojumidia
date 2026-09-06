export function normalizeConfirmPhrase(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function confirmPhrasesMatch(expected: string, typed: string) {
  const left = normalizeConfirmPhrase(expected);
  const right = normalizeConfirmPhrase(typed);
  return Boolean(left) && left === right;
}
