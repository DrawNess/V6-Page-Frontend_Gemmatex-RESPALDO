# Agrupacion De Tintas (Catalogo)

## Objetivo
- Mostrar una sola tarjeta por "familia de tinta" para evitar duplicados por color.
- Mantener la paginacion consistente en `40` items por pagina.

## Donde Se Aplica
- `src/app/domains/catalogo/productos/productos.component.ts`
- Solo cuando hay subcategorias seleccionadas (porque en ese flujo se junta el dataset completo y luego se pagina).

## Regla De Flujo
1. Se unen los productos de todas las subcategorias seleccionadas.
2. Se aplica busqueda por texto (si hay termino).
3. Se agrupan tintas Epson con `groupEpsonInkProducts(...)`.
4. Se pagina el resultado agrupado en `40`.

## Implementacion
- Util: `src/app/domains/shared/utils/ink-grouping.util.ts`
- Funcion principal: `groupEpsonInkProducts(products, options?)`

### Heuristicas actuales
- Agrupa solo productos que parecen tinta Epson:
  - `isInkSubcategory(product) === true`
  - y texto con marca Epson.
- Construye una clave de grupo por:
  - familia de modelo de impresora (ej. `F6470`, `F6470H`, `F9570`)
  - tokens de producto sin color, volumen y terminos genericos.

### Equivalencias de modelos (editable)
- En `DEFAULT_MODEL_ALIAS_FAMILIES`:
  - `['F6470', 'F6470H', 'F9570']`

Si negocio cambia, edita ese arreglo para agregar o quitar equivalencias.

## Nota Sobre Fuentes Epson
- Se verifico documentacion oficial Epson para tinta/modelos:
  - SureColor F6470/F6470H (anuncio oficial de lanzamiento y configuraciones de tinta).
  - SureColor F9570/F9570H (guia oficial con configuraciones de tinta).
  - SureColor G6070 (guia oficial con set de 6 tintas: `C, M, Y, K, Wh, ML`).
