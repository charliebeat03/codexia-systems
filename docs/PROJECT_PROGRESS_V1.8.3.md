# Estado del proyecto · v1.8.3

## Estimación de avance

Esta estimación es de planificación, no una métrica automática. Se basa en el alcance actualmente documentado: sitio corporativo público, formularios de contacto/presupuesto, CRM, autenticación, panel interno, portal de clientes, documentos privados, QA y preparación de publicación.

| Bloque | Avance estimado | Evidencia / pendiente principal |
|---|---:|---|
| Sitio corporativo público | 85% | Páginas, navegación, portafolio, recursos, FAQ, soporte, contacto y footer implementados; falta QA visual y aprobación de contenido. |
| Contacto y presupuesto | 60% | Formularios y endpoint existen; falta envío real con Resend, persistencia CRM y rate limit persistente. |
| Base de datos y seguridad | 40% | Migración inicial y RLS redactados; falta proyecto Supabase, pruebas reales, Storage y revisión final. |
| Autenticación, panel y portal | 10% | Arquitectura descrita, interfaces funcionales aún no implementadas. |
| Calidad, accesibilidad y rendimiento | 35% | Revisión estática parcial; falta build reproducible, navegador, Lighthouse y pruebas de dispositivos. |
| Preparación de entrega GitHub | 65% | Estructura y documentación existen; faltan lockfile, build, QA final y revisión de secretos. |

## Lectura global

- **Proyecto completo estimado: 50–55%.** La parte pública está bastante avanzada, pero el CRM, autenticación, panel, portal y almacenamiento aún no están construidos ni conectados.
- **Hito de primera subida a GitHub: 65% preparado.** Restan aproximadamente 35 puntos porcentuales de preparación antes de la subida recomendada: lockfile, build exitoso, revisión funcional/visual, revisión de secretos y aprobación del propietario.
- GitHub no requiere que Supabase esté conectado. Se puede subir primero una versión de código sin secretos y conectar el backend después, pero el propietario ha preferido completar la mayor cantidad posible antes de hacerlo.

## Próximos pasos en orden

1. Obtener un entorno con pnpm y generar `pnpm-lock.yaml`.
2. Instalar dependencias y ejecutar `pnpm build`; corregir errores reales.
3. Revisar visualmente las rutas, formularios, footer y enlaces sociales en móvil y escritorio.
4. Revisar contenido, enlaces, metadatos, accesibilidad y secretos.
5. Preparar el primer commit y pedir autorización antes de subirlo a GitHub.
6. Después, avanzar con Supabase, Resend, CRM, Auth, panel y portal de clientes.

## Límites de esta estimación

No se ha ejecutado un build completo ni pruebas de navegador. Por eso el porcentaje es una aproximación basada en funcionalidades presentes y pendientes documentadas, no una certificación de calidad ni una promesa de fecha.
