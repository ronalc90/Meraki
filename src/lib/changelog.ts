/**
 * Historial de versiones visible desde /settings → Acerca de.
 * El usuario puede tocar la versión para leer qué trajo cada entrega.
 * Orden: más reciente primero.
 */

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.008',
    date: '2026-04-17',
    highlights: [
      'Zona peligrosa: el botón del modal ahora dice "Eliminar datos" (la cuenta queda como nueva, no se borra).',
      'Indicador en vivo para el tema "Sistema": muestra si está resolviendo a Claro u Oscuro.',
      'Densidad Compacta ya se nota — reduce paddings y espaciados en toda la app.',
      'Sonidos reales (WebAudio) al guardar preferencias y al borrar datos. Respetan el toggle.',
      'Vista previa de la guía de impresión ya no sobresale del recuadro.',
      'Móvil: header de Productos ordena mejor los botones en pantallas angostas.',
    ],
  },
  {
    version: '1.007',
    date: '2026-04-17',
    highlights: [
      'Botón "Nuevo Pedido" en la lista de Pedidos ya no se sale del viewport en móvil.',
      'Tamaño de letra de impresión totalmente ajustable: preset Personalizado con 4 steppers independientes (cabecera, cuerpo, destacado, pie) entre 6 y 24 pt.',
      'Vista previa de guía en /settings que refleja los tamaños en puntos reales.',
      'La impresión por lotes de /despacho respeta tu configuración.',
    ],
  },
  {
    version: '1.006',
    date: '2026-04-17',
    highlights: [
      'Nueva pantalla de Configuración completa: Apariencia (tema claro/oscuro/sistema, tamaño de letra UI, densidad, reducir animaciones), Preferencias generales (moneda, sonidos, confirmación), Preferencias de impresión y Zona peligrosa.',
      'Borrar todos los datos de la cuenta: requiere escribir "Acepto" para confirmar (también validado en el servidor).',
      'Botón de Ayuda por pantalla (Dashboard, Pedidos, Inventario, Productos, Despacho, Configuración).',
      'Asistente: librito de días guardados para guardar/restaurar chats completos.',
      'Menú inferior móvil: se agregó la entrada de Configuración.',
    ],
  },
  {
    version: '1.005',
    date: '2026-04-15',
    highlights: [
      'Fotos en inventario se amplían al tocarlas.',
      'Fix de desfase de fecha al importar desde Excel.',
    ],
  },
  {
    version: '1.004',
    date: '2026-04-14',
    highlights: [
      'Asistente: 20 ejemplos en la pantalla de bienvenida para empezar a usar rápido.',
    ],
  },
  {
    version: '1.003',
    date: '2026-04-13',
    highlights: [
      'Botón de ayuda dentro del Asistente.',
      'Fix del Dashboard en móvil.',
    ],
  },
  {
    version: '1.002',
    date: '2026-04-12',
    highlights: [
      'Costo de productos visible y editable.',
      'Asistente más honesto: confirma antes de ejecutar acciones.',
    ],
  },
  {
    version: '1.001',
    date: '2026-04-10',
    highlights: [
      'Primera versión pública de Tu Tienda Meraki.',
    ],
  },
];
