# Task 3 - Analytics

## Implementado

- Servicio `playerAnalyticsService.js` para:
  - resumen del jugador
  - media global
  - medias por área
  - desglose por métrica
  - datos del radar chart
  - resumen histórico de evaluaciones
  - filtro opcional por temporada
- Servicio `dashboardService.js` con consultas agregadas SQL para:
  - jugadores activos
  - equipos activos
  - informes emitidos en temporada activa
  - media de jugadores por equipo
  - jugadores pendientes de evaluación por equipo
  - porcentaje de avance
- Helper reutilizable de etiquetas de área en:
  - `src/services/evaluationAreaHelper.js`

## Perfil avanzado de jugador

- Nueva ruta `GET /players/:id`.
- Nuevo controlador `playerProfileController.js`.
- Vista `src/views/players/show.ejs` con:
  - cabecera de perfil
  - información personal
  - contexto futbolístico
  - bloque de informes
  - bloque analítico de evaluaciones
  - radar chart con Chart.js
- Todos los datos del gráfico y del desglose se preparan en servicios/controlador, no en EJS.

## Dashboard

- Nuevo controlador `dashboardController.js`.
- Nueva vista `src/views/dashboard/index.ejs`.
- Métricas principales y tabla:
  - `Jugadores sin evaluación por equipo`
- Placeholder funcional:
  - `GET /evaluations/compare`

## Compatibilidad y verificación

- Se mantiene SSR con EJS.
- No se rompe el flujo actual de informes ni de jugadores.
- Se evitan N+1 en dashboard y analítica principal usando consultas agregadas.
- Tests de integración añadidos para perfil de jugador y dashboard.
- Verificación realizada con `npm test`.
