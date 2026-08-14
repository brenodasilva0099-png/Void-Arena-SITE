(() => {
  "use strict";

  const FALLBACK_LOGO = "/assets/logo.png";
  const ACTIVE_STATUSES = new Set(["open", "active", "running", "registration_open", "ongoing"]);
  const FINISHED_STATUSES = new Set(["closed", "finished", "ended", "archived", "completed", "validated"]);
  const REVIEW_STATUSES = new Set(["pending", "submitted", "review", "under_review", "awaiting_validation"]);

  const state = {
    overview: {},
    events: [],
    results: [],
    clubs: [],
    ranking: [],
    viewer: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const array = (value) => (Array.isArray(value) ? value : []);

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const pick = (source, keys, fallback = "") => {
    if (!source || typeof source !== "object") return fallback;
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
    }
    return fallback;
  };

  const firstArray = (source, keys) => {
    for (const key of keys) {
      if (Array.isArray(source?.[key])) return source[key];
    }
    return [];
  };

  const safeUrl = (value, { image: isImage = false } = {}) => {
    const raw = String(value || "").trim();
    if (!raw) return isImage ? FALLBACK_LOGO : "";
    if (raw.startsWith("/")) return raw;
    if (isImage && /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(raw)) return raw;
    try {
      const parsed = new URL(raw, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (_) {
      return isImage ? FALLBACK_LOGO : "";
    }
    return isImage ? FALLBACK_LOGO : "";
  };

  const api = async (url) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) return {};
      return await response.json();
    } catch (_) {
      return {};
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const unwrap = (payload, keys) => {
    if (Array.isArray(payload)) return payload;
    return firstArray(payload, keys);
  };

  const formatDate = (value) => {
    if (!value) return "Data a confirmar";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const statusValue = (item) =>
    normalize(pick(item, ["status", "state", "phase"], "")).replace(/\s+/g, "_");

  const eventId = (event) => pick(event, ["id", "_id", "eventId", "slug"], "");

  const eventName = (event) => pick(event, ["name", "title", "eventName"], "Competição da liga");

  const teamName = (team, fallback = "A definir") => {
    if (typeof team === "string") return team || fallback;
    return pick(team, ["name", "teamName", "clubName", "displayName", "tag"], fallback);
  };

  const teamTag = (team) => {
    if (!team || typeof team === "string") return "";
    return pick(team, ["tag", "teamTag", "shortName"], "");
  };

  const teamLogo = (team) => {
    if (!team || typeof team === "string") return FALLBACK_LOGO;
    return pick(team, ["logo", "logoUrl", "avatar", "avatarUrl", "image", "icon"], FALLBACK_LOGO);
  };

  const teamId = (team) => {
    if (!team || typeof team === "string") return "";
    return pick(team, ["id", "_id", "teamId", "clubId", "slug"], "");
  };

  const teamHref = (team) => {
    const id = teamId(team);
    return id ? `/pages/perfil-clube.html?id=${encodeURIComponent(id)}` : "/pages/clubes.html";
  };

  const findClub = (...aliases) => {
    const wanted = aliases.map(normalize).filter(Boolean);
    return (
      state.clubs.find((club) => {
        const names = [
          teamName(club),
          teamTag(club),
          pick(club, ["slug"], "")
        ].map(normalize).filter(Boolean);
        return wanted.some((alias) => names.some((name) => name === alias || name.includes(alias) || alias.includes(name)));
      }) || null
    );
  };

  const resolveClub = (value, fallbackName = "A definir") => {
    if (value && typeof value === "object") {
      const resolved = findClub(teamName(value), teamTag(value));
      return { ...(resolved || {}), ...value };
    }
    const resolved = findClub(String(value || ""));
    return resolved || { name: String(value || fallbackName), logo: FALLBACK_LOGO };
  };

  const participantCount = (match) => {
    const direct = firstArray(match, ["participants", "players", "lineup", "selectedPlayers"]);
    if (direct.length) return direct.length;
    const home = firstArray(match, ["homePlayers", "teamAPlayers", "playersA"]);
    const away = firstArray(match, ["awayPlayers", "teamBPlayers", "playersB"]);
    return home.length + away.length;
  };

  const proofUrl = (match) => {
    const direct = pick(match, ["proofUrl", "proof", "screenshot", "imageUrl", "attachmentUrl"], "");
    if (typeof direct === "string") return direct;
    const attachments = firstArray(match, ["attachments", "proofs", "screenshots"]);
    const first = attachments[0];
    return typeof first === "string" ? first : pick(first, ["url", "proxy_url", "attachment"], "");
  };

  const matchTeams = (match) => {
    const homeRaw =
      pick(match, ["homeTeam", "teamA", "team1", "clubA", "home", "leftTeam"], null) ||
      pick(match?.match, ["homeTeam", "teamA", "team1"], null);
    const awayRaw =
      pick(match, ["awayTeam", "teamB", "team2", "clubB", "away", "rightTeam"], null) ||
      pick(match?.match, ["awayTeam", "teamB", "team2"], null);
    return [resolveClub(homeRaw, "Time A"), resolveClub(awayRaw, "Time B")];
  };

  const matchScore = (match) => {
    const home = pick(match, ["homeScore", "scoreA", "teamAScore", "goalsA", "score1"], null);
    const away = pick(match, ["awayScore", "scoreB", "teamBScore", "goalsB", "score2"], null);
    if (home !== null || away !== null) return [number(home), number(away)];

    const score = pick(match, ["score", "result", "placar"], "");
    const found = String(score).match(/(\d+)\s*[xX\-:]\s*(\d+)/);
    return found ? [number(found[1]), number(found[2])] : [null, null];
  };

  const hasScore = (match) => {
    const [home, away] = matchScore(match);
    return home !== null && away !== null;
  };

  const matchDate = (match) =>
    pick(match, ["playedAt", "matchDate", "date", "createdAt", "updatedAt", "submittedAt"], "");

  const matchCompetition = (match) =>
    pick(match, ["competitionName", "competition", "eventName", "event", "tournament"], "Competição da liga");

  const matchLabel = (match) =>
    pick(match, ["round", "stage", "matchLabel", "game", "confront"], "Confronto oficial");

  const isValidated = (match) => {
    const status = statusValue(match);
    return Boolean(
      match?.validated ||
        match?.approved ||
        match?.official ||
        FINISHED_STATUSES.has(status) ||
        status === "approved"
    );
  };

  const matchStatus = (match) => {
    if (isValidated(match)) return { label: "Resultado validado", className: "is-valid" };
    const status = statusValue(match);
    if (REVIEW_STATUSES.has(status) || hasScore(match)) return { label: "Aguardando validação", className: "is-review" };
    if (status === "scheduled" || status === "open") return { label: "Partida agendada", className: "is-live" };
    return { label: "Súmula em preparação", className: "is-closed" };
  };

  const currentMatch = () => {
    if (!state.results.length) return null;
    return (
      state.results.find((result) => {
        const status = statusValue(result);
        return REVIEW_STATUSES.has(status) || (!isValidated(result) && hasScore(result));
      }) || state.results[0]
    );
  };

  const sortByDate = (items) =>
    [...items].sort((a, b) => {
      const first = new Date(matchDate(a)).getTime() || 0;
      const second = new Date(matchDate(b)).getTime() || 0;
      return second - first;
    });

  const metric = (player, keys) => {
    for (const key of keys) {
      const direct = player?.[key];
      if (direct !== undefined && direct !== null) return number(direct);
      const nested = player?.stats?.[key];
      if (nested !== undefined && nested !== null) return number(nested);
    }
    return 0;
  };

  const playerName = (player) =>
    pick(player, ["displayName", "name", "username", "globalName", "nickname", "discordName"], "Jogador");

  const playerAvatar = (player) =>
    pick(player, ["avatar", "avatarUrl", "image", "photo", "profileImage"], FALLBACK_LOGO);

  const metricLeader = (players, label, keys, suffix) => {
    const sorted = [...players].sort((a, b) => metric(b, keys) - metric(a, keys));
    const player = sorted[0];
    const value = player ? metric(player, keys) : 0;
    if (!player || value <= 0) return null;
    return { player, label, value, suffix };
  };

  const image = (src, alt, className = "") =>
    `<img${className ? ` class="${className}"` : ""} src="${esc(safeUrl(src, { image: true }))}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_LOGO}'">`;

  const activeEvent = () => state.events.find((event) => ACTIVE_STATUSES.has(statusValue(event))) || null;

  const nextEvent = () =>
    state.events.find((event) => {
      const status = statusValue(event);
      return status === "upcoming" || status === "scheduled" || status === "draft";
    }) || null;

  function setBadge(element, label, className) {
    if (!element) return;
    element.textContent = label;
    element.className = `hnl-state-chip ${className}`;
  }

  function renderSeasonOverview() {
    const target = $("#seasonOverview");
    const badge = $("#seasonStateBadge");
    if (!target) return;

    const active = activeEvent();
    const upcoming = nextEvent();
    const season = state.overview?.season || { title: 'Temporada 1', name: 'Hollow Nexus T1', statusLabel: 'Em preparação' };
    const champion = findClub("Flow") || { name: "Flow", tag: "FLOW", logo: FALLBACK_LOGO };

    if (active) {
      const registered = number(pick(active, ["registeredTeams", "registered", "teamsCount", "clubsCount"], 0));
      const limit = number(pick(active, ["maxTeams", "limit", "clubsLimit", "teamLimit"], 0));
      setBadge(badge, statusValue(active) === "open" || statusValue(active) === "registration_open" ? "Inscrições abertas" : "Temporada em andamento", "is-live");
      target.innerHTML = `
        <div class="hnl-season-feature">
          <span class="hnl-season-tag">Competição atual</span>
          <h3>${esc(eventName(active))}</h3>
          <p>${esc(pick(active, ["description", "summary"], "A competição oficial está em andamento. Acompanhe inscrições, fases e resultados pela central."))}</p>
          <div class="hnl-season-meta">
            <span>${esc(pick(active, ["format"], "Formato a confirmar"))}</span>
            <span>${registered}${limit ? `/${limit}` : ""} clubes</span>
            <span>${formatDate(pick(active, ["startAt", "startsAt", "date", "eventDate"], ""))}</span>
          </div>
          <div class="hnl-champion-row">
            ${image(teamLogo(champion), `Escudo ${teamName(champion)}`, "hnl-team-logo")}
            <div><small>Último campeão oficial</small><strong>${esc(teamName(champion))}</strong></div>
          </div>
        </div>`;
      return;
    }

    setBadge(badge, season.statusLabel || "Temporada em preparação", "is-waiting");
    target.innerHTML = `
      <div class="hnl-season-feature">
        <span class="hnl-season-tag">${esc(season.title || 'Temporada atual')}</span>
        <h3>${upcoming ? esc(eventName(upcoming)) : esc(season.name || "Hollow Nexus T1")}</h3>
        <p>${
          upcoming
            ? `A próxima competição já está sendo preparada para ${esc(formatDate(pick(upcoming, ["startAt", "startsAt", "date"], "")))}.`
            : esc(season.description || "A nova temporada está em preparação. Os clubes podem organizar o elenco enquanto os primeiros campeonatos são anunciados.")
        }</p>
        <div class="hnl-season-meta">
          <span>${number(state.overview?.stats?.clubes ?? state.overview?.stats?.clubs ?? state.overview?.clubs?.length)} clubes na liga</span>
          <span>${number(state.overview?.stats?.jogadores ?? state.overview?.stats?.players ?? state.overview?.players?.length)} jogadores</span>
          <span>${number(season.competitionCount)} campeonatos no ciclo</span>
        </div>
        <div class="hnl-champion-row">
          ${image(teamLogo(champion), `Escudo ${teamName(champion)}`, "hnl-team-logo")}
          <div><small>Campeão da Nexus Cup — 1ª edição</small><strong>${esc(teamName(champion))}</strong></div>
        </div>
      </div>`;
  }

  function renderSeasonLeaders() {
    const target = $("#seasonLeaders");
    if (!target) return;

    const players =
      state.ranking.length
        ? state.ranking
        : firstArray(state.overview, ["players", "ranking", "members"]);
    const leaders = [
      metricLeader(players, "Pontuação", ["points", "pts", "score"], " pts"),
      metricLeader(players, "Gols", ["goals", "gols"], " gols"),
      metricLeader(players, "Assistências", ["assists", "assistencias"], " assist."),
      metricLeader(players, "MVP", ["mvp", "mvps"], " MVP")
    ].filter(Boolean);

    if (!leaders.length) {
      target.innerHTML = `
        <h3>Destaques da temporada</h3>
        <div class="hnl-empty-compact">Os líderes aparecem aqui assim que as primeiras súmulas forem validadas.</div>`;
      return;
    }

    target.innerHTML = `
      <h3>Destaques da temporada</h3>
      <div class="hnl-leaders-list">
        ${leaders
          .slice(0, 4)
          .map(
            ({ player, label, value, suffix }) => `
              <div class="hnl-leader-card">
                ${image(playerAvatar(player), `Avatar ${playerName(player)}`, "hnl-leader-avatar")}
                <div><strong>${esc(playerName(player))}</strong><small>${esc(label)}</small></div>
                <span class="hnl-leader-metric">${value}${esc(suffix)}</span>
              </div>`
          )
          .join("")}
      </div>`;
  }

  function viewerTeams() {
    return firstArray(state.viewer, ["teams", "clubs", "viewerTeams"]);
  }

  function renderSeasonAction() {
    const target = $("#seasonNextAction");
    if (!target) return;

    const active = activeEvent();
    const authenticated = Boolean(state.viewer?.authenticated || state.viewer?.user || state.viewer?.id || state.viewer?.discordId);
    const teams = viewerTeams();
    let title = "Prepare-se para a próxima etapa";
    let description = "Entre com o Discord para o site reconhecer seu perfil, clube e permissões.";
    let primaryHref = "/api/auth/discord";
    let primaryLabel = "Entrar com Discord";
    let secondaryHref = "/pages/competicoes.html";
    let secondaryLabel = "Ver competições";

    if (authenticated && teams.length && active) {
      title = "Seu clube já pode participar";
      description = "Confira o elenco e abra a competição para solicitar a inscrição do seu time.";
      primaryHref = `/pages/competicao.html${eventId(active) ? `?id=${encodeURIComponent(eventId(active))}` : ""}#inscricao`;
      primaryLabel = "Inscrever meu time";
      secondaryHref = teamHref(teams[0]);
      secondaryLabel = "Conferir elenco";
    } else if (authenticated && teams.length) {
      title = "Organize o elenco";
      description = "A temporada está em preparação. Atualize liderança, titulares, reservas e conexões oficiais.";
      primaryHref = teamHref(teams[0]);
      primaryLabel = "Abrir meu clube";
      secondaryHref = "/pages/calendario.html";
      secondaryLabel = "Ver calendário";
    } else if (authenticated) {
      title = "Monte seu clube";
      description = "Cadastre um clube ou encontre uma equipe antes da abertura da próxima competição.";
      primaryHref = "/pages/cadastrar-clube.html";
      primaryLabel = "Cadastrar clube";
      secondaryHref = "/pages/mercado.html";
      secondaryLabel = "Abrir mercado";
    }

    target.innerHTML = `
      <span class="hnl-center-kicker">Seu próximo passo</span>
      <h3>${esc(title)}</h3>
      <p>${esc(description)}</p>
      <div class="hnl-center-actions">
        <a class="hnl-center-button is-primary" href="${esc(primaryHref)}">${esc(primaryLabel)}</a>
        <a class="hnl-center-button" href="${esc(secondaryHref)}">${esc(secondaryLabel)}</a>
      </div>`;
  }

  function matchCard(match, compact = false) {
    const [home, away] = matchTeams(match);
    const [homeScore, awayScore] = matchScore(match);
    const status = matchStatus(match);
    const participants = participantCount(match);
    const proof = safeUrl(proofUrl(match));
    const score = homeScore === null || awayScore === null ? "×" : `${homeScore} : ${awayScore}`;

    return `
      <div class="hnl-match-card${compact ? " is-compact" : ""}">
        <div class="hnl-match-team">
          ${image(teamLogo(home), `Escudo ${teamName(home)}`)}
          <div><strong>${esc(teamName(home))}</strong><small>${esc(teamTag(home) || "Mandante")}</small></div>
        </div>
        <div class="hnl-match-score">
          <span class="hnl-score-numbers">${esc(score)}</span>
          <small>${esc(matchLabel(match))}</small>
        </div>
        <div class="hnl-match-team is-away">
          ${image(teamLogo(away), `Escudo ${teamName(away)}`)}
          <div><strong>${esc(teamName(away))}</strong><small>${esc(teamTag(away) || "Visitante")}</small></div>
        </div>
      </div>
      <div class="hnl-match-details">
        <span class="hnl-match-status ${status.className}">${esc(status.label)}</span>
        <span>${esc(String(matchCompetition(match)))}</span>
        <span>${esc(formatDate(matchDate(match)))}</span>
        ${participants ? `<span>${participants} participante${participants === 1 ? "" : "s"}</span>` : ""}
        ${proof ? `<a class="hnl-center-link" href="${esc(proof)}" target="_blank" rel="noopener noreferrer">Ver comprovante</a>` : ""}
      </div>`;
  }

  function renderHomeMatch() {
    const target = $("#homeMatchSummary");
    if (!target) return;
    const match = currentMatch();
    if (!match) {
      target.innerHTML = `
        <div class="hnl-empty-compact">
          Nenhuma partida aguarda validação agora. Quando uma súmula for enviada, placar, comprovante e status aparecerão aqui.
        </div>`;
      return;
    }
    target.innerHTML = matchCard(match, true);
  }

  function renderMatchSpotlight() {
    const target = $("#matchCenterSpotlight");
    const badge = $("#matchCenterBadge");
    if (!target) return;
    const match = currentMatch();

    if (!match) {
      setBadge(badge, "Sem súmula pendente", "is-closed");
      target.innerHTML = `
        <div class="hnl-empty-compact">
          <div>
            <strong>Nenhuma partida registrada ainda.</strong><br>
            O placar aparecerá quando um capitão concluir a súmula e enviar o comprovante.
          </div>
        </div>`;
      return;
    }

    const status = matchStatus(match);
    setBadge(badge, status.label, status.className === "is-review" ? "is-waiting" : status.className === "is-valid" ? "is-live" : "is-closed");
    target.innerHTML = matchCard(match);
  }

  function pipelineState(match) {
    if (!match) return [false, false, false, false];
    const teams = matchTeams(match);
    const hasTeams = teams.every((team) => teamName(team) !== "A definir");
    const hasParticipants = participantCount(match) > 0;
    const hasSubmission = hasScore(match) || Boolean(proofUrl(match));
    return [hasTeams, hasParticipants, hasSubmission, isValidated(match)];
  }

  function renderPipeline() {
    const target = $("#matchValidationPipeline");
    if (!target) return;

    const match = currentMatch();
    const completed = pipelineState(match);
    const definitions = [
      ["Confronto definido", "Competição, rodada e clubes participantes."],
      ["Escalação confirmada", "Jogadores selecionados pelos capitães."],
      ["Súmula e comprovante", "Placar informado com a imagem do fim da partida."],
      ["Validação oficial", "Organização confere e publica o resultado."]
    ];
    const firstIncomplete = completed.findIndex((value) => !value);

    target.innerHTML = definitions
      .map(([title, description], index) => {
        const className = completed[index] ? "is-complete" : index === firstIncomplete ? "is-active" : "";
        const numberLabel = completed[index] ? "✓" : String(index + 1).padStart(2, "0");
        return `
          <div class="hnl-validation-step ${className}">
            <span class="hnl-step-number">${numberLabel}</span>
            <strong>${esc(title)}</strong>
            <p>${esc(description)}</p>
          </div>`;
      })
      .join("");
  }

  function renderHistory() {
    const target = $("#matchResultsHistory");
    if (!target) return;
    const results = sortByDate(state.results);
    if (!results.length) {
      target.innerHTML = `<div class="hnl-empty-compact">Ainda não há partidas publicadas no histórico desta liga.</div>`;
      return;
    }

    target.innerHTML = results
      .slice(0, 30)
      .map((match) => {
        const [home, away] = matchTeams(match);
        const [homeScore, awayScore] = matchScore(match);
        const status = matchStatus(match);
        const score = homeScore === null || awayScore === null ? "×" : `${homeScore} : ${awayScore}`;
        return `
          <article class="hnl-history-row">
            <div class="hnl-history-team">
              ${image(teamLogo(home), `Escudo ${teamName(home)}`)}
              <span>${esc(teamName(home))}</span>
            </div>
            <strong class="hnl-history-score">${esc(score)}</strong>
            <div class="hnl-history-team is-away">
              <span>${esc(teamName(away))}</span>
              ${image(teamLogo(away), `Escudo ${teamName(away)}`)}
            </div>
            <div class="hnl-history-meta">
              <span class="hnl-match-status ${status.className}">${esc(status.label)}</span><br>
              ${esc(formatDate(matchDate(match)))}
            </div>
          </article>`;
      })
      .join("");
  }

  function renderAll() {
    renderSeasonOverview();
    renderSeasonLeaders();
    renderSeasonAction();
    renderHomeMatch();
    renderMatchSpotlight();
    renderPipeline();
    renderHistory();
    document.documentElement.dataset.hnlSeasonMatchReady = "1";
  }

  async function load() {
    const [overview, eventsPayload, resultsPayload, clubsPayload, rankingPayload, viewer] = await Promise.all([
      api("/api/league/overview"),
      api("/api/events"),
      api("/api/match-results"),
      api("/api/league/clubs"),
      api("/api/league/cafe-ranking"),
      api("/api/league/viewer")
    ]);

    state.overview = overview || {};
    state.events = unwrap(eventsPayload, ["events", "competitions", "items"]);
    if (!state.events.length) state.events = firstArray(overview, ["events", "competitions"]);
    state.results = sortByDate(unwrap(resultsPayload, ["results", "matches", "items", "data"]));
    state.clubs = unwrap(clubsPayload, ["clubs", "teams", "items"]);
    if (!state.clubs.length) state.clubs = firstArray(overview, ["clubs", "teams"]);
    state.ranking = unwrap(rankingPayload, ["ranking", "players", "members", "items"]);
    state.viewer = viewer || null;
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
  } else {
    load();
  }
})();
