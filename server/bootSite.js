require('dotenv').config();

const patches = [
  './patchCanonicalBotBridgeRuntime',
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
  './patchStableAuthUiRuntime',
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
  './patchLeagueExperienceCssRuntime',
  './patchLeagueExperienceFinalChangelogRuntime',
  './patchSiteIntegrityRuntime',
  './patchNavigationIntegrityRuntime',
  './patchLeagueProfilesCompetitionsHomeRuntime',
  './patchProfileInlineCriticalExtrasRuntime',
  './patchDashboardCompetitionHighlightRuntime',
  './patchAdvancedTacticalSimulatorRuntime',
  './patchCanonicalAuthClientRuntime',
  './patchDiscordLegalPlacarRuntime',
  './patchBracketStylesheetFinalRuntime',
  './patchFormsStaticAssetRuntime',
  './patchRecruitmentNotificationDeliveryRuntime',
  './patchTeamMemberManagementAndCssRuntime',
  './patchStableTeamInviteUiRuntime',
  './patchProfileCollectionRuntime',
  './patchFinalNavigationNoPrefetchRuntime',
  './patchClubIntegrityRuntime',
  './patchAdminChatNavigationRuntime',
  './patchNexusCupFinalPublicationRuntime',
  './patchSeasonMatchCentersRuntime',
  './patchCurrentSumulasNavigationRuntime',
  './patchHollowNexusV2Runtime'
];

const patchFailures = [];

for (const patch of patches) {
  try {
    require(patch);
  } catch (error) {
    patchFailures.push({ patch, message: error?.message || String(error) });
    console.error(`[Boot/NonFatal] Patch ignorado para manter o SITE online: ${patch}`, error);
  }
}

console.log(`[Boot] ${patches.length - patchFailures.length}/${patches.length} patches carregados.`);
if (patchFailures.length) {
  console.warn('[Boot] SITE continuará online com patches opcionais pendentes:', patchFailures);
}

require('../site/index');
