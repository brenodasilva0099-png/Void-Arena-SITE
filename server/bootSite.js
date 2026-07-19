require('dotenv').config();

const patches = [
  './fetchTimeoutPatch',
  './sessionPatch',
  './patchAdminDiscordAccessRuntime',
  './patchStablePageRoutesRuntime',
  './patchGlobalNavigationShellRuntime',
  './patchFederationPortalRuntime',
  './patchUpdatesChangelogRuntime',
  './patchFederationChangelogRuntime',
  './patchFederationRouteRegistrationRuntime',
  './patchFederationFixRouteRegistrationRuntime',
  './patchFederationButtonsRuntime',
  './patchRecruitmentDeclineDmRuntime',
  './patchFederationPolishCssRuntime',
  './patchFederationPolishJsRuntime',
  './patchFederationPolishPagesRuntime',
  './patchFederationNoMockRuntime',
  './patchFederationRealDataRuntime',
  './patchFederationFinalFixesRuntime',
  './patchFederationFinalJsRuntime',
  './patchLeagueRebrandRuntime',
  './patchDiscordLoginBrandAndDataRuntime',
  './patchLeagueNamespaceRuntime',
  './patchOfficialLeagueLogoRuntime',
  './patchDiscordAvatarSessionRuntime',
  './patchDiscordAvatarStabilityRuntime',
  './patchStableAuthUiRuntime',
  './patchSessionFlowRuntime',
  './patchDiscordMemberRolesRuntime',
  './patchPlayersRolesAndFastTeamsRuntime',
  './patchRoleNotificationsRuntime',
  './patchRoleNotificationPlayerCardsRuntime',
  './patchRoleNotificationBetterFlowRuntime',
  './patchRoleNotificationRolePolishRuntime',
  './patchAllRolesRuntime',
  './patchBracketGroupsRuntime',
  './patchBracketStageRuntime',
  './patchTeamRosterRuntime',
  './patchTeamLogoLimitsRuntime',
  './patchPlayerApplicationDeleteRuntime',
  './patchSupportRoutesRuntime',
  './patchSupportNavEverywhereRuntime',
  './patchSiteIntegrityRuntime'
];

for (const patch of patches) {
  try {
    require(patch);
  } catch (error) {
    console.error(`[Boot] Falha no patch ${patch}:`, error);
    process.exitCode = 1;
    throw error;
  }
}

console.log(`[Boot] ${patches.length} patches carregados; integridade visual aplicada por último.`);
require('../site/index');
