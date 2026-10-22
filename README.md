# FESTIVAL CONTROL · Expo Web + AWS Amplify Gen 2

Aplicación web para consultar la programación de un festival y administrarla con autorización. Amplify Data proporciona una API GraphQL de AWS AppSync y una tabla Amazon DynamoDB; Amplify Auth usa Amazon Cognito.

## Permisos

- Cualquier visitante puede leer los eventos.
- Sólo los usuarios del grupo Cognito `Admins` pueden crear, editar, cambiar el estado o eliminar eventos.
- El registro público está deshabilitado. El acceso de administración se provisiona desde Cognito.
- La clave de API pública se configura para 365 días. Amplify la renueva al desplegar el backend; programa un despliegue al menos una vez al año.

## Desarrollo local

Necesitas Node.js, una cuenta AWS y credenciales configuradas localmente para AWS (por ejemplo, `aws configure` o un perfil SSO).

```bash
npm install
npm run sandbox
```

El sandbox despliega los recursos en AWS y genera `amplify_outputs.json` en la raíz. Ese archivo no se versiona. En otra terminal:

```bash
npm run web
npm run typecheck
```

Para detener el sandbox, pulsa `Ctrl+C`. Al terminar de usar el sandbox, confirma su eliminación si quieres borrar los recursos temporales de AWS.

## Invitar administradores

Después de desplegar el backend:

1. En AWS Console, abre Amazon Cognito y el grupo de usuarios creado por Amplify.
2. Crea un usuario invitado con su correo electrónico y contraseña temporal.
3. Añade ese usuario al grupo `Admins`.
4. El administrador inicia sesión desde **ACCESO ADMIN**. La aplicación permite establecer una contraseña nueva si Cognito exige cambiar la temporal.

La autorización del grupo también se valida en AppSync; ocultar acciones en la interfaz no es la única barrera de acceso.

## Despliegue con Amplify Hosting

Conecta el repositorio y la rama en Amplify Hosting. El `amplify.yml` despliega primero el backend con `ampx pipeline-deploy` y después exporta la aplicación web a `dist/`. La aplicación debe tener permisos de despliegue backend para la rama configurados en Amplify Hosting.

También puedes generar una exportación web local después de iniciar el sandbox:

```bash
npm run build:web
```

## Modelo de datos

`FestivalEvent` almacena código, artista, escenario, hora y estado (`CONFIRMED`, `DELAYED` o `CANCELLED`). DynamoDB persiste los datos entre sesiones; el API entrega registros con un identificador generado por el backend.
