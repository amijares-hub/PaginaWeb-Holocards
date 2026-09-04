export interface CanaryLocation {
  municipality: string;
  island: string;
}

const CANARY_CP_MAP: Record<string, CanaryLocation> = {
  // --- GRAN CANARIA (35000 - 35499) ---
  '35001': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35002': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35003': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35004': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35005': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35006': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35007': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35008': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35009': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35010': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35011': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35012': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35013': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35014': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35015': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35016': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35017': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35018': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35019': { municipality: 'Las Palmas de Gran Canaria', island: 'Gran Canaria' },
  '35100': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35108': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35109': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35110': { municipality: 'Santa Lucía de Tirajana', island: 'Gran Canaria' },
  '35118': { municipality: 'Santa Lucía de Tirajana', island: 'Gran Canaria' },
  '35120': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35130': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35138': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35140': { municipality: 'Mogán', island: 'Gran Canaria' },
  '35200': { municipality: 'Telde', island: 'Gran Canaria' },
  '35210': { municipality: 'Telde', island: 'Gran Canaria' },
  '35211': { municipality: 'Telde', island: 'Gran Canaria' },
  '35212': { municipality: 'Telde', island: 'Gran Canaria' },
  '35213': { municipality: 'Telde', island: 'Gran Canaria' },
  '35214': { municipality: 'Telde', island: 'Gran Canaria' },
  '35215': { municipality: 'Telde', island: 'Gran Canaria' },
  '35218': { municipality: 'Telde', island: 'Gran Canaria' },
  '35220': { municipality: 'Telde', island: 'Gran Canaria' },
  '35230': { municipality: 'Valsequillo de Gran Canaria', island: 'Gran Canaria' },
  '35240': { municipality: 'Ingenio', island: 'Gran Canaria' },
  '35250': { municipality: 'Ingenio', island: 'Gran Canaria' },
  '35260': { municipality: 'Agüimes', island: 'Gran Canaria' },
  '35270': { municipality: 'Telde', island: 'Gran Canaria' },
  '35280': { municipality: 'Santa Brígida', island: 'Gran Canaria' },
  '35290': { municipality: 'San Bartolomé de Tirajana', island: 'Gran Canaria' },
  '35300': { municipality: 'Santa Brígida', island: 'Gran Canaria' },
  '35310': { municipality: 'Vega de San Mateo', island: 'Gran Canaria' },
  '35320': { municipality: 'Vega de San Mateo', island: 'Gran Canaria' },
  '35330': { municipality: 'Teror', island: 'Gran Canaria' },
  '35340': { municipality: 'Valleseco', island: 'Gran Canaria' },
  '35350': { municipality: 'Artenara', island: 'Gran Canaria' },
  '35360': { municipality: 'Tejeda', island: 'Gran Canaria' },
  '35400': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35411': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35412': { municipality: 'Arucas', island: 'Gran Canaria' },
  '35413': { municipality: 'Firgas', island: 'Gran Canaria' },
  '35420': { municipality: 'Moya', island: 'Gran Canaria' },
  '35430': { municipality: 'Firgas', island: 'Gran Canaria' },
  '35440': { municipality: 'Moya', island: 'Gran Canaria' },
  '35450': { municipality: 'Santa María de Guía', island: 'Gran Canaria' },
  '35460': { municipality: 'Gáldar', island: 'Gran Canaria' },
  '35470': { municipality: 'La Aldea de San Nicolás', island: 'Gran Canaria' },
  '35480': { municipality: 'Agaete', island: 'Gran Canaria' },

  // --- LANZAROTE Y LA GRACIOSA (35500 - 35599) ---
  '35500': { municipality: 'Arrecife', island: 'Lanzarote' },
  '35508': { municipality: 'Teguise', island: 'Lanzarote' },
  '35509': { municipality: 'San Bartolomé', island: 'Lanzarote' },
  '35510': { municipality: 'Tías', island: 'Lanzarote' },
  '35520': { municipality: 'Haría', island: 'Lanzarote' },
  '35530': { municipality: 'Teguise', island: 'Lanzarote' },
  '35540': { municipality: 'Haría', island: 'Lanzarote' },
  '35541': { municipality: 'Teguise', island: 'La Graciosa' },
  '35542': { municipality: 'Haría', island: 'Lanzarote' },
  '35543': { municipality: 'Haría', island: 'Lanzarote' },
  '35550': { municipality: 'San Bartolomé', island: 'Lanzarote' },
  '35559': { municipality: 'Tinajo', island: 'Lanzarote' },
  '35560': { municipality: 'Tinajo', island: 'Lanzarote' },
  '35570': { municipality: 'Yaiza', island: 'Lanzarote' },
  '35571': { municipality: 'Yaiza', island: 'Lanzarote' },
  '35572': { municipality: 'Tías', island: 'Lanzarote' },
  '35580': { municipality: 'Yaiza', island: 'Lanzarote' },

  // --- FUERTEVENTURA (35600 - 35699) ---
  '35600': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35610': { municipality: 'Antigua', island: 'Fuerteventura' },
  '35611': { municipality: 'Antigua', island: 'Fuerteventura' },
  '35612': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35613': { municipality: 'Puerto del Rosario', island: 'Fuerteventura' },
  '35620': { municipality: 'Tuineje', island: 'Fuerteventura' },
  '35625': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35626': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35627': { municipality: 'Pájara', island: 'Fuerteventura' },
  '35628': { municipality: 'Tuineje', island: 'Fuerteventura' },
  '35630': { municipality: 'Betancuria', island: 'Fuerteventura' },
  '35640': { municipality: 'La Oliva', island: 'Fuerteventura' },

  // --- TENERIFE (38000 - 38699) ---
  '38001': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38002': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38003': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38004': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38005': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38006': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38007': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38008': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38009': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38010': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38107': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38108': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38109': { municipality: 'Santa Cruz de Tenerife', island: 'Tenerife' },
  '38201': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38202': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38203': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38204': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38205': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38206': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38207': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38208': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38280': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38290': { municipality: 'El Rosario', island: 'Tenerife' },
  '38291': { municipality: 'Tacoronte', island: 'Tenerife' },
  '38296': { municipality: 'San Cristóbal de La Laguna', island: 'Tenerife' },
  '38300': { municipality: 'La Orotava', island: 'Tenerife' },
  '38310': { municipality: 'La Orotava', island: 'Tenerife' },
  '38311': { municipality: 'La Orotava', island: 'Tenerife' },
  '38312': { municipality: 'La Orotava', island: 'Tenerife' },
  '38320': { municipality: 'La Laguna', island: 'Tenerife' },
  '38350': { municipality: 'Tacoronte', island: 'Tenerife' },
  '38355': { municipality: 'El Sauzal', island: 'Tenerife' },
  '38360': { municipality: 'La Matanza de Acentejo', island: 'Tenerife' },
  '38370': { municipality: 'La Victoria de Acentejo', island: 'Tenerife' },
  '38380': { municipality: 'Santa Úrsula', island: 'Tenerife' },
  '38390': { municipality: 'La Orotava', island: 'Tenerife' },
  '38400': { municipality: 'Puerto de la Cruz', island: 'Tenerife' },
  '38410': { municipality: 'Los Realejos', island: 'Tenerife' },
  '38420': { municipality: 'San Juan de la Rambla', island: 'Tenerife' },
  '38429': { municipality: 'La Guancha', island: 'Tenerife' },
  '38430': { municipality: 'Icod de los Vinos', island: 'Tenerife' },
  '38440': { municipality: 'Garachico', island: 'Tenerife' },
  '38450': { municipality: 'Los Silos', island: 'Tenerife' },
  '38460': { municipality: 'Buenavista del Norte', island: 'Tenerife' },
  '38470': { municipality: 'El Tanque', island: 'Tenerife' },
  '38480': { municipality: 'Santiago del Teide', island: 'Tenerife' },
  '38500': { municipality: 'Güímar', island: 'Tenerife' },
  '38510': { municipality: 'Candelaria', island: 'Tenerife' },
  '38520': { municipality: 'Arico', island: 'Tenerife' },
  '38530': { municipality: 'Candelaria', island: 'Tenerife' },
  '38540': { municipality: 'Arafo', island: 'Tenerife' },
  '38570': { municipality: 'Fasnia', island: 'Tenerife' },
  '38580': { municipality: 'Arico', island: 'Tenerife' },
  '38590': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38591': { municipality: 'San Miguel de Abona', island: 'Tenerife' },
  '38594': { municipality: 'Vilaflor de Chasna', island: 'Tenerife' },
  '38600': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38611': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38612': { municipality: 'Granadilla de Abona', island: 'Tenerife' },
  '38620': { municipality: 'San Miguel de Abona', island: 'Tenerife' },
  '38626': { municipality: 'Arona', island: 'Tenerife' },
  '38630': { municipality: 'Arona', island: 'Tenerife' },
  '38631': { municipality: 'Arona', island: 'Tenerife' },
  '38639': { municipality: 'Arona', island: 'Tenerife' },
  '38640': { municipality: 'Arona', island: 'Tenerife' },
  '38650': { municipality: 'Arona', island: 'Tenerife' },
  '38660': { municipality: 'Adeje', island: 'Tenerife' },
  '38670': { municipality: 'Adeje', island: 'Tenerife' },
  '38680': { municipality: 'Guía de Isora', island: 'Tenerife' },
  '38683': { municipality: 'Santiago del Teide', island: 'Tenerife' },

  // --- LA PALMA (38700 - 38799) ---
  '38700': { municipality: 'Santa Cruz de La Palma', island: 'La Palma' },
  '38710': { municipality: 'Breña Alta', island: 'La Palma' },
  '38711': { municipality: 'Breña Baja', island: 'La Palma' },
  '38715': { municipality: 'Puntallana', island: 'La Palma' },
  '38720': { municipality: 'San Andrés y Sauces', island: 'La Palma' },
  '38726': { municipality: 'Barlovento', island: 'La Palma' },
  '38727': { municipality: 'Garafía', island: 'La Palma' },
  '38730': { municipality: 'Villa de Mazo', island: 'La Palma' },
  '38739': { municipality: 'Fuencaliente de La Palma', island: 'La Palma' },
  '38750': { municipality: 'El Paso', island: 'La Palma' },
  '38760': { municipality: 'Los Llanos de Aridane', island: 'La Palma' },
  '38770': { municipality: 'Tazacorte', island: 'La Palma' },
  '38780': { municipality: 'Tijarafe', island: 'La Palma' },
  '38788': { municipality: 'Puntagorda', island: 'La Palma' },

  // --- LA GOMERA (38800 - 38899) ---
  '38800': { municipality: 'San Sebastián de La Gomera', island: 'La Gomera' },
  '38810': { municipality: 'Hermigua', island: 'La Gomera' },
  '38811': { municipality: 'Agulo', island: 'La Gomera' },
  '38820': { municipality: 'Vallehermoso', island: 'La Gomera' },
  '38870': { municipality: 'Valle Gran Rey', island: 'La Gomera' },
  '38880': { municipality: 'Alajeró', island: 'La Gomera' },

  // --- EL HIERRO (38900 - 38999) ---
  '38900': { municipality: 'Valverde', island: 'El Hierro' },
  '38911': { municipality: 'Frontera', island: 'El Hierro' },
  '38912': { municipality: 'El Pinar de El Hierro', island: 'El Hierro' },
};

