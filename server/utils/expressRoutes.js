function removeRoute(app, method, routePath) {
  const stack = app?._router?.stack;
  if (!Array.isArray(stack)) return false;
  const lower = String(method || '').toLowerCase();
  let removed = false;
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const layer = stack[index];
    const route = layer?.route;
    if (route?.path === routePath && route.methods?.[lower]) {
      stack.splice(index, 1);
      removed = true;
    }
  }
  return removed;
}

function removeRoutes(app, routes = []) {
  routes.forEach(([method, routePath]) => removeRoute(app, method, routePath));
}

module.exports = { removeRoute, removeRoutes };
