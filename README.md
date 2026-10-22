# FESTIVAL CONTROL · React Native + Expo Web

Demo **frontend-only** para la charla de AWS Amplify. Mantiene la identidad visual del cuaderno 04-PILARES-SERVERLESS: fondo `#090909`, cards `#151515`, acento `#FF2F92`, confirmado `#39D98A` y retrasado `#F5C542`.

## Inicio rápido

```bash
npm install
npx expo install --fix
npm run web
```

## Exportación para AWS Amplify Hosting

```bash
npm run build:web
```

El resultado estático se genera en `dist/`. En Amplify: conectar GitHub, rama `main`, usar `amplify.yml` y publicar `dist/`. No requiere AWS Academy, Lambda ni API Gateway.

## Prueba de alumno

1. Abrir **Eventos** y filtrar por escenario o artista.
2. Crear `TECHNO TITANS`, escenario `MAIN STAGE`, hora `21:45` y estado `CONFIRMED`.
3. Editar el evento y cambiar la hora a `23:00`.
4. Cambiar el estado a `DELAYED`.
5. Eliminar el evento.

**Datos simulados en memoria:** los cambios se pierden al recargar la página. Las operaciones no son HTTP reales. Para probar el despliegue automático, cambiar el subtítulo de la aplicación, hacer commit y push y observar el nuevo build en Amplify.

## Referencia docente

https://github.com/albertohdezakkari/04-PILARES-SERVERLESS
