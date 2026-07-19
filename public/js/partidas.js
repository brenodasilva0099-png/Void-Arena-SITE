(function () {
  'use strict';
  // Compatibilidade para páginas antigas de treinos/partidas.
  // A página pode carregar este arquivo sem quebrar enquanto o módulo atual usa as APIs do SITE.
  document.documentElement.dataset.partidasCompatibility = '1';
}());
