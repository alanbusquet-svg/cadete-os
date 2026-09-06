# Original User Request

## 2026-09-06T20:55:32Z

# Teamwork Project Prompt — Final

> Status: 🚀 LANZADO
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Equipo completo de agentes multi-disciplinario

Use the full multi-agent team to resolve mobile back navigation, modal dismissal ergonomics, and hardware/gesture back-button trapping across Cadete OS so that cadetes on motorcycles can navigate and cancel any view or modal with one hand without accidentally exiting the app.

Working directory: d:\SaaS de delivery\SaaS
Integrity mode: development

---

## Contexto del Proyecto

- **Stack:** React 18 + Vite 5 + TypeScript strict + Tailwind CSS dark mode (`bg-zinc-950`).
- **Problemas Críticos Reportados:**
  1. Al presionar el botón físico o virtual "Atrás" del celular (o realizar el gesto de retroceso en Android/iOS), la PWA se cierra o navega fuera de la aplicación en vez de cerrar el modal abierto o volver a la pestaña principal.
  2. En el modal "Nuevo Viaje" (`OrderFormModal`) y en los demás formularios (`ExpenseFormModal`, `BusinessFormModal`, `MaintenanceFormModal`, `BusinessDebtModal`), no existe un botón de "Cancelar" o "Volver" visible y cómodo en la parte inferior. La única opción actual es una pequeña cruz en la esquina superior derecha, inaccesible cuando se maneja el celular con la mano izquierda en moto.
  3. Disposición solicitada por el usuario para los botones de acción inferior: botón "Cancelar / Volver" apilado directamente debajo del botón principal "Guardar", ambos con altura mínima de 52px y ancho completo (`w-full`), permitiendo cancelar con el pulgar izquierdo sin riesgo de pulsar "Guardar" por error.

---

## Requirements

### R1. Manejo del Historial y Botón "Atrás" del Celular (History & Popstate API)
- Cada vez que se abre cualquier modal o diálogo en la aplicación (`Modal.tsx`, `ConfirmDialog.tsx`, `OrderMapModal.tsx`), el sistema debe registrar un estado en el historial del navegador (`history.pushState`).
- Si el repartidor presiona el botón "Atrás" de su teléfono o ejecuta el gesto de retroceso táctil, el modal abierto debe cerrarse inmediatamente en lugar de navegar fuera de la aplicación o salir de la PWA.
- Cuando el modal se cierra por cualquier otra vía (botón Cancelar, botón Volver, cruz, tap en fondo o tecla Escape), la entrada en el historial debe limpiarse limpiamente sin dejar estados residuales.
- Al cambiar entre pestañas secundarias (Mapa, Gastos, Comercios, Taller, Ajustes), presionar el botón "Atrás" del teléfono debe retornar a la pestaña principal de Viajes (`orders`) antes de salir de la aplicación.

### R2. Ergonomía de Encabezado Adaptada a Mano Izquierda
- En el encabezado de `Modal.tsx` y de los modales de pantalla completa:
  - Incorporar un botón de retroceso ("Atrás" / Flecha izquierda) en la **esquina superior izquierda** con touch target de al menos 44px, alcanzable de forma inmediata con el pulgar de la mano izquierda.
  - Mantener la cruz de cierre `X` en la esquina derecha como alternativa.
  - Permitir que un toque rápido en la barra indicadora superior (drag handle móvil) también cierre el modal.

### R3. Botón de Cancelación Inferior a Ancho Completo en Todos los Formularios
- En todos los modales con formulario de la app (`OrderFormModal.tsx`, `ExpenseFormModal.tsx`, `BusinessFormModal.tsx`, `MaintenanceFormModal.tsx`, `BusinessDebtModal.tsx`), incorporar un botón secundario claramente visible:
  - Etiqueta clara: "Cancelar" o "Volver sin Guardar".
  - Ubicación: Apilado debajo del botón principal de Guardar.
  - Dimensiones: Ancho completo (`w-full`), altura táctil mínima de 52px (`min-h-[52px]`), estilos de Dark Mode de alto contraste (`variant="secondary"`).
  - Al pulsarlo, debe cerrar el formulario limpiando cualquier error o estado temporal sin modificar los datos.

### R4. Cierre por Fondo (Backdrop) y Tecla Escape Robusto
- Garantizar que hacer clic o toque en el fondo oscurecido (backdrop) o presionar la tecla `Escape` cierre el modal de forma fiable en todos los dispositivos.
- Asegurar que `document.body.style.overflow` se restablezca siempre a su valor original al desmontar o cerrar cualquier modal, impidiendo que la pantalla quede congelada o sin scroll.

