// ==UserScript==
// @name         Cishen Minerv6 - Lyra 自动挖矿
// @namespace    cishen-minerv6-local
// @version      0.1.1
// @description  V6 收益规划、单步/自动挖矿；使用 Lyra 原生协议接口
// @match        *://www.wanyiwan.top/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// ==/UserScript==

(function () {
let minerv6Planner, module;
/*
 * Pure JavaScript port of StandaloneMiner._generate_action_plan.
 *
 * The userscript can load this file before its transport/UI code.  The
 * planner does not read or mutate the supplied grid/inventory and has no
 * browser, network, or Node dependencies.
 */
(function exposeMinerv6Planner(global) {
    "use strict";

    const T_PICKAXES = [11070001, 11070011];
    const T_BOMB = 11070003;
    const T_DRILL = 11070002;

    const PROFIT_MAP = Object.freeze({
        11080001: 100,
        11080002: 100,
        11080003: 100,
        11080004: 100,
        11080005: 350,
        11080006: 1000,
        11080007: 350,
        11080008: 1000,
        11080009: 100,
        11080010: 100,
        11080011: 100,
        11080012: 100,
        11080013: 80,
        11080014: 240,
        11080015: 600,
        11080016: 480,
        11080017: 100,
        11080018: 100,
        11080019: 350,
        11080020: 100,
        11080021: 160,
        11080035: 100,
        11070001: 150,
        11070011: 300,
    });

    const ITEM_NAMES = Object.freeze({
        11080001: "随机宝箱",
        11080002: "固定宝箱",
        11080003: "自选宝箱",
        11080004: "铜矿",
        11080005: "银矿",
        11080006: "金矿",
        11080007: "银矿堆",
        11080008: "金矿块",
        11080009: "宝石",
        11080010: "宝石",
        11080011: "钻石",
        11080012: "宝石堆",
        11080013: "铁镐x1",
        11080014: "铁镐x3",
        11080015: "炸弹",
        11080016: "钻头",
        11080017: "宝箱",
        11080018: "蓝水晶",
        11080019: "银矿块",
        11080020: "随机宝石",
        11080021: "随机铁镐",
        11080035: "钻石",
        11070001: "铁镐150",
        11070011: "黄金镐头",
    });

    const PICKAXE_ENERGY_COST = 40;
    const TOOL_SAVED_ENERGY_WEIGHT = 0.1;
    const DRILL_SAVED_ENERGY_WEIGHT = 1.0;
    const DRILL_MIN_SAVED_ENERGY_RATIO = 1.0;
    const BOMB_MIN_SAVED_ENERGY_RATIO = 1.0;

    const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

    function numberOr(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function integerOr(value, fallback) {
        const number = numberOr(value, fallback);
        return Number.isFinite(number) ? Math.trunc(number) : fallback;
    }

    function tileValue(tile, key, fallback) {
        if (!tile || typeof tile !== "object") return fallback;
        if (hasOwn(tile, String(key))) return tile[String(key)];
        if (hasOwn(tile, key)) return tile[key];
        return fallback;
    }

    function isTile(value) {
        return Boolean(value && typeof value === "object"
            && hasOwn(value, "0") && hasOwn(value, "1"));
    }

    function pointKey(row, col) {
        return `${row},${col}`;
    }

    function pointFromKey(key) {
        const split = String(key).split(",");
        return [Number(split[0]), Number(split[1])];
    }

    function neighbors(point) {
        const row = point[0];
        const col = point[1];
        // Keep the same order as Python's [(0,1), (0,-1), (1,0), (-1,0)].
        return [
            [row, col + 1],
            [row, col - 1],
            [row + 1, col],
            [row - 1, col],
        ];
    }

    function bombArea(row, col) {
        row = numberOr(row, 0);
        col = numberOr(col, 0);
        const result = [];
        for (let dr = -2; dr <= 2; dr += 1) {
            for (let dc = -2; dc <= 2; dc += 1) {
                if (Math.abs(dr) + Math.abs(dc) <= 2) {
                    result.push([row + dr, col + dc]);
                }
            }
        }
        return result;
    }

    function drillArea(row, col, wMin, wMax) {
        row = numberOr(row, 0);
        col = numberOr(col, 0);
        wMin = integerOr(wMin, 0);
        wMax = integerOr(wMax, wMin);
        const clear = [];
        const unlock = [];
        for (let currentRow = wMin; currentRow <= wMax; currentRow += 1) {
            clear.push([currentRow, col]);
        }
        clear.push([wMax, col - 1]);
        clear.push([wMax, col + 1]);

        for (let currentRow = wMin; currentRow <= wMax; currentRow += 1) {
            unlock.push([currentRow, col - 1]);
            unlock.push([currentRow, col + 1]);
        }
        // Python returns (clear, unlock); an array is the natural JS shape
        // for that two-value result and is the public userscript contract.
        return [clear, unlock];
    }

    /*
     * The live packet grid is normally an object keyed by a string tile id.
     * Userscripts commonly pass Object.entries(grid), so accept that form as
     * well as Maps and a few equivalent array/object wrappers.  The planner
     * itself only relies on tile["0"] (depth), tile["1"] (column), and the
     * numeric-string tile fields copied by normalizeGrid.
     */
    function gridEntries(grid) {
        if (!grid) return [];
        if (grid instanceof Map) return Array.from(grid.entries());
        if (!Array.isArray(grid) && typeof grid === "object") {
            return Object.entries(grid);
        }
        if (!Array.isArray(grid)) return [];

        const entries = [];
        for (let index = 0; index < grid.length; index += 1) {
            const entry = grid[index];
            if (Array.isArray(entry) && entry.length >= 2 && isTile(entry[1])) {
                entries.push([entry[0], entry[1]]);
                continue;
            }
            if (!entry || typeof entry !== "object") continue;
            if (isTile(entry.tile)) {
                entries.push([
                    entry.key !== undefined ? entry.key
                        : (entry.id !== undefined ? entry.id : index),
                    entry.tile,
                ]);
                continue;
            }
            if (isTile(entry.value)) {
                entries.push([
                    entry.key !== undefined ? entry.key
                        : (entry.id !== undefined ? entry.id : index),
                    entry.value,
                ]);
                continue;
            }
            const ownKeys = Object.keys(entry);
            if (ownKeys.length === 1 && isTile(entry[ownKeys[0]])) {
                entries.push([ownKeys[0], entry[ownKeys[0]]]);
                continue;
            }
            // Also support an array of raw tile objects.  Their packet key is
            // not used by the planner, while tile.id remains available on the
            // copied tile just as obj.get("id") is in Python.
            if (isTile(entry)) entries.push([index, entry]);
        }
        return entries;
    }

    function normalizeGrid(grid) {
        const normalized = new Map();
        for (const entry of gridEntries(grid)) {
            const sourceTile = entry[1];
            if (!sourceTile || typeof sourceTile !== "object") continue;
            const row = integerOr(tileValue(sourceTile, 0, NaN), NaN);
            const col = integerOr(tileValue(sourceTile, 1, NaN), NaN);
            if (!Number.isFinite(row) || !Number.isFinite(col)) continue;
            const key = pointKey(row, col);
            normalized.set(key, {
                row,
                col,
                tile: { ...sourceTile },
            });
        }
        return normalized;
    }

    function normalizeInventory(inventory) {
        const normalized = new Map();
        let entries;
        if (inventory instanceof Map) {
            entries = Array.from(inventory.entries());
        } else if (Array.isArray(inventory)) {
            entries = inventory
                .filter((entry) => Array.isArray(entry) && entry.length >= 2)
                .map((entry) => [entry[0], entry[1]]);
        } else if (inventory && typeof inventory === "object") {
            entries = Object.entries(inventory);
        } else {
            entries = [];
        }
        for (const [itemId, quantity] of entries) {
            const id = integerOr(itemId, NaN);
            if (!Number.isFinite(id)) continue;
            normalized.set(id, numberOr(quantity, 0));
        }
        return normalized;
    }

    function rewardValue(rewardId) {
        return hasOwn(PROFIT_MAP, rewardId) ? PROFIT_MAP[rewardId] : 0;
    }

    function rewardName(rewardId) {
        return hasOwn(ITEM_NAMES, rewardId) ? ITEM_NAMES[rewardId] : null;
    }

    function hasItemName(rewardId) {
        return hasOwn(ITEM_NAMES, rewardId);
    }

    function mapValueOr(map, key, fallback) {
        const value = map.get(key);
        return value === undefined ? fallback : value;
    }

    function plan(options) {
        const config = options || {};
        // The userscript's public default is conservative: it does not
        // silently spend golden pickaxes unless explicitly requested.
        const noGold = config.noGold === undefined ? true : Boolean(config.noGold);
        const currentBaseInput = numberOr(config.baseDepth, 0);
        let currentBase = currentBaseInput;
        const normalizedGrid = normalizeGrid(config.grid);
        const nodes = new Map();
        let maxDepth = 0;

        for (const [key, entry] of normalizedGrid.entries()) {
            const tile = entry.tile;
            const row = entry.row;
            const col = entry.col;
            maxDepth = Math.max(maxDepth, row);
            let reward = integerOr(tileValue(tile, 3, 0), 0);
            const nodeType = integerOr(tileValue(tile, 2, 1), 1);
            // Python uses obj.get("6") == 1.  Packet values are numbers;
            // accepting the equivalent string also helps raw JSON callers.
            const serverUnlocked = tileValue(tile, 6, 0) === 1
                || tileValue(tile, 6, 0) === "1";
            if (serverUnlocked) reward = 0;
            const tileReward = integerOr(tileValue(tile, 5, 0), 0);
            if ((nodeType === 3 || nodeType === 1) && tileReward >= 11080000) {
                reward = tileReward;
            }
            nodes.set(key, {
                pos: [row, col],
                type: nodeType,
                reward,
                durability: numberOr(tileValue(tile, 4, 1), 1),
                id: tile.id,
                digged: false,
                unlocked: serverUnlocked,
            });
        }

        const inventory = normalizeInventory(config.inventory);
        const simUseGold = Boolean(config.goldOnly);
        const toolValues = {
            bomb: 330,
            drill: 370,
        };
        const planActions = [];

        // There is no meaningful execution path for this contradictory mode;
        // return the normal result shape so callers can treat it as a stop.
        if (simUseGold && noGold) return { actions: [], maxDepth };

        const getInventory = (itemId) => inventory.get(itemId) || 0;
        const addSeed = (key) => seeds.add(key);
        const getNode = (point) => nodes.get(pointKey(point[0], point[1]));
        const getNodeByKey = (key) => nodes.get(key);
        const propagateUnlock = (point) => {
            for (const adjacent of neighbors(point)) {
                const adjacentNode = getNode(adjacent);
                if (adjacentNode) adjacentNode.unlocked = true;
            }
        };

        // 2. Find the initial connected region from server-unlocked empty
        // tiles at or above the current base depth.
        const seeds = new Set();
        const seedQueue = [];
        let seedHead = 0;
        for (const [key, node] of nodes.entries()) {
            if (node.type === 1 && node.unlocked && node.pos[0] <= currentBase) {
                if (!node.digged) node.digged = true;
                seeds.add(key);
                seedQueue.push(key);
            }
        }
        while (seedHead < seedQueue.length) {
            const currentKey = seedQueue[seedHead++];
            const currentNode = getNodeByKey(currentKey);
            for (const adjacent of neighbors(currentNode.pos)) {
                const adjacentKey = pointKey(adjacent[0], adjacent[1]);
                const adjacentNode = getNodeByKey(adjacentKey);
                if (adjacentNode && !adjacentNode.digged
                    && adjacentNode.type === 1 && adjacentNode.unlocked
                    && adjacentNode.pos[0] <= currentBase) {
                    adjacentNode.digged = true;
                    seeds.add(adjacentKey);
                    seedQueue.push(adjacentKey);
                }
            }
        }
        for (const seedKey of seeds) propagateUnlock(getNodeByKey(seedKey).pos);

        let iteration = 0;
        // A malformed or partially synchronized grid can otherwise keep the
        // empty-tile simulation cycling forever.  Normal maps finish in far
        // fewer turns; this remains finite while allowing high durability.
        const maxIterations = Math.max(1000, nodes.size * 200);
        while (currentBase < maxDepth - 1 && iteration < maxIterations) {
            iteration += 1;
            const wMin = currentBase - 5;
            const wMax = currentBase + 1;
            const costs = new Map();
            const parents = new Map();
            for (const key of nodes.keys()) {
                costs.set(key, 999999);
                parents.set(key, null);
            }

            // Include every prior seed at or above the current viewport base.
            let simSeeds = Array.from(seeds)
                .filter((key) => getNodeByKey(key).pos[0] <= wMax);
            if (simSeeds.length === 0) {
                simSeeds = Array.from(nodes.entries())
                    .filter(([, node]) => node.digged
                        && node.pos[0] >= wMin && node.pos[0] <= wMax)
                    .map(([key]) => key);
            }
            const toolSpots = simSeeds
                .filter((key) => {
                    const row = getNodeByKey(key).pos[0];
                    return row >= wMin && row <= wMax;
                })
                .map((key) => getNodeByKey(key).pos);

            const queue = [];
            let queueHead = 0;
            for (const seedKey of simSeeds) {
                costs.set(seedKey, 0);
                queue.push(seedKey);
            }
            while (queueHead < queue.length) {
                const currentKey = queue[queueHead++];
                const currentCost = costs.get(currentKey);
                const currentNode = getNodeByKey(currentKey);
                for (const adjacent of neighbors(currentNode.pos)) {
                    const adjacentKey = pointKey(adjacent[0], adjacent[1]);
                    const adjacentNode = getNodeByKey(adjacentKey);
                    if (!adjacentNode) continue;
                    const moveCost = adjacentNode.type === 1
                        ? 0 : adjacentNode.durability * PICKAXE_ENERGY_COST;
                    const newCost = currentCost + moveCost;
                    if (newCost < costs.get(adjacentKey)) {
                        costs.set(adjacentKey, newCost);
                        parents.set(adjacentKey, currentKey);
                        queue.push(adjacentKey);
                    }
                }
            }

            const candidates = [];
            for (const [key, node] of nodes.entries()) {
                if (node.pos[0] < wMin || node.digged) continue;
                const pathCost = mapValueOr(costs, key, 999999);
                if (pathCost >= 999999) continue;
                const pathRoi = rewardValue(node.reward) - pathCost;
                if (pathRoi > 0) {
                    candidates.push({
                        type: "path",
                        pos: [...node.pos],
                        roi: pathRoi,
                        row: node.pos[0],
                        target: [...node.pos],
                    });
                }
            }

            const toolOrder = [
                ["bomb", T_BOMB],
                ["drill", T_DRILL],
            ];
            for (const [toolKey, toolId] of toolOrder) {
                // The browser UI treats these flags as strict tool disables.
                // Python's standalone entry point used a cost penalty here;
                // this is intentionally a documented integration difference.
                if ((toolKey === "bomb" && config.noBomb)
                    || (toolKey === "drill" && config.noDrill)) continue;
                if (getInventory(toolId) <= 0) continue;
                for (const spot of toolSpots) {
                    let clearPoints;
                    let unlockPoints;
                    if (toolKey === "drill") {
                        [clearPoints, unlockPoints] = drillArea(spot[0], spot[1], wMin, wMax);
                    } else {
                        clearPoints = bombArea(spot[0], spot[1]);
                        unlockPoints = [];
                    }
                    let valueRewards = 0;
                    let savedEnergy = 0;
                    for (const point of clearPoints) {
                        const node = getNode(point);
                        if (!node || node.digged) continue;
                        valueRewards += rewardValue(node.reward);
                        savedEnergy += node.durability * PICKAXE_ENERGY_COST;
                    }

                    let savedEnergyWeight = TOOL_SAVED_ENERGY_WEIGHT;
                    if (toolKey === "drill") {
                        const minSavedEnergy = toolValues.drill * DRILL_MIN_SAVED_ENERGY_RATIO;
                        if (savedEnergy < minSavedEnergy) continue;
                        savedEnergyWeight = DRILL_SAVED_ENERGY_WEIGHT;
                    } else {
                        const minSavedEnergy = toolValues.bomb * BOMB_MIN_SAVED_ENERGY_RATIO;
                        if (savedEnergy < minSavedEnergy) continue;
                    }

                    const toolRoi = valueRewards
                        + (savedEnergy * savedEnergyWeight) - toolValues[toolKey];
                    if (toolRoi <= 0) continue;
                    const toolRewardNames = [];
                    const toolRewardIds = [];
                    for (const point of clearPoints) {
                        const node = getNode(point);
                        if (node && hasItemName(node.reward)) {
                            toolRewardNames.push(ITEM_NAMES[node.reward]);
                            toolRewardIds.push(node.reward);
                        }
                    }
                    candidates.push({
                        type: "tool",
                        tool: toolKey,
                        id: toolId,
                        pos: [...spot],
                        roi: toolRoi,
                        saved_energy: savedEnergy,
                        reward_value: valueRewards,
                        row: spot[0],
                        rewards: toolRewardNames,
                        reward_ids: toolRewardIds,
                    });
                    // unlockPoints is applied only after the action is chosen;
                    // retain the local variable to mirror the Python branches.
                    void unlockPoints;
                }
            }

            candidates.sort((left, right) => {
                const rowDifference = left.row - right.row;
                return rowDifference || (right.roi - left.roi);
            });

            let bestTargetKey = null;
            let bestPathRoi = -999999;
            let bestAction = null;
            let bestScore = -999999;

            // A claim action has absolute priority over all path/tool actions.
            for (const [key, node] of nodes.entries()) {
                if (node.digged && node.reward > 0
                    && node.pos[0] >= wMin && node.pos[0] <= wMax
                    && node.unlocked) {
                    const value = rewardValue(node.reward);
                    if (value > bestScore) {
                        bestScore = value;
                        bestAction = {
                            type: "get",
                            pos: [...node.pos],
                            reward_id: node.reward,
                            score: value,
                        };
                    }
                }
            }

            if (!bestAction && candidates.length > 0) {
                const top = candidates[0];
                bestScore = top.roi;
                if (top.type === "tool") {
                    bestAction = {
                        type: "tool",
                        tool: top.tool,
                        id: top.id,
                        pos: [...top.pos],
                        score: top.roi,
                        rewards: [...top.rewards],
                        reward_ids: [...top.reward_ids],
                    };
                } else {
                    bestTargetKey = pointKey(top.target[0], top.target[1]);
                    bestPathRoi = top.roi;
                }
            }

            function pathToTarget(targetKey) {
                let currentKey = targetKey;
                const path = [currentKey];
                while (parents.get(currentKey)) {
                    currentKey = parents.get(currentKey);
                    if (getNodeByKey(currentKey).digged) break;
                    path.push(currentKey);
                }
                return path;
            }

            const NO_PICKAXE = Symbol("no pickaxe in simulated inventory");

            function pickaxeId() {
                for (const pickaxeIdValue of T_PICKAXES) {
                    if (simUseGold && pickaxeIdValue === 11070001) continue;
                    if (noGold && pickaxeIdValue === 11070011) continue;
                    if (getInventory(pickaxeIdValue) > 0) return pickaxeIdValue;
                }
                return NO_PICKAXE;
            }

            function createDigAction(targetKey, score, searchMode) {
                const path = pathToTarget(targetKey);
                let stepKey = null;
                for (let index = path.length - 1; index >= 0; index -= 1) {
                    const candidateNode = getNodeByKey(path[index]);
                    if (candidateNode.type !== 1) {
                        stepKey = path[index];
                        break;
                    }
                }
                if (stepKey === null) {
                    const targetNode = getNodeByKey(targetKey);
                    targetNode.digged = true;
                    addSeed(targetKey);
                    propagateUnlock(targetNode.pos);
                    return null;
                }

                const node = getNodeByKey(stepKey);
                const selectedPickaxe = pickaxeId();
                if (selectedPickaxe === NO_PICKAXE) return NO_PICKAXE;
                const action = {
                    type: "dig",
                    pos: [...node.pos],
                    tool_id: selectedPickaxe,
                    score,
                    reward_name: (!searchMode && node.reward > 0 && node.durability === 1)
                        ? rewardName(node.reward) : (searchMode ? "向下搜索" : null),
                    target: [...getNodeByKey(targetKey).pos],
                    target_type: node.type,
                    reward_id: (!searchMode && node.reward > 0 && node.durability === 1)
                        ? node.reward : 0,
                };
                return action;
            }

            // Path-based digging action.  This intentionally keeps the Python
            // condition: a zero-score path does not enter the search fallback.
            if ((!bestAction || (bestAction.type !== "get" && bestAction.type !== "tool"))
                && bestTargetKey !== null) {
                bestAction = createDigAction(bestTargetKey, bestPathRoi, false);
                if (bestAction === NO_PICKAXE) break;
                if (bestAction) bestScore = bestPathRoi;
                else continue;
            }

            // When the visible region has no profitable action, keep opening
            // the deepest reachable point so a later viewport can be planned.
            if (bestScore < 0) {
                let deepestKey = null;
                let deepestRow = -1;
                for (const [key, cost] of costs.entries()) {
                    const node = getNodeByKey(key);
                    if (cost < 999999 && !node.digged) {
                        if (node.pos[0] > deepestRow) {
                            deepestRow = node.pos[0];
                            deepestKey = key;
                        } else if (node.pos[0] === deepestRow && deepestKey !== null) {
                            const currentDistance = Math.abs(node.pos[1] - 5);
                            const previousDistance = Math.abs(getNodeByKey(deepestKey).pos[1] - 5);
                            if (currentDistance < previousDistance) deepestKey = key;
                        }
                    }
                }

                if (deepestKey !== null && deepestRow > currentBase) {
                    bestAction = createDigAction(deepestKey, -1, true);
                    if (bestAction === NO_PICKAXE) break;
                    if (!bestAction) continue;
                } else {
                    break;
                }
            }

            if (!bestAction) break;

            planActions.push(bestAction);
            let slide = false;
            if (bestAction.type === "tool") {
                inventory.set(bestAction.id, getInventory(bestAction.id) - 1);
                let clearPoints;
                let unlockPoints;
                if (bestAction.tool === "drill") {
                    [clearPoints, unlockPoints] = drillArea(
                        bestAction.pos[0], bestAction.pos[1], wMin, wMax,
                    );
                } else {
                    clearPoints = bombArea(bestAction.pos[0], bestAction.pos[1]);
                    unlockPoints = [];
                }
                const toolRewardNames = [];
                const toolRewardIds = [];
                for (const point of clearPoints) {
                    const node = getNode(point);
                    if (!node) continue;
                    if (hasItemName(node.reward)) {
                        toolRewardNames.push(ITEM_NAMES[node.reward]);
                        toolRewardIds.push(node.reward);
                    }
                    node.digged = true;
                    node.type = 1;
                    node.durability = 0;
                    node.unlocked = true;
                    node.reward = 0;
                    if (node.pos[0] === wMax) slide = true;
                    propagateUnlock(node.pos);
                }
                bestAction.rewards = toolRewardNames;
                bestAction.reward_ids = toolRewardIds;
                for (const point of unlockPoints) {
                    const node = getNode(point);
                    if (node) node.unlocked = true;
                }
            } else {
                // Python applies the same simulation branch to both dig and
                // get actions, which clears a claimed tile's reward as well.
                const node = getNode(bestAction.pos);
                node.durability -= 1;
                if (node.durability <= 0) {
                    node.digged = true;
                    node.reward = 0;
                    if (node.pos[0] === wMax) slide = true;
                    propagateUnlock(node.pos);
                    addSeed(pointKey(node.pos[0], node.pos[1]));
                }
                // Python replans after server-side inventory changes.  The
                // pure preview has no ACK loop, so consume the selected
                // pickaxe here to avoid planning impossible future digs.
                if (bestAction.type === "dig") {
                    inventory.set(bestAction.tool_id, getInventory(bestAction.tool_id) - 1);
                }
            }

            // Interleave connectivity flood-fill and viewport sliding exactly
            // as the Python planner does after each physical action.
            let slideTriggered = true;
            while (slideTriggered) {
                slideTriggered = false;
                const impactKey = pointKey(bestAction.pos[0], bestAction.pos[1]);
                const seedsToSpread = bestAction.type === "slide"
                    ? Array.from(seeds)
                    : (getNodeByKey(impactKey) && getNodeByKey(impactKey).digged
                        ? [impactKey] : []);
                const floodQueue = [...seedsToSpread];
                let floodHead = 0;
                while (floodHead < floodQueue.length) {
                    const currentKey = floodQueue[floodHead++];
                    const currentNode = getNodeByKey(currentKey);
                    if (!currentNode) continue;
                    for (const adjacent of neighbors(currentNode.pos)) {
                        const adjacentKey = pointKey(adjacent[0], adjacent[1]);
                        const adjacentNode = getNodeByKey(adjacentKey);
                        if (!adjacentNode) continue;
                        adjacentNode.unlocked = true;
                        if (!adjacentNode.digged && adjacentNode.type === 1
                            && adjacentNode.pos[0] <= currentBase + 1) {
                            adjacentNode.digged = true;
                            seeds.add(adjacentKey);
                            floodQueue.push(adjacentKey);
                            propagateUnlock(adjacentNode.pos);
                        }
                    }
                }

                const targetRow = currentBase + 1;
                if (targetRow >= maxDepth) break;
                let triggered = false;
                for (let col = 1; col <= 9; col += 1) {
                    const targetNode = getNode([targetRow, col]);
                    if (targetNode && (targetNode.digged || targetNode.type === 1)
                        && targetNode.unlocked) {
                        triggered = true;
                        break;
                    }
                }
                if (!triggered) continue;

                const oldBase = currentBase;
                currentBase += 1;
                slideTriggered = true;
                const missed = [];
                for (let row = oldBase - 5; row < currentBase - 5; row += 1) {
                    for (let col = 1; col <= 9; col += 1) {
                        const node = getNode([row, col]);
                        if (node && node.reward > 0) {
                            const rewardId = node.reward;
                            missed.push({
                                name: rewardName(rewardId) || String(rewardId),
                                pos: [row, col],
                                val: rewardValue(rewardId),
                                cost: mapValueOr(costs, pointKey(row, col), 999999),
                            });
                            node.reward = 0;
                        }
                    }
                }
                planActions.push({
                    type: "slide",
                    old_base: oldBase,
                    new_base: currentBase,
                    missed,
                    pos: [currentBase, 5],
                });
                // The Python implementation uses a dummy slide action to
                // trigger another connectivity pass before the next iteration.
                bestAction = { type: "slide", pos: [currentBase, 5] };
            }
            void slide;
        }

        return { actions: planActions, maxDepth };
    }

    const api = Object.freeze({
        plan,
        PROFIT_MAP,
        ITEM_NAMES,
        bombArea,
        drillArea,
    });
    minerv6Planner = api;

    // This conditional is ignored by Tampermonkey and makes the same pure
    // module convenient to exercise with Node's require() during verification.
    if (typeof module !== "undefined" && module.exports) module.exports = api;
}(globalThis));

/* Browser adapter. Bundled after minerv6_planner.js; no remote dependencies. */
(function () {
    'use strict';
    const P = minerv6Planner;
    const get = (o, k) => { try { return o?.[k]; } catch (_) { return undefined; } };
    const key = (d, c) => `${d},${c}`;
    const neighbors = ([d, c]) => [[d+1,c],[d-1,c],[d,c+1],[d,c-1]];
    function decodeBytes(input) {
        const bytes = new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength);
        const dv = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); let at=0;
        const take=n=> { if(n<0 || at+n>bytes.length) throw new Error('MessagePack 截断'); const p=at; at+=n; return p; };
        const uint=n=> { const p=take(n); return n===1?dv.getUint8(p):n===2?dv.getUint16(p):dv.getUint32(p); };
        const str=n=>new TextDecoder().decode(bytes.subarray(take(n),at));
        const array=(n,depth)=> { if(n>100000) throw new Error('MessagePack 数组过大'); return Array.from({length:n},()=>read(depth+1)); };
        const map=(n,depth)=> { if(n>100000) throw new Error('MessagePack 字典过大'); const o=Object.create(null); for(let i=0;i<n;i++) {const k=read(depth+1);o[k]=read(depth+1);} return o; };
        function read(depth=0) {
            if(depth>48) throw new Error('MessagePack 嵌套过深');
            const b=uint(1);
            if(b<128) return b; if(b>=224) return b-256;
            if((b&240)===128) return map(b&15,depth);
            if((b&240)===144) return array(b&15,depth);
            if((b&224)===160) return str(b&31);
            if(b===192) return null; if(b===194 || b===195) return b===195;
            if(b>=196 && b<=198) { const n=uint(2**(b-196)); return bytes.slice(take(n),at); }
            if(b===202) return dv.getFloat32(take(4)); if(b===203) return dv.getFloat64(take(8));
            if(b>=204 && b<=206) return uint(2**(b-204));
            if(b>=208 && b<=210) { const n=2**(b-208),p=take(n); return n===1?dv.getInt8(p):n===2?dv.getInt16(p):dv.getInt32(p); }
            if(b===207 || b===211) { const p=take(8),v=b===207?dv.getBigUint64(p):dv.getBigInt64(p); return v<=BigInt(Number.MAX_SAFE_INTEGER)&&v>=BigInt(Number.MIN_SAFE_INTEGER)?Number(v):v.toString(); }
            if(b>=217 && b<=219) return str(uint(2**(b-217)));
            if(b===220 || b===221) return array(uint(b===220?2:4),depth);
            if(b===222 || b===223) return map(uint(b===222?2:4),depth);
            throw new Error('不支持的 MessagePack 类型');
        }
        const value=read(); if(at!==bytes.length) throw new Error('MessagePack 尾部数据'); return value;
    }
    class MineState {
        constructor() { this.grid = new Map(); this.ids = new Map(); this.inventory = {}; this.baseDepth = null; this.revision = 0; this.cd = 1000; }
        apply(root) {
            const seen = new Set();
            const walk = (obj, depth = 0) => {
                if (!obj || typeof obj !== 'object' || depth > 24 || seen.has(obj)) return;
                seen.add(obj);
                if (obj['25'] && typeof obj['25'] === 'object') this.mine(obj['25']);
                const inv = obj['23'];
                if (inv && typeof inv === 'object') for (const [id, value] of Object.entries(inv)) {
                    if (!/^110700\d+$/.test(id)) continue;
                    const qty = Number(typeof value === 'object' && value !== null ? value['1'] : value);
                    if (Number.isFinite(qty) && qty >= 0) this.inventory[id] = qty;
                }
                for (const v of Object.values(obj)) walk(v, depth + 1);
            };
            walk(root);
        }
        mine(buff) {
            const tiles = buff['4'];
            if (!tiles || typeof tiles !== 'object' || Array.isArray(tiles)) return;
            const entries = Object.entries(tiles), base = Number(buff['0']);
            const known = entries.length > 0 && entries.every(([id]) => this.ids.has(id));
            const jump = Number.isInteger(base) && this.baseDepth !== null && base - this.baseDepth > 1;
            if (entries.length < 20 && !known && !jump) return;
            if (Number.isInteger(base) && base > 0) this.baseDepth = base;
            for (const [id, tile] of entries) {
                const oldKey = this.ids.get(id);
                if (tile === null || tile === false) { this.ids.delete(id); this.grid.delete(oldKey); continue; }
                if (!tile || typeof tile !== 'object') continue;
                const d = Number(tile['0']), c = Number(tile['1']);
                if (Number.isInteger(d) && d > 0 && Number.isInteger(c) && c >= 1 && c <= 9 && tile['2'] !== undefined) {
                    const k = key(d,c);
                    this.ids.set(id,k); this.grid.set(k,{...tile});
                } else if (oldKey && this.grid.has(oldKey)) {
                    const merged = {...this.grid.get(oldKey), ...tile};
                    if (Number(merged['4']) > 0 && merged['2'] === 1) merged['2'] = 2;
                    this.grid.set(oldKey,merged);
                }
            }
            if (this.baseDepth !== null) for (const [id,k] of this.ids) {
                if (Number(k.split(',')[0]) < this.baseDepth-5) { this.ids.delete(id); this.grid.delete(k); }
            }
            this.revision++;
        }
        predict(action) {
            const [d,c] = action.pos, tile = this.grid.get(key(d,c));
            const unlock = pos => { for (const p of neighbors(pos)) { const t = this.grid.get(key(...p)); if (t) t['6'] = 1; } };
            if (action.type === 'get') { if (tile) { tile['5'] = 0; tile['3'] = 0; } unlock(action.pos); return; }
            const id = action.type === 'tool' ? action.id : action.tool_id;
            if (Number.isFinite(this.inventory[id])) this.inventory[id] = Math.max(0,this.inventory[id]-1);
            let clear = [], extra = [];
            if (action.type === 'tool') {
                if (action.tool === 'bomb') clear = P.bombArea(d,c);
                else [clear,extra] = P.drillArea(d,c,this.baseDepth-5,this.baseDepth+1);
            } else if (tile) { tile['4'] = Math.max(0,Number(tile['4'] ?? 1)-1); tile['6'] = 1; if (!tile['4']) clear = [action.pos]; }
            for (const pos of clear) {
                const t = this.grid.get(key(...pos));
                if (t) { Object.assign(t,{'2':1,'3':0,'4':0,'5':0,'6':1}); unlock(pos); }
            }
            for (const pos of extra) { const t = this.grid.get(key(...pos)); if (t) t['6'] = 1; }
            // Server sync remains authoritative; only slide through a known open bottom row.
            for (let n=0;n<100;n++) {
                const row = [...this.grid.values()].filter(t => t['0'] === this.baseDepth+1);
                if (!row.some(t => t['2'] === 1 && t['6'] === 1)) break;
                this.baseDepth++;
            }
        }
        plan(options) { return P.plan({grid:[...this.grid.values()],baseDepth:this.baseDepth,inventory:{...this.inventory},...options}); }
    }
    function protocolItems(root) {
        const out = [], seen = new Set();
        const visit = (o,depth=0) => {
            if (!o || typeof o !== 'object' || depth>24 || seen.has(o)) return;
            seen.add(o);
            if (o.protoId !== undefined || o.className) out.push(o);
            for (const v of Object.values(o)) visit(v,depth+1);
        };
        visit(root); return out;
    }
    // Expose only pure components to the offline VM harness.
    if (typeof window === 'undefined') { globalThis.Minerv6Runtime = {MineState,protocolItems,decodeBytes}; return; }
    let root = window;
    try { while (root.parent !== root && root.parent.document) root = root.parent; } catch (_) {}
    const INSTANCE = '__minerv6UserscriptV1';
    const previous = get(root,INSTANCE);
    if (previous?.document === root.document && previous.version === '0.1.1') {
        previous.mount();
        return;
    }
    const doc = root.document;
    const instance = {document:doc,version:'0.1.1',mount:()=>ui()};
    let state = new MineState(), owner = null, running = false, busy = false, pending = null, internalSend = false;
    let poisoned = false, panel, output, status, settings, lastSend = 0;
    const bindings = new WeakMap();
    function log(text) {
        if (!output) return;
        const line = doc.createElement('div'); line.textContent = `${new Date().toLocaleTimeString()} ${text}`;
        output.append(line); while (output.children.length>180) output.firstChild.remove(); output.scrollTop=output.scrollHeight;
    }
    function stop(reason) { running=false; if(reason) log(reason); }
    function alive(o) { try { return o && !o.win.closed && o.win.document === o.document && o.win.ClientMessageHandle === o.handle; } catch (_) { return false; } }
    function receive(binding, result, rawId=0) {
        if (!alive(binding)) return;
        if(ArrayBuffer.isView(result)) result=decodeBytes(result);
        const items = protocolItems(result);
        const hasMine = items.some(i => i.protoId === 5001 || i.protoId === 5002) || JSONHasMine(result);
        if (owner !== binding) {
            if (!hasMine) return;
            if (running || pending) stop('游戏上下文切换，已停止；请重新检查矿区。');
            if (pending) pending.fail(new Error('上下文切换，发送结果未知，请刷新游戏后再试'));
            owner=binding; state=new MineState();
            log('已连接 Lyra 游戏上下文，等待矿区及库存同步。');
        }
        const before = state.revision;
        if (pending && pending.owner === binding) pending.deltas.push(JSON.parse(JSON.stringify(result)));
        state.apply(result);
        if (pending && pending.owner === binding) {
            const err = items.find(i=>i.className==='ErrorMsg' || i.protoId===1001) || (rawId===0xfc17?{data:result}:null);
            if (err) { pending.fail(new Error(`服务器拒绝：${err.data?.Code ?? err.data?.code ?? '未知错误'}`)); return; }
            const wanted = pending.action.type==='get' ? 5002 : 5001;
            const ack = items.find(i=>i.protoId===wanted || i.className===(wanted===5002?'MineGetItem':'MineDig')) || (rawId===(wanted===5002?0xec76:0xec77)?{data:result}:null);
            if (ack) {
                const data = ack.data || {}, pos = data.MineItem;
                if (pos && (Number(pos['0'])!==pending.action.pos[0] || Number(pos['1'])!==pending.action.pos[1])) return;
                const cd = Number(data.cdLeft ?? data.cd ?? data['0']);
                if (Number.isFinite(cd) && cd>=0 && cd<60000) state.cd=cd;
                // Predict before replaying the authoritative delta to avoid double-decrementing it.
                pending.accept(result,before);
            }
        }
    }
    function JSONHasMine(rootValue) {
        let found=false; const seen=new Set();
        function walk(v,n=0) { if(!v || typeof v!=='object' || n>20 || seen.has(v)) return; seen.add(v);
            if(v['25']?.['4'] && Object.keys(v['25']['4']).length>=20) found=true;
            if(!found) for(const x of Object.values(v)) walk(x,n+1);
        } walk(rootValue); return found;
    }
    function install(win) {
        const handle=get(win,'ClientMessageHandle'), game=get(get(win,'$Global'),'core')?.Game;
        if (typeof get(handle,'sendTcp')!=='function' || !game?.Protocols) return;
        const old=bindings.get(win);
        if (old && old.document===win.document && old.handle===handle) { hookDecoders(old,game); return; }
        const binding={win,document:win.document,handle,protocols:game.Protocols,hooked:new WeakSet()};
        bindings.set(win,binding);
        const send=handle.sendTcp;
        handle.sendTcp=function(proto,data) {
            if (!internalSend && (running || pending) && [5001,5002].includes(proto?.protoId)) {
                stop('检测到手动挖矿，已停止自动执行。');
                if(pending) pending.fail(new Error('并发挖矿使响应归属不确定，请刷新后再试'));
            }
            return send.apply(this,arguments);
        };
        binding.send=send;
        hookDecoders(binding,game);
    }
    function hookDecoders(binding,game) {
        for(const obj of [game.Message,game,get(binding.win,'$Global')?.core,binding.handle]) {
            if (!obj || typeof get(obj,'decodeMessage')!=='function' || binding.hooked.has(obj)) continue;
            const original=obj.decodeMessage;
            obj.decodeMessage=function(...args) {
                let rawId=0;
                try { const a=args[0]; const bytes=ArrayBuffer.isView(a)?new Uint8Array(a.buffer,a.byteOffset,a.byteLength):new Uint8Array(a); if(bytes.length>=6) rawId=bytes[4]|bytes[5]<<8; } catch (_) {}
                const observe=res=> { try { receive(binding,res,rawId); } catch (_) { stop('矿区解析失败，已停止。'); if(pending) pending.fail(new Error('响应解析失败，结果未知，请刷新')); } };
                if(typeof args[1]==='function') { const cb=args[1]; args[1]=function(res) { observe(res); return cb.apply(this,arguments); }; return original.apply(this,args); }
                const res=original.apply(this,args);
                if(res && typeof res.then==='function') res.then(observe,()=>{}); else observe(res);
                return res;
            };
            binding.hooked.add(obj);
        }
    }
    function scan() {
        ui();
        const queue=[root], seen=new Set();
        while(queue.length && seen.size<64) {
            const win=queue.shift(); if(seen.has(win)) continue; seen.add(win);
            try { void win.document; install(win); for(let i=0;i<Math.min(win.frames.length,32);i++) queue.push(win.frames[i]); } catch (_) {}
        }
        if(owner && !alive(owner)) { stop('游戏框架已重建，请等待新同步。'); if(pending) pending.fail(new Error('连接丢失，发送结果未知，请刷新后再试')); owner=null; state=new MineState(); }
        if(status) status.textContent = `${owner?'已连接':'等待 Lyra 游戏框架'} · 深度 ${state.baseDepth??'—'} · 地块 ${state.grid.size} · 普通镐 ${state.inventory[11070001]??'?'} · 黄金镐 ${state.inventory[11070011]??'?'}${busy?' · 执行中':''}${poisoned?' · 结果未知，需刷新':''}`;
    }
    function options() { return {goldOnly:settings.gold.checked,noGold:!settings.allowGold.checked,noBomb:!settings.bomb.checked,noDrill:!settings.drill.checked}; }
    function ready() { if(poisoned) throw new Error('上次发送结果未知，请刷新游戏以重新同步'); if(!alive(owner) || state.baseDepth===null || !state.grid.size) throw new Error('请刷新游戏，进入矿区并等待数据同步'); }
    function send(action) {
        const bound=owner;
        const proto=Object.values(bound.protocols).find(p=>p?.protoId===(action.type==='get'?5002:5001));
        if(!proto) return Promise.reject(new Error('游戏协议表缺少挖矿协议'));
        const id=action.type==='tool'?action.id:action.tool_id;
        const data=action.type==='get'?action.pos:[...action.pos,id];
        return new Promise((resolve,reject)=> {
            const snapshot=state;
            // Keep the pre-send state separate, then replay all syncs received before ACK.
            const saved = new MineState(); saved.grid=new Map([...snapshot.grid].map(([k,v])=>[k,{...v}])); saved.ids=new Map(snapshot.ids); saved.inventory={...snapshot.inventory}; saved.baseDepth=snapshot.baseDepth; saved.cd=snapshot.cd;
            const deltas=[];
            const timer=root.setTimeout(()=>{poisoned=true;finish(new Error('响应超时，结果未知；已停止且不会重发，请刷新游戏'));},8000);
            function finish(err) { root.clearTimeout(timer); pending=null; if(err) reject(err); else resolve(); }
            pending={owner:bound,action,deltas,fail:err=>{poisoned=true;finish(err);},accept:(result)=>{
                saved.predict(action);
                for(const delta of deltas) saved.apply(delta);
                saved.apply(result); saved.cd=state.cd; state=saved; finish();
            }};
            try { internalSend=true; lastSend=Date.now(); bound.handle.sendTcp(proto,data); }
            catch (_) { poisoned=true;finish(new Error('发送异常，结果未知；请刷新游戏，不会自动重试')); }
            finally { internalSend=false; }
        });
    }
    const sleep=ms=>new Promise(resolve=>root.setTimeout(resolve,ms));
    async function run(single=false) {
        if(busy) return;
        try {
            ready(); const opts=options();
            if(opts.goldOnly && opts.noGold) throw new Error('仅黄金镐模式需要同时勾选允许黄金镐');
            const maxPicks=Number(settings.picks.value), maxLayers=Number(settings.layers.value), maxMinutes=Number(settings.minutes.value);
            if(![maxPicks,maxLayers,maxMinutes].every(n=>Number.isFinite(n)&&n>=0)) throw new Error('停止上限必须是非负数，0 表示不限制');
            busy=true; running=true;
            for(const input of Object.values(settings)) input.disabled=true;
            const initial=state.baseDepth, started=Date.now(); let picks=0, searches=0;
            while(running) {
                ready();
                if((maxPicks && picks>=maxPicks)||(maxLayers && state.baseDepth-initial>=maxLayers)||(maxMinutes && Date.now()-started>=maxMinutes*60000)) { stop('已达到停止上限。'); break; }
                await sleep(Math.max(0,Math.max(400,state.cd)-(Date.now()-lastSend)));
                if(!running) break;
                if(maxMinutes && Date.now()-started>=maxMinutes*60000) { stop('已达到时间上限。'); break; }
                const action=state.plan(opts).actions.find(a=>a.type!=='slide');
                if(!action) { stop('当前视野没有可执行动作。'); break; }
                const liveTile=state.grid.get(key(...action.pos));
                if(!liveTile || action.pos[0]<state.baseDepth-5 || action.pos[0]>state.baseDepth+1) throw new Error('计划超出当前同步视野，请重新进入矿区同步');
                if(action.type==='dig' && liveTile['2']===1) throw new Error('目标已为空地，请重新同步');
                if(action.type!=='get') {
                    if(action.type==='dig') {
                        action.tool_id=opts.goldOnly?11070011:(state.inventory[11070001]>0?11070001:11070011);
                        if(opts.noGold && action.tool_id===11070011) throw new Error('普通镐不足，已停止');
                    }
                    const id=action.type==='tool'?action.id:action.tool_id;
                    if(!(state.inventory[id]>0)) throw new Error('道具库存不足或尚未同步，已停止');
                    if(action.type==='tool' && ((action.tool==='bomb'&&opts.noBomb)||(action.tool==='drill'&&opts.noDrill))) throw new Error('规划包含已禁用工具，已停止');
                }
                if(action.type==='dig' && action.score<0) searches++; else searches=0;
                if(searches>6) { stop('连续探索未发现收益，已停止。'); break; }
                log(`${action.type==='get'?'领取':action.type==='tool'?action.tool:'挖掘'} (${action.pos.join(', ')})${action.reward_name?' '+action.reward_name:''}`);
                await send(action);
                if(action.type==='dig') picks++;
                if(single) break;
            }
        } catch(e) { log(e.message); }
        finally { running=false; busy=false; for(const input of Object.values(settings)) input.disabled=false; }
    }
    function ui() {
        if(!doc.body) return; // The independent scan timer mounts after body appears.
        if(panel) { if(!doc.body.contains(panel)) doc.body.append(panel); return; }
        const host=doc.createElement('div');
        host.id='cishen-minerv6-panel';
        host.style.cssText='all:initial!important;display:block!important;position:fixed!important;right:14px!important;top:60px!important;z-index:2147483647!important;width:350px!important;max-width:calc(100vw - 28px)!important;max-height:85vh!important;overflow:auto!important;background:#15202b!important;color:#eee!important;padding:14px!important;border:1px solid #617889!important;border-radius:10px!important;font:13px/1.5 sans-serif!important;box-shadow:0 5px 24px #0008!important;visibility:visible!important;opacity:1!important';
        const shadow=typeof host.attachShadow==='function'?host.attachShadow({mode:'open'}):host;
        const controls={};
        function element(tag,parent,text,id) {
            const el=doc.createElement(tag);
            if(text!==undefined) el.textContent=text;
            if(id) { el.id=id; controls[id]=el; }
            parent.append(el); return el;
        }
        element('style',shadow,'button,input{margin:4px;padding:4px}button{cursor:pointer}input[type=number]{width:52px}#log{max-height:200px;overflow:auto;font-size:12px}label{display:inline-block}');
        element('b',shadow,'⛏ Minerv6 · Lyra v0.1.1');
        element('button',shadow,'收起','fold');
        const body=element('div',shadow,undefined,'body');
        element('p',body,'脚本已启动，等待游戏同步','status');
        for(const [id,title,checked] of [['allowGold','允许黄金镐',false],['gold','仅黄金镐',false],['bomb','炸弹',true],['drill','电钻',true]]) {
            const label=element('label',body);
            const input=element('input',label,undefined,id); input.type='checkbox'; input.checked=checked;
            element('span',label,title);
        }
        element('br',body);
        for(const [id,title,value] of [['picks','最多镐数','50'],['layers','层数','20'],['minutes','分钟','5']]) {
            const label=element('label',body,title);
            const input=element('input',label,undefined,id); input.type='number'; input.min='0'; input.value=value;
        }
        element('br',body);
        for(const [id,title] of [['plan','预览计划'],['step','执行一步'],['start','开始'],['stop','停止']]) element('button',body,title,id);
        element('div',body,undefined,'log');
        const $=id=>controls[id]; status=$('status'); output=$('log'); settings=Object.fromEntries(['allowGold','gold','bomb','drill','picks','layers','minutes'].map(id=>[id,$(id)]));
        $('fold').onclick=()=>{$('body').hidden=!$('body').hidden;};
        $('stop').onclick=()=>stop('已停止；正在等待的动作仍会结算。');
        $('start').onclick=()=>run(); $('step').onclick=()=>run(true);
        $('plan').onclick=()=> { try { ready(); const plan=state.plan(options()); log(`计划 ${plan.actions.length} 项（含视窗滑动），最深已知 ${plan.maxDepth}`); for(const a of plan.actions.slice(0,25)) log(`${a.type} (${a.pos.join(',')}) ${a.reward_name||''}`); } catch(e) { log(e.message); } };
        doc.body.append(host); panel=host;
        log('脚本 v0.1.1 已启动。请先进入矿区；预览不发包。');
    }
    // Publish the singleton only after successful initial UI construction.
    ui(); root[INSTANCE]=instance; scan(); root.setInterval(scan,500);
})();

})();
