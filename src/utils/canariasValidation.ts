export const CANARY_ISLANDS = [
  "Tenerife",
  "Gran Canaria",
  "Lanzarote",
  "Fuerteventura",
  "La Palma",
  "La Gomera",
  "El Hierro",
  "La Graciosa",
] as const;

export type CanaryIsland = typeof CANARY_ISLANDS[number];

/** Valida si el código postal pertenece a Las Palmas (35) o Sta. Cruz de Tenerife (38) */
export function isValidCanaryZip(cp: string): boolean {
  return /^(35|38)\d{3}$/.test(cp.trim());
}

/** Calcula si la persona es menor de 16 años a partir de su fecha de nacimiento */
export function isUnder16(birthDateStr: string): boolean {
  if (!birthDateStr) return true;
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age < 16;
}