---

## Acceptance Criteria

### Compilación y Calidad de Código
- [ ] `npm run build` compila con código de salida 0 y 0 errores de TypeScript (`tsc && vite build`).
- [ ] `npm run test` pasa el 100% de los tests de Vitest existentes (446 tests) más la nueva suite de pruebas de navegación e historial.
- [ ] Cero regresiones en la funcionalidad de viajes, caja, odómetro, mapa interactivo y asistente de voz.

### Navegación y Botón Atrás
- [ ] Al simular o ejecutar un evento `popstate` con un modal abierto, el modal se cierra y la aplicación permanece activa en la pantalla actual.
- [ ] Al estar en cualquier pestaña secundaria (ej. Gastos o Ajustes), retroceder con el navegador/teléfono regresa a la pestaña de Pedidos (`orders`).

### Interfaz y Accesibilidad
- [ ] El modal de Nuevo Viaje (`OrderFormModal`) y todos los formularios tienen el botón "Cancelar" de 52px de alto a ancho completo debajo de "Guardar".
- [ ] El encabezado de `Modal` cuenta con botón de retroceso en la esquina superior izquierda accesible para zurdos/mano izquierda.
- [ ] El toque en backdrop y la tecla Escape cierran cualquier modal y liberan el scroll del body.

## 2026-09-06T22:54:00Z

Cadete OS es una PWA mobile-first para cadetes en moto de San Carlos de Bolívar, Argentina.
Este sprint mejora el sistema de mapa integrado (Leaflet + CartoDB, sin APIs pagas) y el asistente
de voz (Web Speech API) para que sean completamente utilizables desde la moto, con una sola mano,
sin salir nunca de la app.

Working directory: d:\SaaS de delivery\SaaS
Integrity mode: development

---

## Contexto Técnico

- **Stack:** React 18 + Vite 5 + TypeScript estricto + Tailwind CSS dark mode (`bg-zinc-950`)
- **Mapa:** Leaflet.js con tiles CartoDB Dark Matter (gratis, sin API Key)
- **GPS:** `navigator.geolocation.watchPosition` con hook `useGeolocation`
- **Geocodificación:** Diccionario offline de calles en `src/utils/geocoding.ts` + fallback por zona
- **Voz:** Web Speech API nativa en `src/utils/speech.ts`, voz `es-AR` prioritaria
- **Tests:** Vitest v2.1.9 en `tests/`, actualmente 531 tests pasando en 31 suites — no se deben romper
- **Build:** `tsc && vite build` debe terminar con código de salida 0
- **Sin APIs pagas:** CERO servicios de pago. Solo recursos gratuitos (Nominatim/OSM, OSRM, CartoDB)
- **Touch targets:** Todos los botones de acción ≥ 52px de alto, drag handles ≥ 44px
- **Colores:** fondo `bg-zinc-950`, cards `bg-zinc-900`, bordes `border-zinc-800`, acento `emerald-500`

---

## Requirements

### R1. Mapa integrado: abrir desde la lista de viajes sin salir de la app

Hoy, el botón "Cómo ir" en la lista de viajes (`OrderList`) abre Google Maps externo, sacando al
cadete de la app. Ese botón debe abrir el modal de mapa integrado (`OrderMapModal`) directamente,
mostrando la ruta interna. El enlace a Google Maps / Waze debe quedar solo como botón secundario
dentro del modal de ruta, nunca como acción principal desde la lista.

### R2. Geocodificación offline: ampliar el diccionario de calles de Bolívar

El archivo `src/utils/geocoding.ts` tiene solo 23 calles. Ampliar a mínimo 60 calles reales de
San Carlos de Bolívar, Argentina (incluyendo: Colón, Necochea, Independencia, Dorrego, Ameghino,
Quintana, Perito Moreno, Carlos Pellegrini, Laprida, España, Italia, Francia, Pringles, 25 de Mayo,
9 de Julio, 12 de Octubre, Alberdi, Avellaneda, Chacabuco, Constitución, Echeverría, Falucho,
Garay, Humahuaca, Irigoyen, Juncal, Kirchner, Lima, Melo, Nación, Obispo, Pastor, Quito, Reconquista,
Salta, Tucumán, Uruguay, Vélez Sársfield, Washington, Yrigoyen, y barrios como Parque Industrial,
Villa del Parque, La Loma). Cada calle debe tener coordenadas reales aproximadas verificadas para
San Carlos de Bolívar (lat ~ -36.23, lng ~ -61.11).

### R3. Lectura automática de voz al abrir un pedido

