import L from 'leaflet';

/**
 * GPS Marker para el cadete: Faro azul pulsante (radar) de alto contraste
 */
export const createCadeteLocationIcon = (): L.DivIcon => {
  return L.divIcon({
    className: 'cadete-gps-pin',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-70"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

/**
 * Marker de destino del pedido: Chip oscuro con importe y distinción Efectivo / Transferencia
 */
export const createOrderDestinationIcon = (
  amount: number,
  paymentMethod: 'cash' | 'transfer',
  isSelected: boolean = false
): L.DivIcon => {
  const isTransfer = paymentMethod === 'transfer';
  const borderColor = isSelected
    ? 'border-emerald-400 ring-2 ring-emerald-400/50'
    : isTransfer
    ? 'border-cyan-500/90'
    : 'border-emerald-500/90';
  const textColor = isTransfer ? 'text-cyan-400' : 'text-emerald-400';
  const dotColor = isTransfer ? 'bg-cyan-400' : 'bg-emerald-400';

  return L.divIcon({
    className: 'order-map-pin',
    html: `
      <div class="flex flex-col items-center cursor-pointer transition-transform duration-150 ${isSelected ? 'scale-110' : 'hover:scale-105'}">
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border ${borderColor} rounded-full shadow-2xl shadow-black text-xs font-bold whitespace-nowrap">
          <span class="${textColor}">$${amount.toLocaleString('es-AR')}</span>
          <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
        </div>
        <div class="w-2 h-2 bg-zinc-900 border-r border-b ${borderColor} transform rotate-45 -mt-1 shadow-md"></div>
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 34],
    popupAnchor: [0, -34]
  });
};
