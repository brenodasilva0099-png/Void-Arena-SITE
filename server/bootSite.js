require('dotenv').config();

// Capture the committed V4 pages before any legacy patch can rewrite public/pages.
const hollowV4 = require('./hollowV4CanonicalPages');

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

try {
  hollowV4.restoreMainPages();
  hollowV4.polishSecondaryPages();
} catch (error) {
  patchFailures.push({ patch: './hollowV4CanonicalPages', message: error?.message || String(error) });
  console.error('[Boot/NonFatal] Não foi possível restaurar completamente as páginas V4:', error);
}

// Home has its own canonical template and must be restored after every legacy runtime writer.
try {
  require('./patchHollowNexusV3CanonicalRuntime');
} catch (error) {
  patchFailures.push({ patch: './patchHollowNexusV3CanonicalRuntime', message: error?.message || String(error) });
  console.error('[Boot/NonFatal] Home V4 canônica não pôde ser restaurada:', error);
}

// This is the final visual write for the entire site. Nothing legacy runs after it.
try {
  require('./patchHollowNexusV4UnifiedRuntime');
} catch (error) {
  patchFailures.push({ patch: './patchHollowNexusV4UnifiedRuntime', message: error?.message || String(error) });
  console.error('[Boot/NonFatal] Camada V4 unificada não pôde ser aplicada:', error);
}

const totalPatches = patches.length + 3;
console.log(`[Boot] ${totalPatches - patchFailures.length}/${totalPatches} patches/camadas carregados.`);
if (patchFailures.length) {
  console.warn('[Boot] SITE continuará online com patches opcionais pendentes:', patchFailures);
}

require('../site/index');
