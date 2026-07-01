function routeStacks(app) {
  return [app?._router?.stack, app?.router?.stack].filter(Array.isArray);
}

function removeRoute(app, method, routePath) {
  const lower = String(method || '').toLowerCase();
  let removed = false;
  for (const stack of routeStacks(app)) {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const layer = stack[index];
      const route = layer?.route;
      const paths = Array.isArray(route?.path) ? route.path : [route?.path];
      if (paths.includes(routePath) && route?.methods?.[lower]) {
        stack.splice(index, 1);
        removed = true;
      }
    }
  }
  return removed;
}

function removeRoutes(app, routes = []) {
  const report = [];
  routes.forEach(([method, routePath]) => report.push({ method, routePath, removed: removeRoute(app, method, routePath) }));
  return report;
}

module.exports = { removeRoute, removeRoutes };
