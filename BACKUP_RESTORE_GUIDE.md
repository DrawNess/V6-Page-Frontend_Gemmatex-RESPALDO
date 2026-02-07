# Guía rápida: restaurar backup de la BD (CATALOGO_GEMMA)

Pasos reproducibles para traer un `.sql` desde el servidor y restaurarlo en el contenedor Postgres local (`postgres_container_gemmatex-V6`). Ajusta nombres/paths si tu entorno es distinto.

## 1) Preparar carpeta local
```bash
mkdir -p ~/backup-sql
cd ~/backup-sql
```

## 2) Descargar el backup desde el servidor
- El archivo está en `/root/backup.gemma_catalogo.sql` del host `31.97.164.171`.
- Usa `scp` apuntando al path completo en el server:
```bash
scp root@31.97.164.171:/root/backup.gemma_catalogo.sql ./
# ingresa la contraseña cuando la pida
```
Verifica que el archivo quedó en la carpeta actual:
```bash
ls -l backup.gemma_catalogo.sql
```

## 3) Asegurar que el contenedor Postgres está arriba
```bash
docker ps
# Debe aparecer: postgres_container_gemmatex-V6
```

## 4) Recrear la base de datos vacía
```bash
docker exec -i postgres_container_gemmatex-V6 psql -U postgres -c 'DROP DATABASE IF EXISTS "CATALOGO_GEMMA";'
docker exec -i postgres_container_gemmatex-V6 psql -U postgres -c 'CREATE DATABASE "CATALOGO_GEMMA";'
```

## 5) Restaurar el backup
```bash
cat backup.gemma_catalogo.sql | docker exec -i postgres_container_gemmatex-V6 psql -U postgres -d "CATALOGO_GEMMA"
```
- Es normal ver avisos como `invalid command \restrict/\unrestrict` si el dump trae esas marcas; el resto del script sigue corriendo.

## 6) Validar tablas importadas
```bash
docker exec -i postgres_container_gemmatex-V6 psql -U postgres -d "CATALOGO_GEMMA" -c "\dt"
```
Deberías ver tablas como `products`, `categories`, `offers`, etc.

## Notas rápidas
- Si el contenedor tiene otro nombre, reemplázalo en los comandos `docker exec`.
- Si el backup cambia de ruta/nombre en el servidor, ajusta el `scp`.
- Si usas otra versión de Postgres o puerto, agrega `-p <puerto>` al `psql` dentro del contenedor.***
