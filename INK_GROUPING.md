# Agrupacion De Tintas (EPSON)

## Objetivo
- En catálogo, mostrar **1 tarjeta por familia de tinta** (no 1 por color).
- En detalle de producto, mostrar las **variantes de color** de esa familia.

## Alcance De Activacion
- Archivo: `src/app/domains/catalogo/productos/productos.component.ts`
- La agrupación se activa solo en flujo de subcategorías seleccionadas y con heurística de contexto Epson+tintas.
- Si no se cumple el contexto, se mantiene el listado normal sin agrupar.

## Motor De Agrupacion
- Archivo: `src/app/domains/shared/utils/ink-grouping.util.ts`
- Función principal: `groupEpsonInkProducts(products, options?)`
- Modo actual: agrupación por **familia**.

### Familias explicitas
1. `f170-f570`
- Unifica F170 y F570 en una sola tarjeta.

2. `f6200`
- Una tarjeta para la familia F6200.

3. `f6370`
- Una tarjeta para la familia F6370.

4. `f6470-f6470h`
- Unifica F6470 y F6470H en una sola tarjeta.

5. `g6070`
- Una tarjeta para familia DTF G6070 (incluye tintas y líquido de mantenimiento).

### Fallback automatico
- Para modelos Epson no listados explícitamente, detecta tokens de modelo por regex y agrupa por familia detectada.
- Cubre casos como `T3170X`.

## Deteccion De Tintas Y Colores
- Archivo: `src/app/domains/shared/utils/ink-utils.ts`

### Reglas clave
- `isInkSubcategoryStrict(...)`: validación estricta por subcategoría (UI).
- `isInkSubcategory(...)`: validación tolerante con fallback por texto (lógica interna).
- `detectInkColor(...)`: prioridad de detección fluor antes de colores base para evitar colisiones.

### Aliases importantes
- `Fluor Yellow`: reconoce `yellow fluor`, `fluor yellow`, `yfl`, etc.
- `Fluor Pink`: reconoce `pink fluor`, `fluor pink`, `pfl`, etc.
- Orden visual base de colores: `C, M, Y, K`.

## Product Detail (Variantes)
- Archivo: `src/app/domains/products/pages/product-detail/product-detail.component.ts`
- Archivo: `src/app/domains/products/pages/product-detail/product-detail.component.html`

### Comportamiento
- El bloque de variantes solo se muestra si `isInkSubcategoryStrict(...)` es verdadero.
- Las variantes se buscan por **familia** (misma lógica del catálogo), no por `inkBaseKey`.
- Si `relatedProducts` no trae suficientes variantes, se completa con toda la subcategoría.

### Siglas en UI
- `Fluor Yellow` -> `FY`
- `Fluor Pink` -> `FP`
- `Mantenimiento` -> `ML`

## Nota De Mantenimiento
- Si negocio cambia familias o nombres de modelo, ajustar `resolveFamilyKey(...)` en `src/app/domains/shared/utils/ink-grouping.util.ts`.
- Si cambian nomenclaturas de color, ajustar `INK_COLORS` y `detectInkColor(...)` en `src/app/domains/shared/utils/ink-utils.ts`.