/**
 * Obtiene el Municipio e Isla a partir de un Código Postal de Canarias.
 * Si no hay coincidencia exacta de 5 dígitos, detecta la provincia (35 o 38).
 */
export function getCanaryLocationByZip(cp: string): CanaryLocation | null {
  const cleanCp = cp.trim();
  if (cleanCp.length < 5) return null;

  // 1. Coincidencia exacta de 5 dígitos
  if (CANARY_CP_MAP[cleanCp]) {
    return CANARY_CP_MAP[cleanCp];
  }

  // 2. Fallback de Isla por prefijo provincial si no es exacto
  if (cleanCp.startsWith('35')) {
    const num = parseInt(cleanCp, 10);
    if (num >= 35500 && num <= 35599) return { municipality: '', island: 'Lanzarote' };
    if (num >= 35600 && num <= 35699) return { municipality: '', island: 'Fuerteventura' };
    return { municipality: '', island: 'Gran Canaria' };
  }

  if (cleanCp.startsWith('38')) {
    const num = parseInt(cleanCp, 10);
    if (num >= 38700 && num <= 38799) return { municipality: '', island: 'La Palma' };
    if (num >= 38800 && num <= 38899) return { municipality: '', island: 'La Gomera' };
    if (num >= 38900 && num <= 38999) return { municipality: '', island: 'El Hierro' };
    return { municipality: '', island: 'Tenerife' };
  }

  return null;
}