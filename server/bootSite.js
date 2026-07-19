require('dotenv').config();

const patches = [
  './fetchTimeoutPatch',
  './sessionPatch',
  './patchBotPublicUrlRuntime',
  './patchStaticMaintenanceBypassRuntime',
  './patchBracketGroupStandingsRuntime',
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
  './patchLeagueExperienceRouteRegistrationRuntime',
  './patchCafeRankingRouteRegistrationRuntime',
  './patchLeagueExperienceRuntime',
  './patchLeagueCompetitionScriptsRuntime',
  './patchLegacyTeamOwnershipRuntime',
  './patchLeagueNavStateRuntime',
  './patchLeagueFinalRuntime',
  './patchLeagueClientStabilityRuntime',
  './patchLeagueExperienceFinalChangelogRuntime',
  './patchSiteIntegrityRuntime',
  './patchNavigationIntegrityRuntime'
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

console.log(`[Boot] ${patches.length} patches carregados em ordem final.`);
require('../site/index');
