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
