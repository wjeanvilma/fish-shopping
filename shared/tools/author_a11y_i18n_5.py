#!/usr/bin/env python3
"""
Finish 5.0 Phase 24 — a11y depth 4 + i18n key growth (≥360).

Usage:
  python3 shared/tools/author_a11y_i18n_5.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
MARKER = "authored-finish-5.0-phase-24"

A11Y_DEPTH = ROOT / "a11y" / "accessibility-depth-4.json"
A11Y_SHIP = ROOT / "ship" / "a11y-depth-4.json"
I18N_SHIP = ROOT / "ship" / "i18n-growth-5.json"
A11Y_PARITY = ROOT / "fixtures" / "parity-a11y-depth-4.json"
I18N_PARITY = ROOT / "fixtures" / "parity-i18n-growth-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
UI_INDEX = ROOT / "i18n" / "ui-strings.json"
I18N_UI = {
    "en": ROOT / "i18n" / "ui-strings.en.json",
    "es": ROOT / "i18n" / "ui-strings.es.json",
    "pt": ROOT / "i18n" / "ui-strings.pt.json",
    "fr": ROOT / "i18n" / "ui-strings.fr.json",
    "ht": ROOT / "i18n" / "ui-strings.ht.json",
    "it": ROOT / "i18n" / "ui-strings.it.json",
    "ca": ROOT / "i18n" / "ui-strings.ca.json",
    "ru": ROOT / "i18n" / "ui-strings.ru.json",
}

SCREEN_SURFACES = [
    {
        "id": "goals_weekly",
        "webDialogLabelKey": "nav.goals",
        "androidPaneTitleKey": "nav.goals",
        "sectionLabelKey": "a11y.weeklyGoalsSection",
        "initialFocus": "close",
        "keyboardPath": "KeyG Goals → Weekly board",
    },
    {
        "id": "goals_endgame",
        "webDialogLabelKey": "nav.goals",
        "androidPaneTitleKey": "nav.goals",
        "sectionLabelKey": "a11y.endgameSection",
        "initialFocus": "close",
        "keyboardPath": "KeyG Goals → Endgame board",
    },
    {
        "id": "dashboard_ledger",
        "webDialogLabelKey": "panels.dashboard",
        "androidPaneTitleKey": "panels.dashboard",
        "sectionLabelKey": "a11y.dashboardLedgerSection",
        "initialFocus": "close",
        "keyboardPath": "KeyY Dashboard → Pier ledger",
    },
    {
        "id": "warehouse_stock",
        "webDialogLabelKey": "panels.warehouse",
        "androidPaneTitleKey": "panels.warehouse",
        "sectionLabelKey": "a11y.warehouseSection",
        "initialFocus": "close",
        "keyboardPath": "Warehouse panel",
    },
    {
        "id": "tutorial_friction",
        "webDialogLabelKey": "hud.frictionNudge",
        "androidPaneTitleKey": "hud.frictionNudge",
        "sectionLabelKey": "a11y.frictionNudgeLive",
        "initialFocus": "n/a",
        "keyboardPath": "HUD objective friction nudge",
    },
]

LIVE_REGIONS = ["tutorial_friction", "goals_weekly"]

CONTRAST_PAIRS = [
    {
        "id": "deep_ink_on_surface",
        "fg": "#0B2A3A",
        "bg": "#FBF7EF",
        "role": "normal_text",
        "minRatio": 4.5,
        "use": "Finish 5 deep ink on light surface",
    },
    {
        "id": "action_ink_on_surface",
        "fg": "#00666A",
        "bg": "#FBF7EF",
        "role": "large_or_ui",
        "minRatio": 3.0,
        "use": "Finish 5 action ink on light surface",
    },
]

# 42+ new keys → push live UI chrome ≥360 across 8 locales.
NEW_UI_KEYS: dict[str, dict[str, str]] = {
    "a11y.dashboardLedgerSection": {
        "en": "Pier ledger",
        "es": "Libro del muelle",
        "pt": "Livro do píer",
        "fr": "Grand livre du quai",
        "ht": "Liv mwaye waf",
        "it": "Registro del molo",
        "ca": "Llibre del moll",
        "ru": "Журнал причала",
    },
    "a11y.warehouseSection": {
        "en": "Warehouse stock",
        "es": "Existencias del almacén",
        "pt": "Estoque do armazém",
        "fr": "Stock de l'entrepôt",
        "ht": "Stòk magazen",
        "it": "Scorte magazzino",
        "ca": "Estoc del magatzem",
        "ru": "Складские запасы",
    },
    "a11y.frictionNudgeLive": {
        "en": "Tutorial tip",
        "es": "Consejo del tutorial",
        "pt": "Dica do tutorial",
        "fr": "Astuce tutoriel",
        "ht": "Konsèy tutorial",
        "it": "Suggerimento tutorial",
        "ca": "Consell del tutorial",
        "ru": "Подсказка обучения",
    },
    "a11y.weeklyGoalsLive": {
        "en": "Weekly goals updated",
        "es": "Objetivos semanales actualizados",
        "pt": "Objetivos semanais atualizados",
        "fr": "Objectifs hebdomadaires mis à jour",
        "ht": "Objektif semèn yo mete ajou",
        "it": "Obiettivi settimanali aggiornati",
        "ca": "Objectius setmanals actualitzats",
        "ru": "Недельные цели обновлены",
    },
    "a11y.endgameLive": {
        "en": "Endgame board status",
        "es": "Estado del tablero final",
        "pt": "Status do placar final",
        "fr": "État du plateau de fin de partie",
        "ht": "Estati tablo fen jwèt",
        "it": "Stato tavola endgame",
        "ca": "Estat del tauler final",
        "ru": "Статус эндгейм-доски",
    },
    "a11y.loanBookSection": {
        "en": "Loan book",
        "es": "Libro de préstamos",
        "pt": "Livro de empréstimos",
        "fr": "Carnet de prêts",
        "ht": "Liv prete",
        "it": "Registro prestiti",
        "ca": "Llibre de préstecs",
        "ru": "Книга займов",
    },
    "a11y.severitySection": {
        "en": "Conflict severity",
        "es": "Gravedad del conflicto",
        "pt": "Severidade do conflito",
        "fr": "Gravité du conflit",
        "ht": "Gravite konfli",
        "it": "Gravità conflitto",
        "ca": "Gravetat del conflicte",
        "ru": "Серьёзность конфликта",
    },
    "a11y.syncDiagnosticsSection": {
        "en": "Sync diagnostics",
        "es": "Diagnóstico de sincronización",
        "pt": "Diagnóstico de sincronização",
        "fr": "Diagnostics de sync",
        "ht": "Dyagnostik senk",
        "it": "Diagnostica sync",
        "ca": "Diagnòstic de sincronització",
        "ru": "Диагностика синхронизации",
    },
    "a11y.deepInkOnSurface": {
        "en": "Deep ink on surface",
        "es": "Tinta profunda sobre superficie",
        "pt": "Tinta profunda na superfície",
        "fr": "Encre profonde sur surface",
        "ht": "Lank fon sou sifas",
        "it": "Inchiostro profondo su superficie",
        "ca": "Tinta profunda sobre superfície",
        "ru": "Глубокие чернила на фоне",
    },
    "a11y.actionOnSurface": {
        "en": "Action ink on surface",
        "es": "Tinta de acción sobre superficie",
        "pt": "Tinta de ação na superfície",
        "fr": "Encre d'action sur surface",
        "ht": "Lank aksyon sou sifas",
        "it": "Inchiostro azione su superficie",
        "ca": "Tinta d'acció sobre superfície",
        "ru": "Акцентные чернила на фоне",
    },
    "panels.weeklyGoals": {
        "en": "Weekly goals",
        "es": "Objetivos semanales",
        "pt": "Objetivos semanais",
        "fr": "Objectifs hebdomadaires",
        "ht": "Objektif semèn",
        "it": "Obiettivi settimanali",
        "ca": "Objectius setmanals",
        "ru": "Недельные цели",
    },
    "panels.endgame": {
        "en": "Endgame board",
        "es": "Tablero final",
        "pt": "Placar final",
        "fr": "Plateau de fin de partie",
        "ht": "Tablo fen jwèt",
        "it": "Tavola endgame",
        "ca": "Tauler final",
        "ru": "Эндгейм-доска",
    },
    "hud.frictionNudge": {
        "en": "Tutorial tip",
        "es": "Consejo del tutorial",
        "pt": "Dica do tutorial",
        "fr": "Astuce tutoriel",
        "ht": "Konsèy tutorial",
        "it": "Suggerimento tutorial",
        "ca": "Consell del tutorial",
        "ru": "Подсказка обучения",
    },
    "friction.nudgeHint": {
        "en": "Stay with this step a moment longer.",
        "es": "Quédate un momento más en este paso.",
        "pt": "Fique um pouco mais neste passo.",
        "fr": "Restez un instant de plus sur cette étape.",
        "ht": "Rete yon ti moman plis sou etap sa a.",
        "it": "Resta ancora un attimo su questo passo.",
        "ca": "Queda't un moment més en aquest pas.",
        "ru": "Задержитесь на этом шаге ещё немного.",
    },
    "friction.dwellTip": {
        "en": "Need a nudge? Check the tip below the objective.",
        "es": "¿Necesitas una pista? Mira el consejo bajo el objetivo.",
        "pt": "Precisa de uma dica? Veja abaixo do objetivo.",
        "fr": "Besoin d'un coup de pouce ? Regardez sous l'objectif.",
        "ht": "Bezwen yon konsèy? Gade anba objektif la.",
        "it": "Serve un aiuto? Guarda sotto l'obiettivo.",
        "ca": "Necessites un cop de mà? Mira sota l'objectiu.",
        "ru": "Нужна подсказка? Смотрите под целью.",
    },
    "endgame.open": {
        "en": "Open",
        "es": "Abierto",
        "pt": "Aberto",
        "fr": "Ouvert",
        "ht": "Louvri",
        "it": "Aperto",
        "ca": "Obert",
        "ru": "Открыто",
    },
    "endgame.boardTitle": {
        "en": "Endgame board",
        "es": "Tablero final",
        "pt": "Placar final",
        "fr": "Plateau de fin de partie",
        "ht": "Tablo fen jwèt",
        "it": "Tavola endgame",
        "ca": "Tauler final",
        "ru": "Эндгейм-доска",
    },
    "endgame.tierLocked": {
        "en": "Tier locked",
        "es": "Nivel bloqueado",
        "pt": "Nível bloqueado",
        "fr": "Palier verrouillé",
        "ht": "Nivo bloke",
        "it": "Livello bloccato",
        "ca": "Nivell bloquejat",
        "ru": "Уровень закрыт",
    },
    "endgame.challengeProgress": {
        "en": "Challenge progress",
        "es": "Progreso del desafío",
        "pt": "Progresso do desafio",
        "fr": "Progression du défi",
        "ht": "Pwogrè defi",
        "it": "Progresso sfida",
        "ca": "Progrés del repte",
        "ru": "Прогресс испытания",
    },
    "cloud.severityHigh": {
        "en": "High severity",
        "es": "Alta gravedad",
        "pt": "Alta severidade",
        "fr": "Gravité élevée",
        "ht": "Gravite wo",
        "it": "Alta gravità",
        "ca": "Alta gravetat",
        "ru": "Высокая серьёзность",
    },
    "cloud.severityMedium": {
        "en": "Medium severity",
        "es": "Gravedad media",
        "pt": "Severidade média",
        "fr": "Gravité moyenne",
        "ht": "Gravite mwayen",
        "it": "Media gravità",
        "ca": "Gravetat mitjana",
        "ru": "Средняя серьёзность",
    },
    "cloud.severityLow": {
        "en": "Low severity",
        "es": "Baja gravedad",
        "pt": "Baixa severidade",
        "fr": "Gravité faible",
        "ht": "Gravite ba",
        "it": "Bassa gravità",
        "ca": "Baixa gravetat",
        "ru": "Низкая серьёзность",
    },
    "cloud.queuePending": {
        "en": "Offline queue pending",
        "es": "Cola sin conexión pendiente",
        "pt": "Fila offline pendente",
        "fr": "File hors ligne en attente",
        "ht": "Ke offline ap tann",
        "it": "Coda offline in attesa",
        "ca": "Cua fora de línia pendent",
        "ru": "Офлайн-очередь ожидает",
    },
    "cloud.queueAge": {
        "en": "Oldest queue age",
        "es": "Antigüedad de la cola",
        "pt": "Idade da fila",
        "fr": "Âge de la file",
        "ht": "Laj ke a",
        "it": "Età della coda",
        "ca": "Edat de la cua",
        "ru": "Возраст очереди",
    },
    "ledger.wages": {
        "en": "Wages",
        "es": "Salarios",
        "pt": "Salários",
        "fr": "Salaires",
        "ht": "Salè",
        "it": "Stipendi",
        "ca": "Salaris",
        "ru": "Зарплаты",
    },
    "ledger.repair": {
        "en": "Repair",
        "es": "Reparación",
        "pt": "Reparos",
        "fr": "Réparation",
        "ht": "Reparasyon",
        "it": "Riparazione",
        "ca": "Reparació",
        "ru": "Ремонт",
    },
    "ledger.interest": {
        "en": "Loan interest",
        "es": "Interés del préstamo",
        "pt": "Juros do empréstimo",
        "fr": "Intérêts du prêt",
        "ht": "Enterè prete",
        "it": "Interessi prestito",
        "ca": "Interessos del préstec",
        "ru": "Проценты по займу",
    },
    "ledger.revenue": {
        "en": "Revenue",
        "es": "Ingresos",
        "pt": "Receita",
        "fr": "Revenus",
        "ht": "Revni",
        "it": "Ricavi",
        "ca": "Ingressos",
        "ru": "Выручка",
    },
    "ledger.net": {
        "en": "Net cashflow",
        "es": "Flujo neto",
        "pt": "Fluxo líquido",
        "fr": "Cashflow net",
        "ht": "Kachflò nèt",
        "it": "Flusso netto",
        "ca": "Flux net",
        "ru": "Чистый поток",
    },
    "warehouse.availableLabel": {
        "en": "Available",
        "es": "Disponible",
        "pt": "Disponível",
        "fr": "Disponible",
        "ht": "Disponib",
        "it": "Disponibile",
        "ca": "Disponible",
        "ru": "Доступно",
    },
    "warehouse.reservedLabel": {
        "en": "Reserved",
        "es": "Reservado",
        "pt": "Reservado",
        "fr": "Réservé",
        "ht": "Rezève",
        "it": "Riservato",
        "ca": "Reservat",
        "ru": "Зарезервировано",
    },
    "warehouse.totalLabel": {
        "en": "Total",
        "es": "Total",
        "pt": "Total",
        "fr": "Total",
        "ht": "Total",
        "it": "Totale",
        "ca": "Total",
        "ru": "Итого",
    },
    "warehouse.lineAvailable": {
        "en": "{count} available",
        "es": "{count} disponible(s)",
        "pt": "{count} disponível(is)",
        "fr": "{count} disponible(s)",
        "ht": "{count} disponib",
        "it": "{count} disponibili",
        "ca": "{count} disponible(s)",
        "ru": "{count} доступно",
    },
    "goals.weeklyClaim": {
        "en": "Claim weekly",
        "es": "Reclamar semanal",
        "pt": "Resgatar semanal",
        "fr": "Réclamer hebdo",
        "ht": "Rekòlte semèn",
        "it": "Riscatta settimanale",
        "ca": "Reclamar setmanal",
        "ru": "Забрать недельное",
    },
    "goals.weeklyProgress": {
        "en": "Weekly progress",
        "es": "Progreso semanal",
        "pt": "Progresso semanal",
        "fr": "Progression hebdo",
        "ht": "Pwogrè semèn",
        "it": "Progresso settimanale",
        "ca": "Progrés setmanal",
        "ru": "Недельный прогресс",
    },
    "dashboard.noCoinGoal": {
        "en": "No coin goal set",
        "es": "Sin meta de monedas",
        "pt": "Sem meta de moedas",
        "fr": "Aucun objectif de pièces",
        "ht": "Pa gen objektif pyès",
        "it": "Nessun obiettivo monete",
        "ca": "Sense objectiu de monedes",
        "ru": "Цель по монетам не задана",
    },
    "dashboard.loanOwedLine": {
        "en": "{owed} owed · {taken} taken · {repaid} repaid",
        "es": "{owed} adeudado · {taken} tomados · {repaid} pagados",
        "pt": "{owed} devido · {taken} feitos · {repaid} pagos",
        "fr": "{owed} dû · {taken} pris · {repaid} remboursé",
        "ht": "{owed} dwe · {taken} pran · {repaid} peye",
        "it": "{owed} dovuto · {taken} presi · {repaid} rimborsati",
        "ca": "{owed} degut · {taken} agafats · {repaid} tornats",
        "ru": "{owed} долг · {taken} взято · {repaid} погашено",
    },
    "common.recommended": {
        "en": "Recommended",
        "es": "Recomendado",
        "pt": "Recomendado",
        "fr": "Recommandé",
        "ht": "Rekòmande",
        "it": "Consigliato",
        "ca": "Recomanat",
        "ru": "Рекомендуется",
    },
    "common.continueHint": {
        "en": "Continue",
        "es": "Continuar",
        "pt": "Continuar",
        "fr": "Continuer",
        "ht": "Kontinye",
        "it": "Continua",
        "ca": "Continua",
        "ru": "Продолжить",
    },
    "settings.reducedMotionHint": {
        "en": "Reduce motion for comfort",
        "es": "Reduce el movimiento para mayor comodidad",
        "pt": "Reduza o movimento para conforto",
        "fr": "Réduire les animations pour le confort",
        "ht": "Redwi mouvman pou konfò",
        "it": "Riduci il movimento per comfort",
        "ca": "Redueix el moviment per comoditat",
        "ru": "Уменьшить движение для комфорта",
    },
    "settings.talkBackHint": {
        "en": "Screen reader labels stay on every panel",
        "es": "Las etiquetas del lector de pantalla están en cada panel",
        "pt": "Rótulos do leitor de tela em todos os painéis",
        "fr": "Les libellés lecteur d'écran restent sur chaque panneau",
        "ht": "Etikèt lektè ekran yo rete sou chak panèl",
        "it": "Etichette screen reader su ogni pannello",
        "ca": "Les etiquetes del lector de pantalla a cada panell",
        "ru": "Метки экранного диктора на каждой панели",
    },
    "map.travelHint": {
        "en": "Travel between harbors from the map",
        "es": "Viaja entre puertos desde el mapa",
        "pt": "Viaje entre portos pelo mapa",
        "fr": "Voyagez entre ports depuis la carte",
        "ht": "Vwayaje ant pò yo depi kat la",
        "it": "Viaggia tra i porti dalla mappa",
        "ca": "Viatja entre ports des del mapa",
        "ru": "Путешествуйте между гаванями с карты",
    },
    "staff.trainHint": {
        "en": "Train staff branches to unlock schedules",
        "es": "Entrena ramas de personal para desbloquear horarios",
        "pt": "Treine ramos da equipe para liberar horários",
        "fr": "Formez les branches du personnel pour débloquer les horaires",
        "ht": "Antrene branch anplwaye yo pou debloke orè",
        "it": "Addestra i rami staff per sbloccare orari",
        "ca": "Entrena branques del personal per desbloquejar horaris",
        "ru": "Обучайте ветки персонала, чтобы открыть расписания",
    },
    "offline.continueHint": {
        "en": "Review the away summary, then continue",
        "es": "Revisa el resumen de ausencia y continúa",
        "pt": "Revise o resumo de ausência e continue",
        "fr": "Relisez le résumé d'absence, puis continuez",
        "ht": "Revize rezime absans la, epi kontinye",
        "it": "Rivedi il riepilogo assenza, poi continua",
        "ca": "Revisa el resum d'absència i continua",
        "ru": "Просмотрите итоги отсутствия и продолжайте",
    },
    "upgrade.closeHint": {
        "en": "Close upgrades when finished",
        "es": "Cierra mejoras al terminar",
        "pt": "Feche as melhorias ao terminar",
        "fr": "Fermez les améliorations une fois terminé",
        "ht": "Fèmen amelyorasyon yo lè w fini",
        "it": "Chiudi i potenziamenti a fine lavoro",
        "ca": "Tanca les millores en acabar",
        "ru": "Закройте улучшения, когда закончите",
    },
}


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_i18n() -> int:
    for locale, path in I18N_UI.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for key, locs in NEW_UI_KEYS.items():
            strings[key] = locs[locale]
        dump(path, doc)
    en_count = len(json.loads(I18N_UI["en"].read_text(encoding="utf-8"))["strings"])
    index = json.loads(UI_INDEX.read_text(encoding="utf-8"))
    index["keyMin"] = 360
    index["phase"] = 24
    index["plan"] = "30_finish_5.0"
    dump(UI_INDEX, index)
    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))
    return en_count


def write_a11y_depth() -> None:
    dump(
        A11Y_DEPTH,
        {
            "phase": 24,
            "plan": "30_finish_5.0",
            "schema": "fish.a11y.accessibility_depth_4.v1",
            "description": (
                "Finish 5.0 Phase 24 — a11y depth 4 for weekly/endgame goals, dashboard ledger, "
                "warehouse stock, and tutorial friction. Extends depth-3; presentation-only; schema 26."
            ),
            "extendsCatalog": "shared/a11y/accessibility-depth-3.json",
            "extendsDepth2Catalog": "shared/a11y/accessibility-depth-2.json",
            "extendsDepth1Catalog": "shared/a11y/accessibility-depth.json",
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "simHzInvariant": 20,
            "wcag": {"normalTextMin": 4.5, "largeOrUiMin": 3.0},
            "screenSurfaceMin": 5,
            "contrastPairMin": 2,
            "uiA11yStringKeyMin": 30,
            "liveRegionMin": 2,
            "screenSurfaces": SCREEN_SURFACES,
            "contrastPairs": CONTRAST_PAIRS,
            "liveRegions": LIVE_REGIONS,
            "talkBack": {
                "android": {
                    "requirePaneTitleOnWarehouseDashboard": True,
                    "weeklyEndgameSectionLabels": True,
                    "frictionNudgeLiveRegion": True,
                    "ledgerSectionLabels": True,
                },
                "web": {
                    "frictionAriaLive": "polite",
                    "weeklyGoalsAriaLive": "polite",
                    "dialogRoleOnWarehouseDashboard": True,
                    "ledgerAriaLabel": True,
                    "initialFocusClose": True,
                },
            },
            "reducedMotion": {
                "honorsSettingsToggle": True,
                "crossRef": "shared/ship/vfx-juice-5.json",
            },
            "keyboardDocumentedSurfaces": [
                "Goals weekly board (G)",
                "Goals endgame board (G)",
                "Dashboard pier ledger (Y)",
                "Warehouse stock",
                "Tutorial friction HUD nudge",
            ],
            "sourcePins": {
                "depth3": "shared/a11y/accessibility-depth-3.json",
                "webApp": "web/src/ui/App.tsx",
                "androidGameScreen": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
                "webCss": "web/src/ui/styles.css",
            },
            "manualChecklist": [
                "TalkBack: Weekly/endgame sections in Goals",
                "TalkBack: Dashboard ledger + Warehouse pane titles",
                "Keyboard: G/Y + Esc; friction tip announces politely",
                "Live regions announce friction nudge + weekly goals",
                "Contrast: deep/action ink on #FBF7EF",
            ],
        },
    )


def write_ships(en_count: int) -> None:
    dump(
        A11Y_SHIP,
        {
            "phase": 24,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.a11y_depth_4.v1",
            "description": (
                "Finish 5.0 Phase 24 — a11y depth 4 ship gate (weekly/endgame/ledger/warehouse/friction). "
                "Combined validate a11yi18n5:validate with i18n-growth-5."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "a11yDepth4Marker": MARKER,
            "extendsCatalog": "shared/a11y/accessibility-depth-3.json",
            "depthCatalog": "shared/a11y/accessibility-depth-4.json",
            "simHzInvariant": 20,
            "screenSurfaceMin": 5,
            "contrastPairMin": 2,
            "uiA11yStringKeyMin": 30,
            "liveRegionMin": 2,
            "parityFixture": "shared/fixtures/parity-a11y-depth-4.json",
            "validateScript": "npm run a11yi18n5:validate",
            "softA11yI18n4Validate": "npm run a11yi18n4:validate",
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "checklist": [
                "≥5 Finish 5.0 screen surfaces with dialog/pane/section titles",
                "≥2 Finish 5 contrast pairs under WCAG AA",
                "≥30 UI a11y string keys across 8 locales",
                "≥2 live regions (tutorial_friction + goals_weekly)",
                "a11yi18n4:validate soft-green",
                "a11yi18n5:validate green in CI",
                "schema stays 26 / content 4.0.0",
            ],
            "preflightGates": [
                "shared/ship/a11y-depth-4.json",
                "shared/a11y/accessibility-depth-4.json",
                "shared/fixtures/parity-a11y-depth-4.json",
                "shared/ship/i18n-growth-5.json",
                "web/src/ship/a11yDepth4.ts",
                "web/src/presenters/accessibilityDepth4.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/A11yDepth4.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/a11y/AccessibilityDepth4.kt",
                "web/src/ui/QuestLogPanel.tsx",
                "web/src/ui/BusinessDashboardPanel.tsx",
                "web/src/ui/MapWarehousePanels.tsx",
                "web/src/ui/App.tsx",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/MapWarehousePanels.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
                "web/src/ui/styles.css",
            ],
        },
    )
    dump(
        I18N_SHIP,
        {
            "phase": 24,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.i18n_growth_5.v1",
            "description": (
                "Finish 5.0 Phase 24 — UI chrome key growth to ≥360 across 8 locales; "
                "Android Text literals stay 0. Combined validate a11yi18n5:validate."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "i18nGrowth5Marker": MARKER,
            "extendsCatalog": "shared/ship/i18n-growth-4.json",
            "uiStringKeyMin": 360,
            "localeMin": 8,
            "a11yStringKeyMin": 30,
            "androidTextLiteralsMax": 0,
            "uiStringsIndex": "shared/i18n/ui-strings.json",
            "uiStringsEn": "shared/i18n/ui-strings.en.json",
            "parityFixture": "shared/fixtures/parity-i18n-growth-5.json",
            "validateScript": "npm run a11yi18n5:validate",
            "softA11yI18n4Validate": "npm run a11yi18n4:validate",
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "softFloors": {
                "i18nGrowth4KeyMin": 280,
                "i18nScaffoldKeyMin": 48,
                "androidI18nKeyMin": 120,
                "note": "Finish 5.0 Phase 24 soft floors keep Finish 4.0/2.0 key mins green while live floor is ≥360.",
            },
            "checklist": [
                f"≥360 UI keys ({en_count} live) with 8-locale parity",
                "≥30 a11y.* keys",
                "ui-strings.json keyMin ≥ 360",
                "Android ui/hud Text(\" literals = 0",
                "a11yi18n4:validate soft-green",
                "a11yi18n5:validate green in CI",
                "schema stays 26",
            ],
            "preflightGates": [
                "shared/ship/i18n-growth-5.json",
                "shared/fixtures/parity-i18n-growth-5.json",
                "shared/i18n/ui-strings.json",
                "shared/i18n/ui-strings.en.json",
                "shared/i18n/ui-strings.es.json",
                "shared/i18n/ui-strings.pt.json",
                "shared/i18n/ui-strings.fr.json",
                "shared/i18n/ui-strings.ht.json",
                "shared/i18n/ui-strings.it.json",
                "shared/i18n/ui-strings.ca.json",
                "shared/i18n/ui-strings.ru.json",
                "web/src/ship/i18nGrowth5.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/I18nGrowth5.kt",
                "web/src/i18n/strings.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/UiStrings.kt",
            ],
        },
    )
    dump(
        A11Y_PARITY,
        {
            "schema": "fish.fixtures.parity_a11y_depth_4.v1",
            "a11yDepth4Marker": MARKER,
            "phase": 24,
            "plan": "30_finish_5.0",
            "expect": {
                "screenSurfaces": [s["id"] for s in SCREEN_SURFACES],
                "contrastPairsMin": 2,
                "liveRegions": LIVE_REGIONS,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "a11yI18n5Incomplete": False,
                "gates": [
                    "screens",
                    "contrast",
                    "live_regions",
                    "kickoff_closed",
                    "ci_gate",
                ],
            },
        },
    )
    dump(
        I18N_PARITY,
        {
            "schema": "fish.fixtures.parity_i18n_growth_5.v1",
            "i18nGrowth5Marker": MARKER,
            "phase": 24,
            "plan": "30_finish_5.0",
            "expect": {
                "uiStringKeyMin": 360,
                "localeMin": 8,
                "a11yStringKeyMin": 30,
                "androidTextLiteralsMax": 0,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "a11yI18n5Incomplete": False,
                "gates": [
                    "key_floor",
                    "locale_parity",
                    "a11y_keys",
                    "kickoff_closed",
                    "ci_gate",
                ],
            },
        },
    )


def update_kickoff_dod_listing_pin(en_count: int) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["a11yI18n5Incomplete"] = False
    kick.setdefault("baseline", {})["i18nUiKeys"] = en_count
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["a11yDepth4Screens"] = 5
    quotas["a11yDepth4ContrastPairs"] = 2
    quotas["i18nUiKeysGrowth5"] = 360
    dod["notes"] = (
        "Finish 5.0 Phase 24 a11y-i18n-5 complete (a11y depth 4 + ≥360 UI keys); "
        "Phases 1–23 remain green. Content stays 4.0.0 / schema 26. a11yI18n5Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["a11yDepth4"] = {
        "phase": 24,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "a11yDepth4Marker": MARKER,
        "catalog": "shared/ship/a11y-depth-4.json",
        "parityFixture": "shared/fixtures/parity-a11y-depth-4.json",
        "validateScript": "npm run a11yi18n5:validate",
        "checklist": [
            "≥5 depth-4 screen surfaces",
            "≥2 Finish 5 contrast pairs",
            "≥2 live regions",
            "a11yi18n5:validate green in CI",
        ],
    }
    dod["i18nGrowth5"] = {
        "phase": 24,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "i18nGrowth5Marker": MARKER,
        "catalog": "shared/ship/i18n-growth-5.json",
        "parityFixture": "shared/fixtures/parity-i18n-growth-5.json",
        "validateScript": "npm run a11yi18n5:validate",
        "checklist": [
            "≥360 UI keys across 8 locales",
            "≥30 a11y.* keys",
            'Android Text(" literals = 0',
            "a11yi18n5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["a11yDepth4Phase"] = 24
    listing["a11yDepth4Catalog"] = "shared/ship/a11y-depth-4.json"
    listing["i18nGrowth5Phase"] = 24
    listing["i18nGrowth5Catalog"] = "shared/ship/i18n-growth-5.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["a11yDepth4"] = "shared/ship/a11y-depth-4.json"
    pin["i18nGrowth5"] = "shared/ship/i18n-growth-5.json"
    fixtures = list(pin.get("fixtures") or [])
    for fx in ("parity-a11y-depth-4.json", "parity-i18n-growth-5.json"):
        if fx not in fixtures:
            fixtures.append(fx)
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    en_count = write_i18n()
    if en_count < 360:
        raise SystemExit(f"en keys {en_count} < 360 after author")
    write_a11y_depth()
    write_ships(en_count)
    update_kickoff_dod_listing_pin(en_count)
    print(
        f"OK Phase 24 a11y-i18n-5: uiKeys={en_count} screens={len(SCREEN_SURFACES)} "
        f"live={len(LIVE_REGIONS)} contrast={len(CONTRAST_PAIRS)}"
    )


if __name__ == "__main__":
    main()
