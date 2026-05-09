# Guía de releases (GitHub)

Objetivo: publicar versiones legibles para inversores, partners y equipo, manteniendo coherencia entre **git tag**, **GitHub Releases** y **`CHANGELOG.md`**.

---

## 1. Reglas rápidas

| Regla | Recomendación |
|-------|----------------|
| **Rama etiquetada** | Etiquetar desde la rama que **realmente** despliega en producción. Hoy esa línea es **`ArcusX3.6`**. Opcional pero profesional: **fusionar antes a `main`** y etiquetar `main`. |
| **Versión** | Usar **[SemVer](https://semver.org/lang/es/)**: `MAJOR.MINOR.PATCH`. Ejemplo alineado a tu naming: **`v3.6.0`** (primera release “oficial” de la línea 3.6). Parches siguientes: `v3.6.1`, etc. |
| **Nombre del tag** | Siempre **`v` + número**, ej. `v3.6.0` (GitHub muestra mejor y es estándar). |
| **Cuerpo del Release** | Copiar/adaptar la sección correspondiente del **`CHANGELOG.md`** (no dejar el release vacío). |
| **Activos adjuntos** | Para ArcusX (SPA) **no suele hacer falta** subir `dist.zip` en cada release salvo política interna o auditores que lo pidan explícito. |

---

## 2. Antes de publicar (checklist)

- [ ] `CHANGELOG.md`: mover entradas de **`[Sin publicar]`** a una fecha/versión concreta bajo una cabecera `## v3.6.0 — YYYY-MM-DD` (o mantener formato por fecha como ahora y añadir línea **“Incluido en tag `v3.6.0`”** si prefieres).
- [ ] Código compilando en la vista que vas a etiquetar: `cd arcusx && npm run build` (y corregir lo que rompa el release).
- [ ] Rama limpia: `git status` sin cambios sorpresa o commitearlos antes.
- [ ] (Opcional) Alinear versión visible: en `arcusx/package.json` pasar `"version"` de `0.0.0` a `3.6.0` en el commit de release si quieres coherencia con el tag ([Guía semver para apps privadas](https://semver.org/lang/es/)).

---

## 3. Flujo recomendado (manual, una vez)

Si **fusionas `ArcusX3.6` → `main`** (recomendado para reputación del repo público):

```bash
git fetch origin
git checkout main
git pull origin main
git merge ArcusX3.6 -m "release: integrate ArcusX3.6 for v3.6.0"
# resolver conflictos si los hay
git push origin main
```

Creación del tag **en el commit exacto** que quieras marcar como release:

```bash
git checkout main   # o: git checkout ArcusX3.6  si etiquetas esa rama
git pull origin main

git tag -a v3.6.0 -m "ArcusX 3.6.0 — backend CORS OAuth enterprise wallet changelog"
git push origin v3.6.0
```

Luego en **GitHub → Releases → Draft a new release**:

- **Choose a tag:** `v3.6.0`
- **Release title:** `v3.6.0` o `ArcusX 3.6.0 (May 2026)`
- **Description:** pegar contenido Markdown del `CHANGELOG.md` para ese tramo + enlace `./CHANGELOG.md` en el repo
- Marcar **“Set as the latest release”** si es la versión actual
- Publicar (**Publish release**)

---

## 4. Con GitHub CLI (`gh`)

Útil si ya tienes sesión (`gh auth login`):

```bash
gh release create v3.6.0 \
  --repo wrever/ArcusX \
  --title "ArcusX v3.6.0" \
  --notes-file CHANGELOG-SNIPPET.md \
  --latest
```

Donde `CHANGELOG-SNIPPET.md` es un archivo temporal solo con las notas de esta versión (copiadas desde `CHANGELOG.md`).

Si no tienes `gh`, usa solo la interfaz web; el resultado es equivalente.

---

## 5. Plantilla corta para notas del release

````markdown
## ArcusX v3.6.0

**Fecha:** YYYY-MM-DD  
**Commit:** `<hash corto>` (opcional)

### Highlights
- Backend: CORS centralizado y secretos vía variables de entorno
- Frontend: OAuth (Google/GitHub), portal empresas, mejoras wallet e i18n
- Ops: checklist deploy SPA + CDN

Ver historial completo en [CHANGELOG.md](../CHANGELOG.md).
````

---

## 6. Hacer el repo “se vea pro” (detalles que marcan diferencia)

1. **Siempre** un release asociado al tag (no tags huérfanos sin notas).
2. **Descripción** con bullets legibles; evitar solo “fix stuff”.
3. En **README**, enlace visible a **[Releases](https://github.com/wrever/ArcusX/releases)** y al **CHANGELOG**.
4. Mantener **`main`** al día con la línea que enseñás en demos (evita preguntas “¿por qué main está viejo?”).
5. Releases **mensuales o por hito** mejor que sporadic “update” si buscas orden institucional.

---

## 7. Si necesitas rollback

Los tags son inmutables en la práctica: si te equivocas, crea **`v3.6.1`** con el fix; **no borres tags** públicos ya usados sin consenso (rompe reproducibilidad).

---

*Última actualización: 2026-05.*
