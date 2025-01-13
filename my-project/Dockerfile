# Usa la imagen oficial de Bun como base
FROM oven/bun:latest

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . .

# Instala las dependencias de la aplicación (incluyendo Express)
RUN bun install

# Expone el puerto 3000 para la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["bun", "run", "start"]