# Prompt: Conectar frontend React/TypeScript con las APIs de ACCENTURE

Copia todo este contenido y pégalo en Claude como primer mensaje.

---

## CONTEXTO

Tengo un frontend existente en **React + TypeScript** y necesito conectarlo con un conjunto de APIs REST definidas mediante OpenAPI 3.1.

### Tecnologías del frontend
- Framework: **React + TypeScript**
- Base URL de la API: variable de entorno **`VITE_API_URL`** (o `REACT_APP_API_URL` si usa CRA)
- Organización: **capa de servicios dedicada** en `src/services/`
- HTTP client: **detecta el que ya existe en el proyecto** (axios, fetch, etc.); si no hay ninguno, usa `axios`

### Instrucciones generales

> **El proyecto frontend ya existe.** Empieza siempre leyendo la estructura actual antes de tocar nada.

1. **Lee primero** el `package.json`, la estructura de `src/` y cualquier servicio o cliente HTTP ya existente para entender qué librerías hay y qué patrones se siguen.
2. Crea o actualiza `src/services/api.ts` (o el archivo equivalente que ya exista) con un **cliente HTTP base** configurado con `baseURL = import.meta.env.VITE_API_URL`.
3. Para cada API, crea un archivo de servicio separado en `src/services/` (p.ej. `collectService.ts`, `licitationService.ts`, etc.).
4. Genera los **tipos TypeScript** en `src/types/api.ts` a partir de todos los schemas de request y response.
5. Para cada servicio, exporta funciones tipadas. Maneja errores de forma consistente.
6. Si el proyecto ya usa **React Query / TanStack Query**, envuelve cada función en un hook personalizado (`useCollectDocuments`, `useGetLicitations`, etc.).
7. **Respeta estrictamente** los patrones existentes: nombres de archivos, estructura de carpetas, convenciones de exports, interceptores, autenticación, etc.

---

## ESPECIFICACIONES DE LAS APIs

### 1. Document Collector API — `collect.json`

**`POST /collect`** — Collect User Documents

- Content-Type: `multipart/form-data`
- Request body:
  ```
  title: string  (required)
  files: File[]  (required) — archivos binarios (ZIP, PDF, DOCX)
  ```
- Response 200:
  ```typescript
  {
    file_info: Array<{
      message: string;
      file_path: string;
      request_id: string;
      title: string;
    }>
  }
  ```
- Notas: usa `FormData`. Pueden enviarse múltiples archivos.

---

### 2. Outline Creator API — `create_outline.json`

**`POST /create_outline`** — Outline Creator

- Content-Type: `application/json`
- Request body:
  ```typescript
  { licitation_id: string | null }  // required
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

---

### 3. Licitation Management API — `licitation-management.json`

**`POST /get_licitations`** — Get Licitations

- Content-Type: `application/json`
- Request body:
  ```typescript
  { licitation_id: string | null }  // required
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

**`POST /delete_licitation`** — Delete Licitation

- Content-Type: `application/json`
- Request body:
  ```typescript
  { licitation_id: string | null }  // required
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

**`POST /get_offers`** — Get Offers

- Content-Type: `application/json`
- Request body:
  ```typescript
  { user_id: string | null }  // required
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

---

### 4. Context Enhancement API — `retrieve-documents.json`

**`POST /retrieve_documents`** — Submit Context Enhancement

- Content-Type: `application/json`
- Request body:
  ```typescript
  {
    query: string | null;         // required
    licitation_id: string | null; // required
    k: number | null;             // required — integer
    n: number | null;             // required — integer
    search_type: string | null;   // required
    algorithm: string | null;     // required
    field?: string | null;        // optional
    index_main?: 0 | 1 | null;   // optional — integer, min 0, max 1
  }
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

---

### 5. Offers Searcher API — `search_offers.json`

**`POST /search_offers`** — Offers Searcher

- Content-Type: `application/json`
- Request body:
  ```typescript
  {
    licitation_id: string | null;  // required
    top_k: number | null;          // required — integer
    query: string | null;          // required
    only_context: boolean | null;  // required
    only_index: boolean | null;    // required
    same_client: boolean | null;   // required
  }
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```

---

### 6. Win Themes API — `win-themes-extractor.json`

**`POST /win-themes-extractor`** — Win Themes Extractor

- Content-Type: `application/x-www-form-urlencoded`
- Request body:
  ```typescript
  {
    index_point: string;       // required
    licitation_ids: string[];  // required — array de strings
  }
  ```
- Response 200:
  ```typescript
  { result: Record<string, unknown> }
  ```
- Notas: usa `URLSearchParams` o `qs.stringify`. Para arrays, repite la clave: `licitation_ids=a&licitation_ids=b`.

---

## ERRORES COMUNES (422 Validation Error)

Todos los endpoints devuelven este schema en caso de error de validación:
```typescript
{
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>
}
```
Maneja este error de forma centralizada en el cliente HTTP base.

---

## ENTREGABLES ESPERADOS

1. **`src/types/api.ts`** — Todos los tipos TypeScript de requests y responses.
2. **`src/services/apiClient.ts`** (o similar) — Instancia base del HTTP client con `baseURL`, headers comunes y manejo de errores 422.
3. **`src/services/collectService.ts`** — Función `collectDocuments(title, files)`.
4. **`src/services/outlineService.ts`** — Función `createOutline(licitationId)`.
5. **`src/services/licitationService.ts`** — Funciones `getLicitations`, `deleteLicitation`, `getOffers`.
6. **`src/services/retrieveDocumentsService.ts`** — Función `retrieveDocuments(params)`.
7. **`src/services/searchOffersService.ts`** — Función `searchOffers(params)`.
8. **`src/services/winThemesService.ts`** — Función `extractWinThemes(indexPoint, licitationIds)`.
9. *(Opcional, si el proyecto usa React Query)* Hooks customizados para cada servicio.

---

## NOTAS ADICIONALES

- Todos los servicios deben ser **async/await**.
- Usa `AbortController` / `signal` si el proyecto ya lo hace.
- No modifiques componentes UI existentes a menos que sea necesario para conectar la integración; limítate a la capa de servicios y tipos.
- Si detectas un patrón de autenticación (JWT, cookies, etc.) en el proyecto, aplícalo también en el cliente base.