Cuando el cadete abre `OrderMapModal`, el pedido debe leerse automáticamente por voz sin que tenga
que tocar ningún botón. La lectura debe incluir: comercio, dirección de destino, monto y forma de
cobro. Esto debe ocurrir solo si la voz no está silenciada. El botón 🔊 existente debe seguir
funcionando para releer manualmente.

### R4. Botón de voz en la lista de viajes

Agregar un botón de voz 🔊 en cada tarjeta de pedido en `OrderList` para que el cadete pueda
escuchar el resumen del viaje sin abrir ningún modal. El botón debe tener ≥ 44px de touch target
y debe silenciarse automáticamente si la voz global está en modo mute.

### R5. Ruta por calles reales usando OSRM (gratuito)

La polilínea de ruta en `OrderMapModal` hoy dibuja una línea recta. Integrar la API pública de
OSRM (`https://router.project-osrm.org`) para obtener la ruta real por calles cuando hay conexión
a internet. Si OSRM no responde o no hay internet, caer en la línea recta actual como fallback.
La llamada a OSRM debe ser async, no bloquear la apertura del modal, y mostrar un indicador de
carga mientras resuelve.

---

## Acceptance Criteria

### Mapa integrado (R1)
- [ ] Al tocar "Cómo ir" en cualquier tarjeta de pedido en `OrderList`, se abre `OrderMapModal` dentro de la app sin ninguna redirección externa
- [ ] El botón "Cómo ir" de `OrderList` es ≥ 52px de alto y se abre el modal con el pedido correcto
- [ ] El modal `OrderMapModal` sigue teniendo el botón secundario para abrir Google Maps / Waze en los casos donde el cadete lo elija manualmente
- [ ] Si el pedido no tiene dirección, el botón "Cómo ir" en la lista no aparece o está deshabilitado

### Geocodificación (R2)
- [ ] `src/utils/geocoding.ts` contiene al menos 60 entradas en `BOLIVAR_ANCHORS`
- [ ] Tests de regresión en `tests/geolocation_routing.test.ts` o equivalente siguen pasando
- [ ] Nuevas calles agregadas tienen coordenadas lat/lng dentro del radio de San Carlos de Bolívar (lat entre -36.20 y -36.27, lng entre -61.08 y -61.15)
- [ ] `resolveOrderCoordinates` con una de las nuevas calles no retorna el fallback de ciudad central (BOLIVAR_CENTER)

### Voz automática (R3)
- [ ] Al abrir `OrderMapModal`, la función `speakOrder` se invoca automáticamente dentro de los primeros 300ms de apertura
- [ ] Si `isSpeechMuted()` retorna `true`, no se emite ninguna locución automática
- [ ] El botón 🔊 manual sigue funcionando independientemente
- [ ] No se producen locuciones duplicadas (la apertura automática cancela cualquier locución previa)

### Voz en lista de viajes (R4)
- [ ] Cada tarjeta de pedido en `OrderList` tiene un botón con ícono de volumen de ≥ 44px
- [ ] Al tocarlo, se invoca `speakOrder` con el pedido de esa tarjeta
- [ ] Si la voz está silenciada globalmente, el botón visualmente lo indica (opacidad reducida o icono de mute) y no emite sonido

### Ruta real por calles (R5)
- [ ] `OrderMapModal` intenta obtener la ruta por calles vía OSRM al abrirse
- [ ] Mientras carga OSRM, el mapa muestra la polilínea recta de fallback (no pantalla en blanco)
- [ ] Cuando OSRM responde, la polilínea se reemplaza por la ruta real por calles con la misma estética (color emerald, peso 4px, opacidad 0.9)
- [ ] Si OSRM falla o no hay internet, se mantiene la polilínea recta sin mostrar errores al usuario
- [ ] La distancia y ETA mostradas en el header se actualizan con la distancia real de la ruta OSRM cuando está disponible

### Calidad general
- [ ] `npm run test` pasa 100% (≥ 531 tests, 0 fallos)
- [ ] `npm run build` termina con código de salida 0 (`tsc && vite build`)
- [ ] Todos los nuevos botones interactivos tienen ≥ 44px o ≥ 52px según el contexto
- [ ] Código TypeScript estricto sin `any` sin justificación

---

## Verificación de Tests Existentes

Los tests existentes relevantes que NO deben romperse:
- `tests/map_integration.test.ts` — 13 tests de integración del mapa
- `tests/geolocation_routing.test.ts` — 28 tests de geocodificación y GPS
- `tests/speech.test.ts` — 12 tests del sistema de voz
- `tests/navigation.test.ts` — 11 tests de navegación GPS

Correr `npm run test` en `d:\SaaS de delivery\SaaS` para verificar.
