import React, { useState } from "react";
import { CANARY_ISLANDS, isValidCanaryZip, isUnder16 } from "../utils/canariasValidation";

export function CheckoutForm({ userProfile, onProceedToPayment }: any) {
  const [birthDate, setBirthDate] = useState(userProfile?.birth_date || "");
  const [island, setIsland] = useState(CANARY_ISLANDS[0]);
  const [zipCode, setZipCode] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Guardia de Edad
    if (!birthDate) {
      setError("Debes indicar tu fecha de nacimiento para continuar.");
      return;
    }

    if (isUnder16(birthDate)) {
      setError("Acceso denegado: Debes tener al menos 16 años cumplidos para comprar en HoloCards.");
      return;
    }

    // 2. Guardia de Envíos Exclusivos a Canarias
    if (!isValidCanaryZip(zipCode)) {
      setError("Envíos restringidos: Solo realizamos entregas en las Islas Canarias (CP 35xxx y 38xxx).");
      return;
    }

    // Procesar pago si supera las validaciones
    onProceedToPayment({
      birthDate,
      island,
      zipCode,
      newsletterOptIn: newsletter,
    });
  };

  const inputClass = "w-full bg-[#050914] text-white placeholder:text-gray-400 border border-white/10 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 rounded-lg p-2 outline-none transition";
  const labelClass = "block text-sm font-medium text-gray-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-[#0a1628] border border-white/10 rounded-2xl">
      <h2 className="text-xl font-bold text-white">Datos de Envío y Verificación</h2>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Fecha de nacimiento */}
      <div>
        <label className={labelClass}>Fecha de Nacimiento *</label>
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Requerido por ley para compras (+16 años).</p>
      </div>

      {/* Selección de Isla */}
      <div>
        <label className={labelClass}>Isla de Destino *</label>
        <select
          value={island}
          onChange={(e) => setIsland(e.target.value as any)}
          className={inputClass}
        >
          {CANARY_ISLANDS.map((isla) => (
            <option key={isla} value={isla}>
              {isla}
            </option>
          ))}
        </select>
      </div>

      {/* Código Postal */}
      <div>
        <label className={labelClass}>Código Postal *</label>
        <input
          type="text"
          maxLength={5}
          placeholder="Ej: 38200"
          required
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Newsletter */}
      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="newsletter"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded accent-blue-600"
        />
        <label htmlFor="newsletter" className="text-xs font-medium text-gray-400">
          Deseo recibir ofertas exclusivas y novedades de HoloCards por email.
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-300 transition"
      >
        Continuar al Pago
      </button>
    </form>
  );
}
