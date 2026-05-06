# Upload Real de Arquivos na Triagem (Signed URL + PUT)

## Contexto

Hoje o frontend de `/triagem` apenas simula o upload: arquivos ficam em memória, a barra de progresso é um `setTimeout`, e ao confirmar a triagem só enviamos `{ name, size }` para o backend. O conteúdo binário nunca sai do navegador, então o Object Storage do PRD v3.0 não é exercitado.

Vamos trocar essa simulação por um fluxo real em 3 passos por arquivo, mantendo fallback de demo quando o backend não estiver acessível.

## Fluxo proposto (por arquivo)

1. **Solicitar signed URL** ao backend Emergent: `POST /uploads/sign` com `{ filename, content_type, size }` → resposta `{ upload_url, object_key, headers?, expires_in }`.
2. **PUT direto** no `upload_url` enviando o `File` como body, com `Content-Type` correto e progresso real via `XMLHttpRequest` (`upload.onprogress`). `fetch` não expõe progresso de upload, por isso usamos XHR.
3. **Confirmar** ao backend: `POST /uploads/confirm` com `{ object_key, filename, size, content_type }` → resposta `{ file_id, url? }`. Esse `file_id` é o que vai junto da triagem.

Ao submeter a triagem, o payload `files` passa a conter `{ file_id, name, size, content_type, object_key }` em vez de só metadados crus.

## Mudanças no código

### `src/lib/api.ts`
- Novos tipos:
  - `SignedUploadRequest`, `SignedUploadResponse { upload_url, object_key, method?, headers?, expires_in }`
  - `ConfirmedUpload { file_id, object_key, filename, size, content_type, url? }`
- Novo módulo `uploadsApi`:
  - `sign(file)` → tenta `POST /uploads/sign`; em fallback (demo) devolve um `upload_url` falso (`data:` ou rota local mock) sinalizando `mock: true`.
  - `confirm(meta)` → tenta `POST /uploads/confirm`; em fallback devolve `file_id` gerado localmente.
  - `uploadWithProgress(url, file, headers, onProgress)`: helper baseado em `XMLHttpRequest` que retorna `Promise<void>` e emite `onProgress(0..100)`. Cancela via `AbortSignal`.
- Atualizar `TriageProcessRequest.files` para `Array<{ file_id: string; name: string; size: number; content_type: string; object_key?: string }>`.

### `src/routes/triagem.tsx`
- Substituir `simulateUpload` por uma função `startUpload(uf)` que:
  1. chama `uploadsApi.sign`,
  2. roda `uploadWithProgress` atualizando `progress` real,
  3. chama `uploadsApi.confirm` e guarda `file_id`/`object_key` no item,
  4. trata erro marcando o item como `error` com botão "Tentar novamente".
- Estender `UploadFile` com `status: "uploading" | "done" | "error"`, `file_id?`, `object_key?`, `content_type`, `abort?: AbortController`, `errorMessage?`.
- Botão de remover deve abortar o XHR se ainda em andamento.
- `canSubmit` exige que todos os arquivos estejam `done` (sem nenhum `uploading`/`error`).
- No `submit`, mapear `files` para o novo formato com `file_id`.
- Mensagens de toast:
  - sucesso: "Arquivo enviado com segurança"
  - erro: "Falha no envio de {nome}. Tente novamente."
  - modo demo (fallback): toast informativo discreto uma única vez por sessão.

### Segurança / LGPD
- Validar tipo (`application/pdf`, `image/png`, `image/jpeg`) e tamanho (≤10MB) **antes** de pedir a signed URL.
- Não logar conteúdo dos arquivos; logs apenas com `object_key` e tamanho.
- `Content-Type` enviado no PUT deve bater com o do `sign` para evitar rejeição do storage (S3/GCS).

## Arquitetura visual

```text
[browser]
  selecionar arquivo
        │
        ▼
  POST /uploads/sign  ─────────────►  [Emergent backend]
        │ upload_url, object_key
        ▼
  PUT  upload_url  (body: File)  ──►  [Object Storage]
        │ 200 OK  (XHR progress real)
        ▼
  POST /uploads/confirm ──────────►  [Emergent backend]
        │ file_id
        ▼
  guarda { file_id, object_key } no estado da triagem
        │
        ▼
  POST /triage/process { ..., files: [{ file_id, ... }] }
```

## Fora de escopo
- Upload multipart/chunked para arquivos grandes (todos limitados a 10MB).
- Antivírus / OCR — responsabilidade do backend após `confirm`.
- Pré-visualização de PDF/imagem após upload.

## Hydration warning observado
Há um aviso de hydration mismatch em `/triagem` causado por `loadPatient()` lendo `localStorage` no primeiro render do SSR. Vou aproveitar para inicializar `patient` como `null` e carregar dentro de `useEffect`, eliminando o mismatch — mudança pequena, no mesmo arquivo.
