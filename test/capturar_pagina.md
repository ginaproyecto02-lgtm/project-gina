# Cómo guardar una instantánea de una página real (una vez al mes)

Las tiendas cambian su HTML sin avisar. Estas instantáneas permiten que las pruebas detecten cuándo Gina dejó de leer la marca, el vendedor, el precio, la moneda, la calificación o los meses sin intereses.

Páginas a mantener (una por tienda): Amazon México, Mercado Libre México, Walmart México, Liverpool, Coppel, Best Buy (EE.UU.), Amazon EE.UU. y Amazon España.

## Pasos

1. Abre en tu navegador una página de producto de la tienda (cualquier producto común con precio visible).
2. Espera a que cargue por completo (precio, vendedor y calificación visibles).
3. Guarda la página: **Ctrl+S → «Página web, solo HTML»** (no «completa»).
4. Cambia el nombre a `<tienda>-<AAAA-MM>.html` y cópiala a `test/fixtures/paginas/`.
   Nombres de tienda: `amazon_mx`, `mercadolibre_mx`, `walmart_mx`, `liverpool`, `coppel`, `bestbuy_us`, `amazon_us`, `amazon_es`.
   Ejemplo: `amazon_mx-2026-10.html`.
5. Crea al lado un archivo `.json` con el mismo nombre y lo que ves en la pantalla, escrito a mano:

```json
{
  "url": "https://www.amazon.com.mx/dp/B0XXXXXXX",
  "marca": "Sony",
  "vendedor": "Amazon",
  "precio": 1299,
  "moneda": "MXN",
  "calificacion": 4.6,
  "msi": 12
}
```

   - `url`: la dirección de la página (Gina la usa para saber la tienda y el país).
   - `msi`: el número de meses si la página dice «hasta N meses sin intereses»; `false` si no dice nada; `null` si no quieres probarlo.
   - Cualquier campo en `null` o ausente no se prueba.
6. Borra la instantánea del mes anterior de la misma tienda y corre `cd test && node snapshots.test.js`.

Si una prueba falla, el selector de esa tienda en `extension/src/extractors.js` quedó viejo: abre un issue con la instantánea o pídeselo al ejecutor.

**Privacidad:** guarda páginas sin haber iniciado sesión o revisa que el HTML no tenga tu nombre, dirección ni correo antes de subirlo; el repositorio es público.
