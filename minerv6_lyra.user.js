// ==UserScript==
// @name         Cishen Minerv7 Flash - Lyra 自动挖矿
// @namespace    cishen-minerv6-local
// @version      0.2.5
// @description  MinePlus v7 Flash 窗口优先规划、单步/自动挖矿；Lyra 原生协议
// @match        *://www.wanyiwan.top/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// ==/UserScript==
(function () {
const globalThis = {}; let module;
/* Authoritative MinePlus v7 state and pure confirmation/cache views. */
(function exposeMinerv7State(global) {
    'use strict';
    const PICK = 11070001, GOLD_PICK = 11070011, BOMB = 11070003, DRILL = 11070002;
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const mapping = o => o !== null && typeof o === 'object' && !Array.isArray(o);
    const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
    const object = o => mapping(o) ? o : {};
    const section = (state, name, field) => object(state[name] ?? object(state.map)[field]);

    function knownStones(state) {
        const depth = key => Math.floor(key / 256), col = key => key % 256;
        const validKey = key => Number.isInteger(key) && depth(key) > 0 && col(key) >= 1 && col(key) <= 6;
        const tiles = section(state,'tiles','3'), blocks = section(state,'blocks','4'), result = new Map();
        for (const [raw, block] of Object.entries(blocks)) {
            const anchor = Number(raw), size = ({4: 2, 5: 3, 6: 4})[block && block[3]];
            if (!validKey(anchor) || !size || Array.isArray(block) || !Number.isInteger(block[3]) || col(anchor) + size - 1 > 6 || !Number.isInteger(block[4]) || block[4] <= 0) continue;
            if ((Object.hasOwn(block, 1) && block[1] !== depth(anchor)) || (Object.hasOwn(block, 2) && block[2] !== col(anchor))) continue;
            const members = new Set();
            for (let d = depth(anchor); d < depth(anchor) + size; d++) for (let x = col(anchor); x < col(anchor) + size; x++) members.add(d * 256 + x);
            const owned = Object.keys(tiles).filter(k => String(object(tiles[k])[0]) === String(anchor));
            if (owned.length !== members.size || owned.some(k => !members.has(Number(k)))) continue;
            let total = 0, valid = true;
            for (const k of members) {const c = object(tiles[k]); if (String(c[0]) !== String(anchor) || c[3] !== 3 || ![0, 2].includes(c[4])) {valid = false; break;} total += c[4];}
            if (valid && total === block[4]) result.set(anchor, members);
        }
        return result;
    }

    function merge(target, patch) {
        for (const [key, value] of Object.entries(patch)) {
            if (value === null) delete target[key];
            else if (mapping(value)) {
                const child = object(target[key]);
                merge(child, value);
                if (Object.keys(child).length) target[key] = child;
                else delete target[key];
            } else target[key] = clone(value);
        }
    }
    function mergeMine(target, patch) {
        const resets = [];
        for (const [id, map] of Object.entries(object(patch['2']))) {
            for (const field of ['1', '3']) {
                const wrapper = object(map)[field];
                if (!Array.isArray(wrapper)) continue;
                const problem = `unsupported bulk ${field === '1' ? 'event' : 'tile'} patch`;
                if (wrapper.length !== 2 || !Array.isArray(wrapper[0]) || !mapping(wrapper[1]) ||
                    wrapper[0].some(key => !['number','string'].includes(typeof key) ||
                        (typeof key === 'number' && !Number.isInteger(key)) || !mapping(wrapper[1][String(key)])) ||
                    Object.values(wrapper[1]).some(v => v !== null && !mapping(v))) throw new Error(problem);
                resets.push([id, field, wrapper[0].map(String)]);
                map[field] = wrapper[1];
            }
        }
        // Validate every typed wrapper before touching authoritative state.
        for (const [id, field, keys] of resets) {
            const entries = object(object(object(target['2'])[id])[field]);
            for (const key of keys) delete entries[key];
        }
        merge(target, patch);
    }
    // Reply fields are snapshots: the client constructs a fresh GameObjectMap
    // on each reply, even when the wire value has the bulk-patch wrapper.
    function rewardSnapshot(value) {
        if (value == null) return {};
        if (Array.isArray(value)) {
            if (value.length !== 2 || !Array.isArray(value[0]) || !mapping(value[1]) ||
                value[0].some(key => !['number','string'].includes(typeof key) ||
                    (typeof key === 'number' && !Number.isInteger(key)) || !mapping(value[1][String(key)])))
                throw new Error('unsupported reward detail snapshot');
            value = value[1];
        }
        if (!mapping(value) || Object.values(value).some(event => event !== null && !mapping(event)))
            throw new Error('unsupported reward detail snapshot');
        return Object.fromEntries(Object.entries(value).filter(([,event]) => event !== null).map(([key,event]) => [key,clone(event)]));
    }
    function effectiveEvents(state) {
        const tiles = section(state,'tiles','3'), blocks = section(state,'blocks','4');
        const result = {};
        // Shared stones get one anchor reward; never credit each member.
        for (const [key,tile] of Object.entries(tiles)) {
            if (mapping(tile) && [undefined,null,0,false,'','0'].includes(tile['0']) && Number.isInteger(tile['6']) && tile['6'] > 0)
                result[key] = {'3':tile['6'],source:'award'};
        }
        for (const anchor of knownStones(state).keys()) {
            const award = blocks[anchor]['6'];
            if (Number.isInteger(award) && award > 0) result[anchor] = {'3':award,source:'block_award'};
        }
        for (const [source,events] of [['events',section(state,'events','1')],
            ['response',object(object(state.rewardDetails)[String(state.mapId ?? 1)])]]) {
            for (const [key,event] of Object.entries(events)) if (mapping(event)) result[key] = {...clone(event),source};
        }
        for (const [key,tile] of Object.entries(tiles)) {
            if (mapping(tile) && [undefined,null,0,false,'','0'].includes(tile['0']) && Number.isInteger(tile['4']) && tile['4'] <= 0)
                delete result[key];
        }
        return result;
    }
    function protocolItems(raw, names = {}) {
        const result = [];
        function visit(value) {
            if (Array.isArray(value)) { value.forEach(visit); return; }
            if (!mapping(value)) return;
            const name = typeof value.className === 'string' ? value.className : names[value.protoId];
            if (typeof name === 'string') { result.push({className:name, data:value.data}); return; }
            for (const key of ['decoded','messages','items','results','res']) {
                if (own(value, key)) { visit(value[key]); return; }
            }
        }
        visit(raw);
        return result;
    }
    class MineState {
        constructor(mapId = 1) {
            this.mapId = Number(mapId); this.mine = {}; this.inventory = {};
            this.ready = false; this.revision = 0; this.problem = null;
            this.lastResponse = null; this.disabledAreaTools = null;
            this.rewardDetails = {'1':{},'2':{}};
        }
        get map() { return object(object(this.mine['2'])[String(this.mapId)]); }
        get tiles() { return this.map['3'] ?? {}; }
        get events() { return this.map['1'] ?? {}; }
        get blocks() { return this.map['4'] ?? {}; }
        get active() { return object(this.map['6']); }
        setProblem(message) { if (this.problem === null) this.problem = message; }
        applyInventory(value) {
            if (!mapping(value)) return;
            for (const [item, raw] of Object.entries(value)) {
                if (raw === null) { delete this.inventory[item]; continue; }
                if (mapping(raw) && !own(raw, '1')) continue;
                const quantity = mapping(raw) ? raw['1'] : raw;
                if (quantity === null) { delete this.inventory[item]; continue; }
                // Python int accepts integer strings and truncates finite numbers.
                const parsed = typeof quantity === 'string' ? (/^[+-]?\d+$/.test(quantity.trim()) ? Number(quantity) : NaN) :
                    typeof quantity === 'number' || typeof quantity === 'boolean' ? Number(quantity) : NaN;
                if (Number.isFinite(parsed)) this.inventory[item] = Math.trunc(parsed);
                else this.setProblem('unsupported inventory quantity');
            }
        }
        trackExhaustedAreaTools() {
            if (this.ready && !this.problem) this.disabledAreaTools = [...new Set([
                ...(this.disabledAreaTools || []), ...[BOMB, DRILL].filter(tool => (this.inventory[tool] || 0) <= 0)
            ])];
        }
        apply_message(name, raw) {
            const data = clone(raw);
            if (name === 'Login') {
                this.mine = {}; this.inventory = {}; this.ready = false;
                this.rewardDetails = {'1':{},'2':{}};
                const player = object(object(data).GamePlayer);
                this.applyInventory(player['23']);
                const snapshot = player['154'];
                if (snapshot !== undefined && snapshot !== null) {
                    if (!mapping(snapshot)) this.setProblem('unsupported mine snapshot');
                    else if (Object.values(object(snapshot['2'])).some(map => Array.isArray(object(map)['3'])))
                        this.setProblem('unsupported bulk tile patch');
                    else {
                        this.mine = snapshot; this.revision++;
                        this.ready = mapping(object(snapshot['2'])[String(this.mapId)]);
                    }
                }
            } else if (name === 'SynData') {
                const payload = object(data);
                const buff = mapping(payload.Buff) ? payload.Buff :
                    (own(payload, '154') || own(payload, '23') ? payload : {});
                if (own(buff, '23')) this.applyInventory(buff['23']);
                if (own(buff, '154')) {
                    const patch = buff['154'];
                    if (patch === null) { this.mine = {}; this.ready = false; this.revision++; }
                    else if (!mapping(patch)) this.setProblem('unsupported mine patch');
                    else {
                        try { mergeMine(this.mine, patch); this.revision++; }
                        catch (error) { this.setProblem(error.message); }
                    }
                }
            } else if (['MinePlusOpen','MinePlusDig','MinePlusEventChoose','MinePlusExitHiddenMap'].includes(name)) {
                try {
                    const details = {'1':rewardSnapshot(object(data).DefaultMapEvents),
                        '2':rewardSnapshot(object(data).HideMapEvents)};
                    if (JSON.stringify(stable(details)) !== JSON.stringify(stable(this.rewardDetails))) {
                        this.rewardDetails = details; this.revision++;
                    }
                } catch (error) { this.setProblem(error.message); }
                if (name === 'MinePlusDig') { this.lastResponse = data; return data; }
            }
            if (this.disabledAreaTools !== null && (name === 'Login' || name === 'SynData')) this.trackExhaustedAreaTools();
            return null;
        }
        apply(root) { for (const item of protocolItems(root)) this.apply_message(item.className, item.data); }
    }
    function actionFootprint(state, action) {
        const key = Number(action.key), depth = Math.floor(key / 256), col = key % 256;
        const tool = action.tool_id, keys = new Set();
        if (tool === BOMB) {
            for (let d = Math.max(1, depth - 2); d <= depth + 2; d++)
                for (let x = Math.max(1, col - 2); x <= Math.min(6, col + 2); x++)
                    if (Math.abs(d - depth) + Math.abs(x - col) <= 2) keys.add(String(d * 256 + x));
        } else if (tool === DRILL) {
            const base = Number(object(state.map['0'])['6'] || 0);
            for (let d = Math.max(1, base - 5); d <= base + 1; d++) keys.add(String(d * 256 + col));
            for (const x of [col - 1, col + 1]) if (x >= 1 && x <= 6) keys.add(String((base + 1) * 256 + x));
        }
        return [...keys].sort((a,b) => Number(a)-Number(b));
    }
    function stable(value) {
        if (Array.isArray(value)) return value.map(stable);
        if (mapping(value)) return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
        return value ?? null;
    }
    function fingerprint(state, action, footprint = actionFootprint(state, action)) {
        const event = action.event || action.key;
        const tiles = section(state,'tiles','3'), events = section(state,'events','1');
        const blocks = section(state,'blocks','4'), active = section(state,'active','6');
        const value = [BOMB, DRILL].includes(action.tool_id) ? footprint.map(key =>
            [key, object(tiles[key])['3'] ?? null, object(tiles[key])['4'] ?? null]) :
            [tiles[action.key], events[action.key], blocks[event], active[event]];
        return JSON.stringify(stable(value));
    }
    const scalar = value => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'boolean') return Number(value);
        if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) return Number(value);
        return value;
    };
    const keyOf = key => String(scalar(key));
    function cacheView(state) {
        const tiles = section(state,'tiles','3'), blocks = section(state,'blocks','4');
        const active = [...new Set(Object.keys(section(state,'active','6')).map(keyOf))].sort();
        const entries = (source, fn) => Object.entries(source).map(([key, value]) => [keyOf(key), fn(object(value))])
            .sort((a,b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
        const tileView = tile => {
            const kind = scalar(tile['3']), rawHP = scalar(tile['4']);
            return [kind, kind === 1 && [-1,0].includes(rawHP) ? 0 : rawHP, scalar(tile['0']) || 0, scalar(tile['5']) ? 1 : 0];
        };
        const events = Object.fromEntries(Object.entries(effectiveEvents(state)).filter(([rawKey]) => {
            const key = keyOf(rawKey), tile = tiles[rawKey];
            if (own(blocks,key) || active.includes(key) || !mapping(tile)) return true;
            const view = tileView(tile);
            return !(view[1] === 0 && view[2] === 0);
        }));
        const tools = [PICK,GOLD_PICK,BOMB,DRILL].map(tool => {
            const n = scalar(state.inventory[tool]) ?? 0;
            if (!Number.isInteger(n) || n < 0) throw new Error('工具库存类型未知');
            return n;
        });
        return {context:[scalar(state.mapId),Boolean(state.ready),state.problem ?? null,scalar(object(state.map['0'])['6'])],
            tiles:entries(tiles,tileView), events:entries(events,e => [scalar(e['3']),scalar(e['4']),scalar(e['5']) ?? 0]),
            blocks:entries(blocks,b => ['1','2','3','4','6','7'].map(k => scalar(b[k]))), active, tools};
    }
    const api = {MineState,protocolItems,actionFootprint,fingerprint,cacheView,effectiveEvents,knownStones};
    global.Minerv7State = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);

/* Pure offline port of miner_v7_flash and its World transitions. */
(function exposeMinerv7FlashPlanner(global) {
    "use strict";
    const {knownStones, effectiveEvents} = global.Minerv7State || require("./minerv7_state.js");
    const PICK = 11070001, GOLD_PICK = 11070011, BOMB = 11070003, DRILL = 11070002;
    // Frozen defaults from arsenal/miner_v7_config.json.
    const defaults = Object.freeze({pickaxe_cost: 10, bomb_cost: 60, drill_cost: 50,
        time_budget_seconds: 10, window_back: 5, inventory_limited: false,
        currency_value: 21, gem_value: 21, crystal_value: 1, chest_value: 21,
        pickaxe_value: 21, bomb_value: 80, drill_value: 80});
    const clone = value => JSON.parse(JSON.stringify(value));
    const dict = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const sorted = values => Array.from(values).sort((a, b) => a - b);
    const depth = key => Math.floor(key / 256);
    const col = key => key % 256;
    const validKey = key => Number.isInteger(key) && depth(key) > 0 && col(key) >= 1 && col(key) <= 6;
    const compare = (a, b) => {for (let i = 0; i < a.length; i++) {if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;} return 0;};
    const empty = cell => cell && cell[3] === 1 && cell[4] != null && cell[4] <= 0;
    const normalize = state => ({mapId: state.mapId == null ? 1 : state.mapId,
        map: dict(state.map), rewardDetails: dict(state.rewardDetails), inventory: dict(state.inventory), ready: state.ready, problem: state.problem || null,
        disabledAreaTools: Array.from(state.disabledAreaTools || [])});
    function optionsFor(options) {
        const result = {...defaults, ...options};
        for (const name of ["pickaxe_cost", "bomb_cost", "drill_cost", "time_budget_seconds"]) {
            if (typeof result[name] !== "number" || !Number.isFinite(result[name]) || result[name] <= 0) throw new Error("工具成本和时间预算必须为正且有限");
        }
        if (!Number.isInteger(result.window_back) || result.window_back < 0 || typeof result.inventory_limited !== "boolean") throw new Error("窗口或库存限制选项无效");
        for (const name of ["currency_value", "gem_value", "crystal_value", "chest_value", "pickaxe_value", "bomb_value", "drill_value"]) {
            if (result[name] == null && ["bomb_value", "drill_value"].includes(name)) continue;
            if (typeof result[name] !== "number" || !Number.isFinite(result[name]) || result[name] < 0) throw new Error("奖励价值必须为非负有限数值");
        }
        return result;
    }
    function unknownBarrier(state, stones, back) {
        const depths = [], known = new Set(Array.from(stones.values()).flatMap(s => Array.from(s)));
        for (const field of [4, 6]) for (const raw of Object.keys(dict(state.map[field]))) {const key = Number(raw); if (validKey(key) && !stones.has(key)) depths.push(depth(key));}
        for (const [raw, rawCell] of Object.entries(dict(state.map[3]))) {
            const cell = dict(rawCell), key = Number(raw), owner = cell[0];
            if (validKey(key) && !known.has(key) && (cell[3] === 4 || (owner != null && owner !== false && String(owner).trim() !== "" && String(owner).trim() !== "0"))) depths.push(depth(key));
        }
        const eligible = depths.filter(d => d >= state.map[0][6] - back);
        return eligible.length ? Math.min(...eligible) : null;
    }
    // Same classification as the client's MinePlus.eventTypeOf: configuration,
    // not EventID ranges. The browser supplies a detached per-run snapshot.
    function eventCategory(event, o) {
        return dict(o.eventCategories)[Number((event || {})[3])];
    }
    function eventValue(event, o) {
        const kind = Number((event || {})[3]);
        if (eventCategory(event, o) === 1) return o.currency_value;
        if (eventCategory(event, o) === 2) return o.gem_value;
        return ({500501: o.pickaxe_value, 500502: o.bomb_value == null ? o.bomb_cost : o.bomb_value,
            500503: o.drill_value == null ? o.drill_cost : o.drill_value, 500504: o.crystal_value, 300202: o.chest_value})[kind] || 0;
    }
    class Heap {
        constructor() {this.items = [];}
        push(item) {const a = this.items; a.push(item); let i = a.length - 1; while (i) {const p = (i - 1) >> 1; if (compare(a[p], item) <= 0) break; a[i] = a[p]; i = p;} a[i] = item;}
        pop() {const a = this.items, first = a[0], last = a.pop(); if (a.length) {let i = 0; while (i * 2 + 1 < a.length) {let c = i * 2 + 1; if (c + 1 < a.length && compare(a[c + 1], a[c]) < 0) c++; if (compare(last, a[c]) <= 0) break; a[i] = a[c]; i = c;} a[i] = last;} return first;}
    }
    const TIMEOUT = {};
    class World {
        constructor(state, o, tool = null, deadline = null, limited = o.inventory_limited) {
            this.state = state; this.o = o; this.tool = tool; this.deadline = deadline; this.limited = limited;
            this.cells = new Map(Object.entries(dict(state.map[3])).filter(([k, c]) => validKey(Number(k)) && c && typeof c === "object" && !Array.isArray(c)).map(([k, c]) => [Number(k), c]));
            this.keys = sorted(this.cells.keys()); this.events = new Map(Object.entries(effectiveEvents(state)).map(([k, v]) => [Number(k), v]));
            this.stones = knownStones(state); this.owners = new Map(); this.hp = new Map(); this.empties = new Set(); this.rewards = new Map();
            for (const [anchor, members] of this.stones) for (const k of members) this.owners.set(k, anchor);
            for (const [k, c] of this.cells) {
                if ([2, 3].includes(c[3]) && Number.isInteger(c[4]) && c[4] > 0) this.hp.set(k, this.owners.has(k) ? 1 : c[4]);
                if (empty(c)) this.empties.add(k);
                if (!this.owners.has(k) && c[4] > 0 && eventValue(this.events.get(k), o) > 0) this.rewards.set(k, eventValue(this.events.get(k), o));
            }
            for (const anchor of this.stones.keys()) this.rewards.set(anchor, eventValue(this.events.get(anchor), o));
            this.barrier = unknownBarrier(state, this.stones, o.window_back);
            this.disabled = new Set(limited ? [] : [...state.disabledAreaTools, ...[BOMB, DRILL].filter(t => !(state.inventory[t] > 0))]);
            if (o.noBomb) this.disabled.add(BOMB); if (o.noDrill) this.disabled.add(DRILL);
            const stock = t => limited ? Math.max(0, state.inventory[t] || 0) : 0;
            this.start = {cleared: new Set(), revealed: new Set(this.keys.filter(k => this.cells.get(k)[5] === 1)), base: Number(state.map[0][6]),
                picks: o.goldOnly ? 0 : stock(PICK), gold: o.noGold ? 0 : stock(GOLD_PICK), bombs: stock(BOMB), drills: stock(DRILL),
                actions: [], usedPicks: 0, usedGold: 0, usedBombs: 0, usedDrills: 0, value: 0};
            this.adj = new Map(this.keys.map(k => [k, [k - 256, k + 256, k - 1, k + 1].filter(n => this.cells.has(n) && Math.abs(col(n) - col(k)) <= 1)]));
        }
        check() {if (this.deadline != null && Date.now() >= this.deadline) throw TIMEOUT;}
        window(k, r) {return depth(k) >= r.base - this.o.window_back && depth(k) <= r.base + 1;}
        complete(anchor, r) {return Array.from(this.stones.get(anchor)).every(k => r.cleared.has(k));}
        completed(r) {return Array.from(this.stones.keys()).filter(a => this.complete(a, r)).length;}
        supported(k, r) {return depth(k) >= r.base - this.o.window_back && (this.barrier == null || depth(k) < this.barrier) && (this.hp.has(k) || this.empties.has(k) || this.owners.has(k));}
        open(k, r) {return this.empties.has(k) || r.cleared.has(k);}
        operable(k, r) {return this.supported(k, r) && r.revealed.has(k) && depth(k) <= r.base + 1;}
        cost(r) {return this.o.pickaxe_cost * (r.usedPicks + r.usedGold) + this.o.bomb_cost * r.usedBombs + this.o.drill_cost * r.usedDrills;}
        objective(r) {return [this.completed(r), r.value - this.cost(r), r.value, -this.cost(r), -r.usedBombs - r.usedDrills, -r.actions.length];}
        advance(r, cleared, budget, extra = []) {
            const next = {...r, ...budget, cleared: new Set([...r.cleared, ...cleared]), revealed: new Set([...r.revealed, ...extra]), actions: [...r.actions, ...budget.actions]};
            let pending = new Set([...cleared, ...extra.filter(k => this.open(k, next))]);
            while (true) {
                const queue = Array.from(pending).filter(k => this.open(k, next) && this.window(k, next)), visited = new Set();
                for (let i = 0; i < queue.length; i++) {
                    const k = queue[i]; if (visited.has(k)) continue; visited.add(k); next.revealed.add(k);
                    for (const n of this.adj.get(k) || []) {
                        if (this.barrier != null && depth(n) >= this.barrier) continue;
                        next.revealed.add(n); if (this.open(n, next) && this.window(n, next) && !visited.has(n)) queue.push(n);
                    }
                }
                const bottom = this.keys.filter(k => depth(k) === next.base + 1 && this.open(k, next) && next.revealed.has(k));
                if (!bottom.length || (this.barrier != null && next.base + 1 >= this.barrier)) break;
                next.base++; pending = new Set(bottom);
            }
            // Group rewards so path ordering cannot change tie scores.
            const counts = new Map(); for (const k of next.cleared) if (this.rewards.has(k)) {const v = this.rewards.get(k); counts.set(v, (counts.get(v) || 0) + 1);}
            next.value = sorted(counts.keys()).reduce((sum, v) => sum + v * counts.get(v), 0);
            return next;
        }
        pickBudget(r, keys, returned = 0) {
            if (!this.limited) return {picks: 0, gold: 0, usedPicks: r.usedPicks + (this.o.goldOnly ? 0 : keys.length), usedGold: this.o.goldOnly ? r.usedGold + keys.length : 0, actions: keys.map(k => [k, this.o.goldOnly ? GOLD_PICK : PICK])};
            const normal = Math.min(r.picks, keys.length), gold = keys.length - normal;
            return {picks: r.picks - normal + returned, gold: r.gold - gold, usedPicks: r.usedPicks + normal, usedGold: r.usedGold + gold, actions: keys.map((k, i) => [k, i < normal ? PICK : GOLD_PICK])};
        }
        stone(r, first) {
            const anchor = this.owners.get(first), active = Object.hasOwn(dict(this.state.map[6]), anchor);
            if ((!active && ((this.tool != null && this.tool !== PICK) || !this.operable(first, r))) || !this.hp.has(first) || r.cleared.has(first)) return null;
            const members = this.stones.get(anchor), remaining = [first, ...sorted(members).filter(k => k !== first && this.hp.has(k) && !r.cleared.has(k))];
            if (this.limited && remaining.length > r.picks + r.gold) return null;
            return this.advance(r, members, this.pickBudget(r, remaining));
        }
        pick(r, k) {
            const anchor = this.owners.get(k); if (anchor != null && !this.complete(anchor, r)) return this.stone(r, k);
            if ((this.tool != null && this.tool !== PICK) || !this.operable(k, r) || this.open(k, r)) return null;
            const hp = this.hp.get(k); if (hp == null || (this.limited && hp > r.picks + r.gold)) return null;
            const e = this.events.get(k) || {}, returned = Number(e[3] === 500501 && e[4] === 18);
            return this.advance(r, [k], this.pickBudget(r, Array(hp).fill(k), returned));
        }
        area(k, r, tool, knownOnly = true) {
            const clear = [], reveal = [];
            if (tool === BOMB) {
                for (let d = Math.max(1, depth(k) - 2); d <= depth(k) + 2; d++) for (let x = Math.max(1, col(k) - 2); x <= Math.min(6, col(k) + 2); x++) if (Math.abs(d - depth(k)) + Math.abs(x - col(k)) <= 2) clear.push(d * 256 + x);
            } else {
                for (let d = Math.max(1, r.base - this.o.window_back); d <= r.base + 1; d++) {
                    clear.push(d * 256 + col(k)); for (const x of [col(k) - 1, col(k) + 1].filter(x => x >= 1 && x <= 6)) {reveal.push(d * 256 + x); if (d === r.base + 1) clear.push(d * 256 + x);}
                }
                reveal.push(...clear);
            }
            return knownOnly ? [clear.filter(n => this.cells.has(n)), reveal.filter(n => this.cells.has(n))] : [clear, reveal];
        }
        aoe(r, k, tool) {
            if (this.disabled.has(tool) || (this.tool != null && this.tool !== tool) || (this.limited && (tool === BOMB ? r.bombs : r.drills) <= 0) || !this.operable(k, r) || !this.open(k, r)) return null;
            const [footprint, reveal] = this.area(k, r, tool);
            if (this.barrier != null && footprint.some(n => depth(n) >= this.barrier)) return null;
            if (Array.from(this.stones).some(([a, members]) => !this.complete(a, r) && footprint.some(n => members.has(n)))) return null;
            const targets = footprint.filter(n => !r.cleared.has(n) && [1, 2].includes(this.hp.get(n)) && depth(n) >= r.base - this.o.window_back);
            if (!targets.length) return null;
            const returned = targets.filter(n => {const e = this.events.get(n) || {}; return e[3] === 500501 && e[4] === 18;}).length;
            return this.advance(r, targets, {picks: this.limited ? r.picks + returned : 0, bombs: this.limited ? r.bombs - Number(tool === BOMB) : 0,
                drills: this.limited ? r.drills - Number(tool === DRILL) : 0, actions: [[k, tool]], usedBombs: r.usedBombs + Number(tool === BOMB), usedDrills: r.usedDrills + Number(tool === DRILL)}, reveal);
        }
        paths(r) {
            const costs = new Map(), parents = new Map(), queue = new Heap();
            for (const k of this.keys) if (this.operable(k, r)) {const cost = this.open(k, r) ? 0 : this.hp.get(k); if (cost != null) {costs.set(k, cost); parents.set(k, null); queue.push([cost, k]);}}
            while (queue.items.length) {
                this.check(); const [cost, k] = queue.pop(); if (cost !== costs.get(k)) continue;
                for (const n of this.adj.get(k)) if (this.supported(n, r)) {const step = this.open(n, r) ? 0 : this.hp.get(n); if (step != null && cost + step < (costs.get(n) ?? Infinity)) {costs.set(n, cost + step); parents.set(n, k); queue.push([cost + step, n]);}}
            }
            return [costs, parents];
        }
        follow(key, parents, cache) {
            if (!parents.has(key)) return null; const path = [];
            while (!cache.has(key)) {path.push(key); key = parents.get(key);}
            let r = cache.get(key);
            for (const k of path.reverse()) {this.check(); if (r && !this.open(k, r)) r = this.pick(r, k); cache.set(k, r);}
            return r;
        }
    }
    function choose(w) {
        const start = w.start, [costs, parents] = w.paths(start), cache = new Map([[null, start]]), stones = [];
        for (const [a, members] of Array.from(w.stones).sort((a, b) => a[0] - b[0])) {
            w.check(); if (w.complete(a, start) || !Array.from(members).some(k => w.supported(k, start))) continue;
            for (const k of sorted(members)) {const r = w.follow(k, parents, cache); if (r && w.completed(r) > w.completed(start)) stones.push({r, k});}
        }
        const localStones = stones.filter(({k}) => Array.from(w.stones.get(w.owners.get(k))).some(n => w.hp.has(n) && w.window(n, start)));
        if (localStones.length) {
            localStones.sort((a, b) => compare([depth(w.owners.get(a.k)), w.cost(a.r), -a.r.value, a.r.actions.length, a.k], [depth(w.owners.get(b.k)), w.cost(b.r), -b.r.value, b.r.actions.length, b.k]));
            const stationary = localStones.find(c => c.r.base === start.base);
            if (stationary) return [stationary.r, "trigger_stone", "window_stone_priority", "current_window"];
        }
        const candidates = [], areas = [];
        if (w.tool == null || w.tool === PICK) for (const k of sorted(w.rewards.keys())) {
            w.check(); if (w.owners.has(k) || start.cleared.has(k) || !w.rewards.get(k) || !w.supported(k, start)) continue;
            const r = w.follow(k, parents, cache); if (r && w.completed(r) === w.completed(start) && r.value - w.cost(r) > 0) candidates.push({k, r, area: 0, net: r.value - w.cost(r)});
        }
        for (const tool of (w.tool === PICK ? [] : w.tool == null ? [BOMB, DRILL] : [w.tool])) {
            w.check(); if (w.disabled.has(tool) || (w.limited && (tool === BOMB ? start.bombs : start.drills) <= 0)) continue;
            for (const k of w.keys) {
                w.check(); if (!w.operable(k, start) || !w.open(k, start)) continue;
                const r = w.aoe(start, k, tool); if (!r) continue;
                const pickCost = Array.from(r.cleared).filter(n => !start.cleared.has(n) && !w.owners.has(n)).reduce((v, n) => v + (w.hp.get(n) || 0) * w.o.pickaxe_cost, 0);
                if (pickCost > (tool === BOMB ? w.o.bomb_cost : w.o.drill_cost) && r.value - w.cost(r) > 0) areas.push({k, r, area: 1, net: r.value - w.cost(r), tool, pickCost});
            }
        }
        areas.sort((a, b) => compare([depth(a.k), -a.net, -a.r.value, w.cost(a.r), -a.pickCost, a.tool, a.k], [depth(b.k), -b.net, -b.r.value, w.cost(b.r), -b.pickCost, b.tool, b.k]));
        candidates.push(...areas);
        const local = candidates.filter(c => c.area ? Array.from(c.r.cleared).some(k => w.window(k, start) && w.rewards.get(k) > 0) : w.window(c.k, start));
        // A drill fired from a shallow empty cell can scroll the entire window.
        // Finish profitable routes that preserve the window before any scrolling
        // route, including an untriggered stone. Active events are handled in plan().
        const stationary = local.filter(c => c.r.base === start.base);
        if (!stationary.length && localStones.length)
            return [localStones[0].r, "trigger_stone", "window_stone_priority", "current_window"];
        if (local.length || (!stones.length && candidates.length)) {
            const pool = stationary.length ? stationary : local.length ? local : candidates;
            pool.sort((a, b) => compare([depth(a.k), -a.net, a.area, -a.r.value, w.cost(a.r), a.r.actions.length, a.k], [depth(b.k), -b.net, b.area, -b.r.value, w.cost(b.r), b.r.actions.length, b.k]));
            return [pool[0].r, "collect", "selected_positive_target", local.length ? "current_window" : "known_map"];
        }
        if (stones.length) {
            stones.sort((a, b) => compare([...w.objective(b.r), -depth(b.k), -b.k], [...w.objective(a.r), -depth(a.k), -a.k]));
            return [stones[0].r, "trigger_stone", "stone_priority", "known_map"];
        }
        const advances = [];
        if (w.tool == null || w.tool === PICK) for (const k of sorted(costs.keys())) {
            w.check(); if (depth(k) !== start.base + 1 || w.open(k, start)) continue;
            const r = w.follow(k, parents, cache); if (r && r.base > start.base) advances.push({k, r});
        }
        if (advances.length) {advances.sort((a, b) => compare([w.cost(a.r), a.r.actions.length, a.k], [w.cost(b.r), b.r.actions.length, b.k])); return [advances[0].r, "explore", "viewport_progress", "known_map"];}
        return [start, "blocked", w.barrier != null ? "unknown_boundary" : Array.from(w.rewards).some(([k, v]) => v > 0 && !w.owners.has(k) && !start.cleared.has(k) && w.supported(k, start)) ? "no_positive_net_reward" : "no_modelled_route", "known_map"];
    }
    function prefix(w, selected) {
        if (selected.base === w.start.base) return selected;
        let r = w.start;
        while (r.actions.length < selected.actions.length) {
            w.check(); const [k, t] = selected.actions[r.actions.length], next = [PICK, GOLD_PICK].includes(t) ? w.pick(r, k) : w.aoe(r, k, t);
            if (!next || next.actions.some((a, i) => compare(a, selected.actions[i]) !== 0)) throw new Error("Flash 窗口前缀与候选路线不一致");
            r = next; if (r.base !== w.start.base) break;
        }
        return r;
    }
    function actionParts(action) {if (Array.isArray(action)) return action; return action.payload || [action.mapId || 1, ...action.pos, action.tool_id];}
    function predictAction(input, action, options = {}, checkInventory = false, executionChecks = checkInventory) {
        const state = normalize(input), o = optionsFor(options), [mapId, d, x, tool] = actionParts(action), k = d * 256 + x;
        if (mapId !== state.mapId || state.problem || !state.ready) throw new Error("模拟需要同一地图的完整快照");
        // Tool preferences constrain planning; actual stock accounting keeps
        // both pick categories even when one is excluded from the search.
        const w = new World(state, {...o, noGold: false, goldOnly: false}, null, null, checkInventory), active = dict(state.map[6]), anchor = w.owners.get(k);
        if (executionChecks) {
            if (state.disabledAreaTools.includes(tool) || (tool === GOLD_PICK && o.noGold) || (tool === PICK && o.goldOnly)) throw new Error("该工具已禁用");
            if ([BOMB, DRILL].includes(tool)) {
                // Live validation uses the entire physical footprint, including
                // cells absent from the snapshot. Search retains Python World's
                // known-cell footprint and is only a prediction.
                const [footprint] = w.area(k, w.start, tool, false);
                if ((w.barrier != null && footprint.some(n => depth(n) >= w.barrier)) ||
                    Array.from(w.stones.values()).some(members => footprint.some(n => members.has(n)))) throw new Error("工具范围涉及未确认的特殊对象，只能用铁锹处理特殊事件");
            }
        }
        if (Object.keys(active).length && (Object.keys(active).length !== 1 || !Object.hasOwn(active, anchor))) throw new Error("活动特殊事件只能挖已确认的所属格子");
        if (!(Object.keys(active).length && anchor != null) && !w.operable(k, w.start)) throw new Error("模拟动作不在可操作窗口或尚未解锁");
        if (checkInventory && [PICK, GOLD_PICK].includes(tool) && !(state.inventory[tool] > 0)) throw new Error("模拟铁锹库存不足");
        const result = clone(state), tiles = result.map[3]; let r = null;
        if (anchor != null) {
            if (![PICK, GOLD_PICK].includes(tool) || !w.hp.has(k)) throw new Error("特殊大石头只能用铁锹挖尚未清除的所属格子");
            if (checkInventory) result.inventory[tool]--;
            result.map[4][anchor][4] -= tiles[k][4]; tiles[k][4] = 0;
            if (result.map[4][anchor][4] > 0) {
                if (!Object.keys(active).length) {result.map[6] = result.map[6] || {}; result.map[6][anchor] = {0: 2, 1: d, 2: x, 3: d}; result.map[0][6] = Math.max(w.start.base, d);}
                return result;
            }
            r = w.advance(w.start, w.stones.get(anchor), {picks: result.inventory[PICK] || 0, gold: result.inventory[GOLD_PICK] || 0, actions: [[k, tool]]});
            delete result.map[4][anchor]; if (result.map[6]) delete result.map[6][anchor]; if (result.map[1]) delete result.map[1][anchor];
            for (const member of w.stones.get(anchor)) tiles[member][0] = 0;
        } else if ([PICK, GOLD_PICK].includes(tool) && w.hp.get(k) > 1) {
            tiles[k][4]--; if (checkInventory) result.inventory[tool]--; return result;
        } else if ([PICK, GOLD_PICK].includes(tool) && w.hp.get(k) === 1) {
            const e = w.events.get(k) || {}, returned = Number(e[3] === 500501 && e[4] === 18);
            r = w.advance(w.start, [k], {picks: w.start.picks - Number(tool === PICK) + returned, gold: w.start.gold - Number(tool === GOLD_PICK), actions: [[k, tool]]});
        } else if ([BOMB, DRILL].includes(tool)) r = w.aoe(w.start, k, tool);
        if (!r) throw new Error("模拟工具、目标或库存不满足操作条件");
        for (const n of r.cleared) Object.assign(tiles[n], {3: 1, 4: 0});
        for (const n of r.revealed) tiles[n][5] = 1;
        result.map[0][6] = r.base;
        if (checkInventory) {result.inventory[PICK] = r.picks; result.inventory[BOMB] = r.bombs; result.inventory[DRILL] = r.drills; if (Object.hasOwn(result.inventory, GOLD_PICK) || r.gold) result.inventory[GOLD_PICK] = r.gold;}
        return result;
    }
    function applyPredictedAction(input, action, options = {}, checkInventory = false) {
        return predictAction(input, action, options, checkInventory);
    }
    // Preview only: whitelist numeric game fields, never serialize whole state
    // or arbitrary metadata. Keep missing, null, numeric strings and zero distinct.
    function diagnosticValue(value) {
        if (value === undefined) return "缺失";
        if (value === null) return "null";
        if (["number", "boolean"].includes(typeof value)) return String(value);
        if (typeof value === "string") return value === "" || /^[+-]?\d+(?:\.\d+)?$/.test(value) ? JSON.stringify(value) : "<非数字字符串>";
        return Array.isArray(value) ? "<数组>" : "<对象>";
    }
    function diagnosticEvent(event) {
        if (!event || typeof event !== "object" || Array.isArray(event)) return diagnosticValue(event);
        return `{类型=${diagnosticValue(event[3])},内容=${diagnosticValue(event[4])},数量=${diagnosticValue(event[5])}}`;
    }
    function inspectWindow(input, options = {}) {
        const state = normalize(input), o = optionsFor(options);
        if (state.problem || !state.ready) throw new Error(state.problem || "缺少完整 Login 矿场快照");
        if (!Number.isInteger(state.map[0] && state.map[0][6])) throw new Error("矿场缺少进度字段");
        const w = new World(state, o), first = Math.max(1, w.start.base - o.window_back), last = w.start.base + 1;
        const tiles = dict(state.map[3]), events = dict(state.map[1]), details = dict(state.rewardDetails[state.mapId]), blocks = dict(state.map[4]);
        const otherRewards = new Set([300202,500501,500502,500503,500504]);
        const cells = [];
        for (let d = first; d <= last; d++) for (let x = 1; x <= 6; x++) {
            const k = d * 256 + x, raw = tiles[k], tile = dict(raw), anchor = w.owners.get(k), event = w.events.get(anchor ?? k);
            const blockKey = anchor ?? ([undefined,null,0,false,'','0'].includes(tile[0]) ? k : tile[0]);
            const block = blocks[blockKey], notes = [], category = eventCategory(event, o);
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) notes.push("格子数据=" + diagnosticValue(raw));
            if (empty(tile)) notes.push("空格");
            if (Number.isInteger(tile[4]) && tile[4] <= 0) notes.push("已清空/已击中");
            if (anchor != null) notes.push(`石头成员，整块奖励在锚点(${depth(anchor)},${col(anchor)})计一次`);
            else if (tile[0] != null && tile[0] !== false && String(tile[0]).trim() !== "" && String(tile[0]).trim() !== "0") notes.push("石头归属未识别");
            if (tile[5] !== 1) notes.push("解锁标记非1");
            if (!w.hp.has(k) && !w.empties.has(k) && anchor == null && raw) notes.push("地形/耐久未建模");
            if (w.barrier != null && d >= w.barrier) notes.push(`未知特殊对象边界(${w.barrier})及以下`);
            if (!event) notes.push("无有效奖励记录");
            else if (event[3] == null) notes.push("有效记录缺少事件类型");
            else if (category == null && !otherRewards.has(Number(event[3]))) notes.push("未知事件类型");
            else if (![1,2].includes(category) && !otherRewards.has(Number(event[3]))) notes.push("该事件未配置估值");
            else if (eventValue(event, o) === 0) notes.push("配置估值为0");
            cells.push({position:[d,x], terrain:diagnosticValue(tile[3]), hp:diagnosticValue(tile[4]),
                bright:diagnosticValue(tile[5]), owner:diagnosticValue(tile[0]), award:diagnosticValue(tile[6]),
                block:block ? `{类型=${diagnosticValue(block[3])},耐久=${diagnosticValue(block[4])},Award=${diagnosticValue(block[6])}}` : diagnosticValue(block),
                events:diagnosticEvent(events[k]), response:diagnosticEvent(details[k]),
                source:event?.source || "无", effective:diagnosticEvent(event),
                category:category === 1 ? "矿石" : category === 2 ? "宝石" : category == null ? "配置缺失" : "其他",
                value:eventValue(event, o),
                modelValue:w.rewards.get(k) || 0, notes});
        }
        return {mapId:state.mapId, base:w.start.base, window:[first,last], revision:diagnosticValue(input.revision),
            tools:{goldOnly:!!o.goldOnly, allowGold:!o.noGold, bomb:!o.noBomb, drill:!o.noDrill},
            disabledTools:[BOMB,DRILL].filter(t => w.disabled.has(t)), cells};
    }
    function plan(input, options = {}) {
        const state = normalize(input), o = optionsFor(options);
        if (state.problem || !state.ready) throw new Error(state.problem || "缺少完整 Login 矿场快照");
        if (!Number.isInteger(state.map[0] && state.map[0][6])) throw new Error("矿场缺少进度字段");
        const tool = options.tool == null ? null : options.tool;
        if (![null, PICK, BOMB, DRILL].includes(tool)) throw new Error("未知工具");
        const started = Date.now(), w = new World(state, o, tool, started + o.time_budget_seconds * 1000);
        let best = w.start, mode = "blocked", reason = "no_modelled_route", scope = Object.keys(dict(state.map[6])).length ? "active_event" : "known_map", timedOut = false;
        try {
            const active = Object.keys(dict(state.map[6]));
            if (active.length) {
                const anchor = Number(active[0]); if (active.length !== 1 || !w.stones.has(anchor)) throw new Error("特殊事件需按已确认范围单独处理");
                const remaining = sorted(w.stones.get(anchor)).filter(k => w.hp.has(k));
                if (!remaining.length) reason = "active_stone_already_complete";
                else {best = w.stone(w.start, remaining[0]); mode = "special";
                    if (best) reason = "active_stone_complete";
                    else {best = {...w.start, ...w.pickBudget(w.start, remaining.slice(0, w.limited ? w.start.picks + w.start.gold : remaining.length))}; reason = "active_stone_inventory_shortage";}}
            } else {let selected; [selected, mode, reason, scope] = choose(w); best = prefix(w, selected);}
        } catch (error) {if (error !== TIMEOUT) throw error; timedOut = true; reason = "time_budget_exhausted";}
        w.deadline = null;
        const actions = best.actions.map(([k, t]) => ({key: String(k), pos: [depth(k), col(k)], tool_id: t, payload: [state.mapId, depth(k), col(k), t]}));
        const predictedStates = []; let current = state;
        for (const action of actions) {current = predictAction(current, action, o, w.limited, false); predictedStates.push(current);}
        const collected = [], abandoned = [], unresolved = [], unavailable = [], window_rewards = [];
        for (const k of sorted(w.rewards.keys())) {
            const e = w.events.get(k) || {}, row = {tile_key: String(k), position: [depth(k), col(k)], event_type: Number(e[3] || 0), content_id: e[4] || 0, source: e.source, value: w.rewards.get(k)};
            if (w.window(k, w.start)) window_rewards.push(row);
            (best.cleared.has(k) ? collected : depth(k) < w.start.base - o.window_back ? unavailable : w.barrier != null && depth(k) >= w.barrier ? unresolved : abandoned).push(row);
        }
        return {actions, predictedStates, mode, algorithm: "flash_greedy_dijkstra", optimality: "heuristic", inventory_limited: w.limited,
            disabled_tools: sorted(w.disabled), initial_base: w.start.base, final_base: best.base, known_tiles: w.cells.size,
            reward_value: best.value, tool_cost: w.cost(best), net_value: best.value - w.cost(best), window_rewards, collected, abandoned, unresolved, unavailable,
            spent: {pickaxe: best.usedPicks, golden_pickaxe: best.usedGold, bomb: best.usedBombs, drill: best.usedDrills},
            remaining_tools: w.limited ? {pickaxe: best.picks, golden_pickaxe: best.gold, bomb: best.bombs, drill: best.drills} : null,
            stone_targets: sorted(w.stones.keys()).filter(a => w.complete(a, best)).map(String), special_barrier_depth: w.barrier,
            active_event_required: Object.keys(dict(state.map[6])).length > 0, flash_stop_reason: reason, flash_planning_scope: scope,
            time_budget_exhausted: timedOut, planning_elapsed_seconds: (Date.now() - started) / 1000,
            planning_stopped: actions.length ? null : reason === "unknown_boundary" ? "遇到未知特殊对象边界，停止继续探索" : timedOut ? "规划达到总时间预算，未产出本轮可验证短路线" : "没有可执行的模型路线"};
    }
    const api = Object.freeze({plan, inspectWindow, applyPredictedAction, knownStones, defaults, PICK, GOLD_PICK, BOMB, DRILL});
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.Minerv7FlashPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* Browser adapter. Bundled after minerv7_state.js and minerv7_flash_planner.js; no remote dependencies. */
(function () {
    'use strict';
    const P = globalThis.Minerv7FlashPlanner;
    const get = (o, k) => { try { return o?.[k]; } catch (_) { return undefined; } };
    const {MineState, protocolItems, fingerprint, cacheView} = globalThis.Minerv7State;
    const clone = value => JSON.parse(JSON.stringify(value));
    const base = () => Number(state.map?.["0"]?.["6"] || 0);
    function decodeBytes(input) {
        const bytes = ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : new Uint8Array(input);
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
    if (typeof window === 'undefined') return;
    let root = window;
    try { while (root.parent !== root && root.parent.document) root = root.parent; } catch (_) {}
    const INSTANCE = '__minerv7FlashUserscriptV1';
    const previous = get(root, INSTANCE);
    if (previous?.document === root.document) { previous.mount(); return; }
    const doc = root.document;
    const instance = {document:doc, version:'0.2.5', mount:()=>ui()};
    let state = new MineState(), owner = null, running = false, busy = false, pending = null, internalSend = false;
    let poisoned = false, panel, output, status, settings, confirmedAt = null, cache = null;
    const bindings = new WeakMap();
    function log(text) {
        if (!output) return;
        const line = doc.createElement('div'); line.textContent = `${new Date().toLocaleTimeString()} ${text}`;
        output.append(line); while (output.children.length > 180) output.firstChild.remove(); output.scrollTop = output.scrollHeight;
    }
    function stop(reason) { running = false; if(reason) log(reason); }
    function alive(o) { try { return o && !o.win.closed && o.win.document === o.document && o.win.ClientMessageHandle === o.handle; } catch (_) { return false; } }
    function fail(reason) {
        stop(reason); cache = null; poisoned = true;
        if(pending) pending.fail(new Error(reason));
    }
    function receive(binding, result, rawId = 0) {
        if (!alive(binding)) return;
        if (ArrayBuffer.isView(result) || result instanceof ArrayBuffer) result = decodeBytes(result);
        const names = {4000:'MinePlusOpen',4001:'MinePlusDig',4004:'MinePlusEventChoose',4014:'MinePlusExitHiddenMap',
            65535:'Login',64536:'SynData',64535:'ErrorMsg',65530:'TickOut'};
        let items = protocolItems(result,names);
        // For a bare decoded payload only use an observed protocol-table name,
        // or the established Login/SynData/error response IDs.
        if (!items.length) {
            const entry = Object.values(binding.protocols).find(p => p?.protoId === rawId);
            const name = entry?.className || names[rawId];
            if(name) items = [{className:name, data:result}];
        }
        if (owner !== binding) {
            if (!items.some(i => i.className === 'Login')) return;
            if(owner && (running || pending)) { fail('游戏上下文切换，已停止；请刷新。'); return; }
            owner = binding; state = new MineState(); cache = null;
            log('已连接 Lyra，等待完整 MinePlus 快照。');
        }
        // Apply a whole decoded frame before resolving a transaction: a late
        // error in the same frame must win over an earlier acknowledgement.
        for (const item of items) {
            const name = item.className;
            if (name === 'ErrorMsg' || name === 'TickOut') { fail(`服务器 ${name}：${item.data?.Code ?? '未知'}；已停止`); return; }
            if (name === 'Login' && (running || pending)) { fail('运行期间重新登录，已停止；请刷新。'); return; }
            if (name === 'Login' && Number(item.data?.Code || 0) !== 0) { fail('登录失败，无法初始化矿区'); return; }
            state.apply_message(name, item.data);
            if (pending && name === 'MinePlusDig') pending.acked = true;
        }
        if (state.problem) { fail(`矿区解析失败：${state.problem}`); return; }
        if (pending) pending.check();
    }
    function install(win) {
        const handle = get(win,'ClientMessageHandle'), game = get(get(win,'$Global'),'core')?.Game;
        if (typeof get(handle,'sendTcp') !== 'function' || !game?.Protocols) return;
        const old = bindings.get(win);
        if (old && old.document === win.document && old.handle === handle) { hookDecoders(old,game); return; }
        const binding = {win,document:win.document,handle,protocols:game.Protocols,hooked:new WeakSet()};
        bindings.set(win,binding);
        const send = handle.sendTcp;
        handle.sendTcp = function(proto,data) {
            if (!internalSend && (running || pending) && [4000,4001,5001,5002].includes(proto?.protoId)) {
                if(pending) fail('检测到手动挖矿，响应归属不确定；请刷新。');
                else { stop('检测到手动挖矿，已停止自动执行。'); cache = null; }
            }
            return send.apply(this,arguments);
        };
        hookDecoders(binding,game);
    }
    function hookDecoders(binding,game) {
        for(const obj of [game.Message,game,get(binding.win,'$Global')?.core,binding.handle]) {
            if (!obj || typeof get(obj,'decodeMessage') !== 'function' || binding.hooked.has(obj)) continue;
            const original = obj.decodeMessage;
            obj.decodeMessage = function(...args) {
                let rawId = 0;
                try {
                    const a=args[0];
                    if(typeof a === 'number') rawId=a;
                    else { const bytes=ArrayBuffer.isView(a)?new Uint8Array(a.buffer,a.byteOffset,a.byteLength):new Uint8Array(a); if(bytes.length>=6) rawId=bytes[4]|bytes[5]<<8; }
                } catch (_) {}
                const observe=res=> { try { receive(binding,res,rawId); } catch (_) { fail('响应解析失败，结果未知；请刷新。'); } };
                if(typeof args[1] === 'function') { const cb=args[1]; args[1]=function(res) { observe(res); return cb.apply(this,arguments); }; return original.apply(this,args); }
                const res=original.apply(this,args);
                if(res && typeof res.then === 'function') res.then(observe,()=>{}); else observe(res);
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
        if(owner && !alive(owner)) {
            if(pending) fail('连接丢失，发送结果未知；请刷新。'); else stop('游戏框架已重建，等待完整同步。');
            owner=null; state=new MineState(); cache=null;
        }
        if(status) status.textContent=`${state.ready?'已同步':'等待完整 Login'} · 深度 ${state.ready?base():'—'} · 地块 ${Object.keys(state.map?.['3'] || {}).length} · 普通镐 ${state.inventory[11070001]??'?'} · 黄金镐 ${state.inventory[11070011]??'?'}${busy?' · 执行中':''}${poisoned?' · 需刷新':''}`;
    }
    function options() {
        // Read the same config table as MinePlus.eventTypeOf, from the owner
        // frame (not the panel's root). Never retain client objects across runs.
        const table=get(get(owner?.win,'ConfigLoad'),'EventConfigData');
        const rows=typeof get(table,'getAll') === 'function' ? table.getAll() : null;
        const eventCategories={};
        for(const [id,row] of Object.entries(rows || {})) {
            const category=Number(row?.eventType), key=Number(id);
            if(Number.isInteger(key) && key>0 && Number.isInteger(category) && category>0) eventCategories[key]=category;
        }
        if(!Object.keys(eventCategories).length) throw new Error('等待客户端矿场奖励配置加载，请稍后重试');
        return {eventCategories:Object.freeze(eventCategories),goldOnly:settings.gold.checked,noGold:!settings.allowGold.checked,noBomb:!settings.bomb.checked,noDrill:!settings.drill.checked};
    }
    function ready() {
        if(poisoned) throw new Error('上次执行结果未知或会话失效，请刷新游戏');
        if(!alive(owner) || !state.ready || state.problem) throw new Error(state.problem || '请刷新游戏并等待完整 Login 矿场同步');
    }
    function view(value) { const result=cacheView(value); delete result.tools; return JSON.stringify(result); }
    function nextAction(opts) {
        state.trackExhaustedAreaTools();
        const picks=opts.goldOnly?0:Number(state.inventory[11070001] || 0);
        const gold=opts.noGold?0:Number(state.inventory[11070011] || 0);
        if(picks+gold<=0) throw new Error('可用铁锹（含金铁锹）耗尽，已停止');
        if(cache && (cache.expected !== view(state) || cache.actions.some(a=>state.disabledAreaTools.includes(a.tool_id)))) cache=null;
        if(!cache || !cache.actions.length) {
            const report=P.plan(state,opts);
            cache={actions:report.actions.slice(),expected:view(state)};
            log(`Flash ${report.flash_planning_scope || ''}：${report.actions.length} 步 · ${report.flash_stop_reason || ''}`);
        }
        if(!cache.actions.length) return null;
        const action=clone(cache.actions[0]);
        if([11070001,11070011].includes(action.tool_id)) action.tool_id=picks>0?11070001:11070011;
        action.payload=[state.mapId,...action.pos,action.tool_id];
        // The predictor validates the next cached action against current
        // authoritative terrain, including active-event membership.
        const predicted=P.applyPredictedAction(state,action,opts,true);
        return {action,predicted};
    }
    function send(action) {
        const bound=owner;
        const proto=Object.values(bound.protocols).find(p=>p?.protoId===0x0fa1);
        if(!proto) return Promise.reject(new Error('游戏协议表缺少 MinePlusDig (0x0fa1)'));
        action.event=String(state.map?.["3"]?.[action.key]?.["0"] || "");
        const footprint=globalThis.Minerv7State.actionFootprint(state,action);
        const before=fingerprint(state,action,footprint), revision=state.revision;
        const toolsBefore=Number(state.inventory[action.tool_id] || 0);
        return new Promise((resolve,reject)=> {
            let finished=false;
            const timer=root.setTimeout(()=>{poisoned=true;finish(new Error('响应或状态确认超时，结果未知；请刷新，不会重发'));},8000);
            function finish(err) {
                if(finished) return; finished=true; root.clearTimeout(timer); pending=null;
                if(err) reject(err); else { confirmedAt=Date.now(); resolve(); }
            }
            pending={owner:bound,action,acked:false,fail:finish,check:()=>{
                if(!pending?.acked || state.revision<=revision || fingerprint(state,action,footprint)===before) return;
                if([11070002,11070003].includes(action.tool_id) && Number(state.inventory[action.tool_id] || 0)>=toolsBefore) return;
                finish();
            }};
            try { internalSend=true; bound.handle.sendTcp(proto,action.payload); }
            catch (_) { poisoned=true;finish(new Error('发送异常，结果未知；请刷新，不会重试')); }
            finally { internalSend=false; }
        });
    }
    const sleep=ms=>new Promise(resolve=>root.setTimeout(resolve,ms));
    async function run(single=false) {
        if(busy) return;
        try {
            ready(); const opts=options();
            if(opts.goldOnly && opts.noGold) throw new Error('仅黄金镐模式需要同时允许黄金镐');
            const maxPicks=Number(settings.picks.value), maxLayers=Number(settings.layers.value), maxMinutes=Number(settings.minutes.value);
            if(![maxPicks,maxLayers,maxMinutes].every(n=>Number.isFinite(n)&&n>=0)) throw new Error('停止上限必须是非负数，0 表示不限制');
            busy=true; running=true; cache=null; state.disabledAreaTools=[];
            for(const input of Object.values(settings)) input.disabled=true;
            const initial=base(), started=Date.now(); let picks=0;
            while(running) {
                ready();
                if((maxPicks && picks>=maxPicks)||(maxLayers && base()-initial>=maxLayers)||(maxMinutes && Date.now()-started>=maxMinutes*60000)) { stop('已达到停止上限。'); break; }
                if(confirmedAt !== null) await sleep(Math.max(0,150-(Date.now()-confirmedAt)));
                if(!running) break;
                ready();
                const next=nextAction(opts);
                if(!next) { stop('没有可执行路线，已停止。'); break; }
                // Yield after planning so a queued stop, context switch or
                // sync can invalidate the proposal before it reaches sendTcp.
                const before=view(state);
                await sleep(0);
                if(!running) break;
                ready();
                if(maxMinutes && Date.now()-started>=maxMinutes*60000) { stop('已达到时间上限。'); break; }
                if(before!==view(state)) { cache=null; continue; }
                const {action,predicted}=next;
                if(!(state.inventory[action.tool_id]>0)) throw new Error('工具库存不足，已停止');
                log(`挖掘 (${action.pos.join(', ')}) 工具 ${action.tool_id}`);
                await send(action);
                if(cache) { cache.actions.shift(); cache.expected=view(predicted); }
                if([11070001,11070011].includes(action.tool_id)) picks++;
                if(single) break;
            }
        } catch(e) { log(e.message); }
        finally { running=false; busy=false; cache=null; for(const input of Object.values(settings)) input.disabled=false; }
    }
    function ui() {
        if(!doc.body) return; // The independent scan timer mounts after body appears.
        if(panel) { if(!doc.body.contains(panel)) doc.body.append(panel); return; }
        const host=doc.createElement('div');
        host.id='cishen-minerv7-flash-panel';
        host.style.cssText='all:initial!important;display:block!important;position:fixed!important;right:14px!important;top:60px!important;z-index:2147483647!important;width:350px!important;max-width:calc(100vw - 28px)!important;max-height:85vh!important;overflow:auto!important;background:#15202b!important;color:#eee!important;padding:14px!important;border:1px solid #617889!important;border-radius:10px!important;font:13px/1.5 sans-serif!important;box-shadow:0 5px 24px #0008!important;visibility:visible!important;opacity:1!important';
        const shadow=typeof host.attachShadow==='function'?host.attachShadow({mode:'open'}):host;
        const controls={};
        function element(tag,parent,text,id) {
            const el=doc.createElement(tag);
            if(text!==undefined) el.textContent=text;
            if(id) { el.id=id; controls[id]=el; }
            parent.append(el); return el;
        }
        element('style',shadow,'button,input{margin:4px;padding:4px}button{cursor:pointer}input[type=number]{width:52px}#log{max-height:200px;overflow:auto;font-size:12px;user-select:text;-webkit-user-select:text}#logCopy{box-sizing:border-box;width:100%;height:140px;user-select:text;-webkit-user-select:text}label{display:inline-block}');
        element('b',shadow,'⛏ Minerv7 Flash · Lyra v0.2.5');
        element('button',shadow,'收起','fold');
        const body=element('div',shadow,undefined,'body');
        element('p',body,'脚本已启动，等待游戏同步','status');
        for(const [id,title,checked] of [['allowGold','允许黄金镐',true],['gold','仅黄金镐',false],['bomb','炸弹',true],['drill','电钻',true]]) {
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
        element('button',body,'复制日志','copyLog');
        const copyStatus=element('div',body,'','copyStatus');
        const copyText=element('textarea',body,undefined,'logCopy');
        copyText.readOnly=true; copyText.hidden=true;
        copyText.setAttribute('aria-label','可复制的日志');
        controls.copyLog.onclick=async()=> {
            const text=Array.from(output.children,line=>line.textContent).join('\n');
            copyText.value=text;
            try {
                await root.navigator.clipboard.writeText(text);
                copyText.hidden=true; copyStatus.textContent='日志已复制';
            } catch (_) {
                copyText.hidden=false;
                copyStatus.textContent='请在下方文本框按 ⌘C / Ctrl+C 复制（手机可长按全选）';
                copyText.focus(); copyText.select();
            }
        };
        const $=id=>controls[id]; status=$('status'); output=$('log'); settings=Object.fromEntries(['allowGold','gold','bomb','drill','picks','layers','minutes'].map(id=>[id,$(id)]));
        $('fold').onclick=()=>{$('body').hidden=!$('body').hidden;};
        $('stop').onclick=()=>stop('已停止；正在等待的动作仍会结算。');
        $('start').onclick=()=>run(); $('step').onclick=()=>run(true);
        $('plan').onclick=()=> { try {
            ready(); const opts=options(), diagnostic=P.inspectWindow(state,opts), tools=diagnostic.tools;
            log(`诊断开始 v0.2.5 · 地图 ${diagnostic.mapId} · Base ${diagnostic.base} · 窗口 ${diagnostic.window.join('..')} · 状态版本 ${diagnostic.revision}`);
            log(`工具开关：允许黄金镐=${tools.allowGold} 仅黄金镐=${tools.goldOnly} 炸弹=${tools.bomb} 钻头=${tools.drill} · 当前禁用范围工具=${diagnostic.disabledTools.join(',') || '无'}`);
            for(const c of diagnostic.cells)
                log(`格 (${c.position.join(',')}) 地形=${c.terrain} 耐久=${c.hp} 解锁=${c.bright} 归属=${c.owner} Award=${c.award} 石块=${c.block} · Events=${c.events} 回包=${c.response} · 采用=${c.source} ${c.effective} 类别=${c.category} 估值=${c.value} 本格计值=${c.modelValue} · 标记=${c.notes.join('；') || '无静态异常'}`);
            log(`诊断结束 · ${diagnostic.cells.length} 格；标记仅说明当前数据，不代表路径筛选结论。`);
            const report=P.plan(state,opts);
            log(`Flash ${report.flash_planning_scope || ''}：${report.actions.length} 步 · ${report.flash_stop_reason || ''}`);
            for(const reward of report.window_rewards || [])
                log(`奖励 (${reward.position.join(',')}) 类型 ${reward.event_type} · 估值 ${reward.value} · 来源 ${reward.source}`);
            for(const a of report.actions.slice(0,25)) log(`挖掘 (${a.pos.join(',')}) 工具 ${a.tool_id}`);
        } catch(e) { log(e.message); } };
        doc.body.append(host); panel=host;
        log('脚本 v0.2.5 已启动。请先进入矿区；预览不发包。');
    }
    // Publish the singleton only after successful initial UI construction.
    ui(); root[INSTANCE]=instance; scan(); root.setInterval(scan,500);
})();

})();
