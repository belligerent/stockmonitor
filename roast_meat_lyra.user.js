// ==UserScript==
// @name         Roast Meat Detector - Lyra 烤肉检测
// @namespace    cishen-roast-lyra-local
// @version      0.1.3
// @description  内置玩家名单，批量查询未被占领的大大烤肉，使用 Lyra 原生协议接口
// @match        *://www.wanyiwan.top/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// ==/UserScript==

(function () {
let roastLyraCore;
/* Pure protocol parsing and the player list supplied with the old detector. */
(function () {
    'use strict';
    // User-requested exclusions, taken from steal_target_cache (read-only).
    const EXCLUDED_UIDS = Object.freeze([
        '1014141234', '1014141245', '1014145413', '1014162308',
        '1014162948', '1014185945', '1014332945',
    ]);
    const PLAYERS = Object.freeze([
    "1013926024",
    "1013927353",
    "1013927503",
    "1013929245",
    "1013930293",
    "1013931351",
    "1013940464",
    "1013941103",
    "1013947071",
    "1013947581",
    "1013948369",
    "1013950401",
    "1013950744",
    "1013951766",
    "1013954728",
    "1013956724",
    "1013957123",
    "1013957710",
    "1013958421",
    "1013959732",
    "1013960120",
    "1013961372",
    "1013962839",
    "1013964152",
    "1013964351",
    "1013964719",
    "1013966950",
    "1013969408",
    "1013972390",
    "1013972581",
    "1013972624",
    "1013972725",
    "1013973247",
    "1013975176",
    "1013975634",
    "1013976744",
    "1013976765",
    "1013977211",
    "1013978081",
    "1013978272",
    "1013978605",
    "1013979025",
    "1013979299",
    "1013979461",
    "1013979663",
    "1013979991",
    "1013980013",
    "1013980050",
    "1013980380",
    "1013980503",
    "1013981271",
    "1013981699",
    "1013981818",
    "1013982181",
    "1013983055",
    "1013983933",
    "1013984274",
    "1013984845",
    "1013985186",
    "1013985189",
    "1013986637",
    "1013987599",
    "1013987921",
    "1013988272",
    "1013988940",
    "1013989117",
    "1013990213",
    "1013990484",
    "1013990609",
    "1013990619",
    "1013990825",
    "1013991027",
    "1013991368",
    "1013991442",
    "1013992236",
    "1013994105",
    "1013994308",
    "1013994618",
    "1013996265",
    "1013996544",
    "1013996642",
    "1014003202",
    "1014003413",
    "1014003642",
    "1014004317",
    "1014005147",
    "1014005184",
    "1014005233",
    "1014005522",
    "1014005979",
    "1014006219",
    "1014007119",
    "1014007360",
    "1014007463",
    "1014008435",
    "1014008904",
    "1014010322",
    "1014011159",
    "1014011572",
    "1014012620",
    "1014013036",
    "1014016160",
    "1014016344",
    "1014018462",
    "1014019016",
    "1014019619",
    "1014019772",
    "1014019838",
    "1014021023",
    "1014023867",
    "1014024352",
    "1014025831",
    "1014025939",
    "1014025980",
    "1014027008",
    "1014027431",
    "1014027970",
    "1014028054",
    "1014030469",
    "1014030985",
    "1014031206",
    "1014031651",
    "1014032298",
    "1014036747",
    "1014037127",
    "1014037544",
    "1014038055",
    "1014040810",
    "1014041181",
    "1014043197",
    "1014044177",
    "1014045577",
    "1014047655",
    "1014048095",
    "1014048188",
    "1014048822",
    "1014048987",
    "1014049483",
    "1014049789",
    "1014051100",
    "1014051409",
    "1014054293",
    "1014054594",
    "1014055648",
    "1014055833",
    "1014055886",
    "1014055960",
    "1014056195",
    "1014056409",
    "1014056465",
    "1014057559",
    "1014057706",
    "1014057848",
    "1014058204",
    "1014058359",
    "1014058378",
    "1014058641",
    "1014058660",
    "1014059019",
    "1014059482",
    "1014059539",
    "1014059739",
    "1014060194",
    "1014060444",
    "1014060481",
    "1014060803",
    "1014060971",
    "1014061086",
    "1014061987",
    "1014062186",
    "1014062790",
    "1014062893",
    "1014063357",
    "1014063659",
    "1014064341",
    "1014064406",
    "1014064491",
    "1014064635",
    "1014065174",
    "1014065207",
    "1014065413",
    "1014065525",
    "1014065640",
    "1014068600",
    "1014069084",
    "1014071260",
    "1014071747",
    "1014071963",
    "1014072675",
    "1014072993",
    "1014073100",
    "1014073385",
    "1014074337",
    "1014074507",
    "1014075108",
    "1014075635",
    "1014076835",
    "1014077375",
    "1014078422",
    "1014079726",
    "1014080821",
    "1014080997",
    "1014081326",
    "1014082073",
    "1014083332",
    "1014083733",
    "1014084391",
    "1014084431",
    "1014085441",
    "1014086167",
    "1014086197",
    "1014086508",
    "1014086751",
    "1014086839",
    "1014086952",
    "1014086953",
    "1014087053",
    "1014088635",
    "1014089529",
    "1014090230",
    "1014090310",
    "1014090451",
    "1014090539",
    "1014090666",
    "1014091108",
    "1014091316",
    "1014091453",
    "1014092819",
    "1014093845",
    "1014093924",
    "1014094767",
    "1014095041",
    "1014095054",
    "1014095275",
    "1014095577",
    "1014097043",
    "1014097970",
    "1014098356",
    "1014099994",
    "1014100238",
    "1014100431",
    "1014101393",
    "1014101849",
    "1014102134",
    "1014102293",
    "1014102971",
    "1014104316",
    "1014105151",
    "1014105819",
    "1014107558",
    "1014107764",
    "1014108124",
    "1014108728",
    "1014110840",
    "1014110973",
    "1014111936",
    "1014112158",
    "1014112834",
    "1014113336",
    "1014114263",
    "1014114284",
    "1014114318",
    "1014114437",
    "1014114605",
    "1014114779",
    "1014115117",
    "1014117172",
    "1014120008",
    "1014120359",
    "1014121885",
    "1014122091",
    "1014123031",
    "1014123426",
    "1014123725",
    "1014123916",
    "1014125009",
    "1014128849",
    "1014129704",
    "1014130581",
    "1014132000",
    "1014132270",
    "1014133393",
    "1014134512",
    "1014135097",
    "1014135920",
    "1014136327",
    "1014137124",
    "1014137775",
    "1014138127",
    "1014140415",
    "1014140795",
    "1014141234",
    "1014141245",
    "1014141275",
    "1014143270",
    "1014143371",
    "1014143707",
    "1014143916",
    "1014144131",
    "1014144872",
    "1014145056",
    "1014145058",
    "1014145269",
    "1014145413",
    "1014146027",
    "1014148342",
    "1014149007",
    "1014149202",
    "1014150842",
    "1014151596",
    "1014152764",
    "1014152859",
    "1014152943",
    "1014153768",
    "1014153923",
    "1014153946",
    "1014155471",
    "1014156275",
    "1014156953",
    "1014158588",
    "1014162074",
    "1014162308",
    "1014162948",
    "1014164725",
    "1014165012",
    "1014165455",
    "1014166518",
    "1014167995",
    "1014170272",
    "1014170365",
    "1014170487",
    "1014170989",
    "1014171019",
    "1014171039",
    "1014171557",
    "1014171610",
    "1014171935",
    "1014172506",
    "1014172938",
    "1014173575",
    "1014173595",
    "1014173831",
    "1014174017",
    "1014174734",
    "1014175308",
    "1014175419",
    "1014175814",
    "1014175940",
    "1014176605",
    "1014177235",
    "1014177847",
    "1014178382",
    "1014178435",
    "1014178932",
    "1014179602",
    "1014180320",
    "1014180375",
    "1014180889",
    "1014180943",
    "1014180974",
    "1014181122",
    "1014181759",
    "1014181932",
    "1014182788",
    "1014183786",
    "1014185726",
    "1014185945",
    "1014186731",
    "1014187986",
    "1014188383",
    "1014189251",
    "1014189532",
    "1014191081",
    "1014191561",
    "1014194592",
    "1014195218",
    "1014195382",
    "1014199084",
    "1014199127",
    "1014199565",
    "1014199796",
    "1014200352",
    "1014200357",
    "1014201225",
    "1014202467",
    "1014202638",
    "1014204016",
    "1014205583",
    "1014205989",
    "1014206585",
    "1014207418",
    "1014208612",
    "1014208843",
    "1014208952",
    "1014209068",
    "1014209115",
    "1014209992",
    "1014210094",
    "1014210268",
    "1014210291",
    "1014210528",
    "1014210549",
    "1014210561",
    "1014211398",
    "1014211512",
    "1014212786",
    "1014213319",
    "1014214072",
    "1014214838",
    "1014214843",
    "1014214911",
    "1014214951",
    "1014215197",
    "1014216415",
    "1014216628",
    "1014218187",
    "1014218488",
    "1014220412",
    "1014221474",
    "1014222204",
    "1014223867",
    "1014224153",
    "1014224157",
    "1014224234",
    "1014225484",
    "1014225499",
    "1014226561",
    "1014226654",
    "1014227844",
    "1014228492",
    "1014229808",
    "1014230387",
    "1014231008",
    "1014231331",
    "1014231666",
    "1014232066",
    "1014233499",
    "1014233779",
    "1014234203",
    "1014234815",
    "1014234926",
    "1014236160",
    "1014236305",
    "1014237004",
    "1014237541",
    "1014238642",
    "1014239406",
    "1014240070",
    "1014240725",
    "1014242355",
    "1014242539",
    "1014242622",
    "1014242844",
    "1014243716",
    "1014243971",
    "1014244140",
    "1014244778",
    "1014245039",
    "1014245170",
    "1014245478",
    "1014246818",
    "1014246836",
    "1014247187",
    "1014247266",
    "1014247430",
    "1014247476",
    "1014248578",
    "1014256861",
    "1014263453",
    "1014272509",
    "1014278880",
    "1014284241",
    "1014285052",
    "1014294209",
    "1014319302",
    "1014332945",
    "1014340611",
    "1014342811",
    "1014357778",
    "1014366291",
    "1014366553",
    "1014366635",
    "1014366986",
    "1014367132",
    "1014367222",
    "1014367299",
    "1014367723",
    "1014368007",
    "1014368988",
    "1014369103",
    "1014369214",
    "1014369627",
    "1014369770",
    "1014370216",
    "1014370351",
    "1014371252",
    "1014371472",
    "1014372243",
    "1014372294",
    "1014372484",
    "1014372698",
    "1014373069",
    "1014373279",
    "1014373416",
    "1014373563",
    "1014373577",
    "1014373733",
    "1014374172",
    "1014374568",
    "1014375233",
    "1014375523",
    "1014375590",
    "1014375640",
    "1014375761",
    "1014375864",
    "1014376227",
    "1014376285",
    "1014376406",
    "1014376841",
    "1014377223",
    "1014377283",
    "1014377334",
    "1014377719",
    "1014378270",
    "1014380449",
    "1014380842",
    "1014380885",
    "1014381341",
    "1014382100",
    "1014383296",
    "1014383360",
    "1014383954",
    "1014384791",
    "1014385556",
    "1014385882",
    "1014386033",
    "1014387334",
    "1014387994",
    "1014388459",
    "1014388705",
    "1014388940",
    "1014388961",
    "1014389275",
    "1014389879",
    "1014390705",
    "1014391366",
    "1014391594",
    "1014392776",
    "1014393218",
    "1014393526",
    "1014394457",
    "1014394489",
    "1014395072",
    "1014395212",
    "1014395558",
    "1014396104",
    "1014396218",
    "1014396386",
    "1014396487",
    "1014396742",
    "1014397541",
    "1014398038",
    "1014398484",
    "1014398865",
    "1014399000",
    "1014399171",
    "1014399293",
    "1014399439",
    "1014399491",
    "1014400011",
    "1014400013",
    "1014400175",
    "1014400733",
    "1014401167",
    "1014401239",
    "1014401565",
    "1014401810",
    "1014402463",
    "1014403039",
    "1014403613",
    "1014403915",
    "1014403918",
    "1014404389",
    "1014404904",
    "1014404984",
    "1014405089",
    "1014405536",
    "1014405663",
    "1014412154"
].filter(uid => !EXCLUDED_UIDS.includes(uid)));
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
    const has = (o,k) => o != null && Object.prototype.hasOwnProperty.call(o,k);
    function field(o,name,index) { return has(o,name) ? o[name] : o?.[index]; }
    function parsePlayers(text) {
        const values=String(text).trim().split(/[\s,，;；]+/).filter(Boolean);
        if(!values.length) throw new Error('请输入至少一个玩家 ID');
        if(values.length>10000) throw new Error('每次最多检测 10000 个玩家');
        const ids=new Set();
        for(const value of values) {
            if(!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value)<=0) throw new Error('玩家 ID 必须是正的安全整数');
            ids.add(String(Number(value)));
        }
        return [...ids];
    }
    function normalize(root) {
        const seen=new Set(); let steps=0;
        function walk(value,depth=0,parent=null,key=null) {
            if(++steps>100000 || depth>32) throw new Error('营地响应过大或嵌套过深');
            if(ArrayBuffer.isView(value)) {
                if(key==='occupier_name' || key==='Name' && parent && has(parent,'Type') && has(parent,'State') || String(key)==='3' && parent &&
                    [0,1,2,3].includes(scalar(parent['0'])) && [0,1,2,3,4].includes(scalar(parent['1']))) {
                    return new TextDecoder().decode(value);
                }
                try { return walk(decodeBytes(value),depth+1); }
                catch (_) {
                    if(depth===0 && value[0]===0 && value.length>1) {
                        try { return walk(decodeBytes(value.subarray(1)),depth+1); } catch (_) {}
                    }
                    return value;
                }
            }
            if(!value || typeof value!=='object') return value;
            if(seen.has(value)) return null; seen.add(value);
            if(Array.isArray(value)) return value.map((v,k)=>walk(v,depth+1,value,k));
            const out=Object.create(null);
            for(const k of Object.keys(value)) out[k]=walk(value[k],depth+1,value,k);
            return out;
        }
        return walk(root);
    }
    function protocolItems(root) {
        const result=[],seen=new Set(),queue=[root];
        for(let i=0;i<queue.length && i<100000;i++) {
            const o=queue[i]; if(!o || typeof o!=='object' || ArrayBuffer.isView(o) || seen.has(o)) continue;
            seen.add(o); if(has(o,'protoId') || has(o,'className')) result.push(o);
            for(const v of Object.values(o)) if(v && typeof v==='object') queue.push(v);
        }
        return result;
    }
    function id(value) {
        if(typeof value!=='number' && typeof value!=='string') return '';
        const text=String(value);
        return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text)>0 ? String(Number(text)) : '';
    }
    function scalar(value) {
        return (typeof value==='number' || typeof value==='string' && value.trim()!=='') && Number.isFinite(Number(value)) ? Number(value) : NaN;
    }
    function roast(value) {
        if(!value || typeof value!=='object' || ArrayBuffer.isView(value)) return null;
        const type=scalar(has(value,'Type')?value.Type:field(value,'roast_type',0));
        const status=scalar(has(value,'State')?value.State:field(value,'status',1));
        const occupant=has(value,'PlayerUid')?value.PlayerUid:field(value,'occupier_id',2);
        const occupierId=occupant===0 || occupant==='0' ? '0' : id(occupant);
        if(![0,1,2,3].includes(type) || ![0,1,2,3,4].includes(status)) return null;
        const name=has(value,'Name')?value.Name:field(value,'occupier_name',3);
        const occupierName=ArrayBuffer.isView(name)?new TextDecoder().decode(name):typeof name==='string'?name:'';
        return {type,status,occupierId,occupierName,freeLarge:type===3&&status===2&&occupierId==='0'};
    }
    function camp(data) {
        if(!data || typeof data!=='object' || ArrayBuffer.isView(data)) return null;
        const code=scalar(field(data,'Code',0));
        if(!Number.isInteger(code)) return null;
        const self=field(data,'Self',3);
        const playerId=id(field(data,'PlayerId',2)) || id(self?.['0']);
        const roasts=[]; let recognized=false;
        // Current game registry calls response slot 6 SelfBBQ (GameDomainBBQ).
        // An explicitly present field is authoritative, including null. Never
        // fall through into unrelated farm/legacy fields when it is malformed.
        const currentArray=Array.isArray(data)&&data.length>=10;
        if(has(data,'SelfBBQ') || currentArray) {
            const value=has(data,'SelfBBQ')?data.SelfBBQ:data[6];
            const parsed=roast(value);
            if(parsed) roasts.push(parsed);
            return {playerId,code,roasts,known:code===0&&(value===null||Boolean(parsed))};
        }
        // Slot 5 may hold other structures; slot 7 may be farm state.
        // Only accept a direct roast with scalar type/status, never recurse
        // arbitrary farm fields and mistake crop quantities for a roast.
        for(const [name,index] of [['RoastA',6],['RoastB',5],['FarmData',7]]) {
            const value=field(data,name,index);
            if(value===null && (name==='RoastA' || name==='RoastB')) recognized=true;
            const parsed=roast(value);
            if(parsed) { recognized=true; roasts.push(parsed); }
        }
        return {playerId,code,roasts,known:code===0&&recognized};
    }
    function parseCamp(input,rawId=0,targetId=null) {
        let root;
        try { root=normalize(input); } catch (_) { return null; }
        for(const item of protocolItems(root)) {
            if(item.protoId===6703 || item.className==='CsDomainQueryOther') {
                const parsed=camp(item.data ?? item);
                if(parsed && (targetId===null || parsed.playerId===String(targetId))) return parsed;
            }
        }
        if(rawId!==0xe5d1) return null;
        const direct=camp(root);
        if(direct && (targetId===null || direct.playerId===String(targetId))) return direct;
        // Some decoder implementations wrap the direct payload in data.
        const wrapped=camp(root?.data);
        return wrapped && (targetId===null || wrapped.playerId===String(targetId)) ? wrapped : null;
    }
    roastLyraCore=Object.freeze({PLAYERS,EXCLUDED_UIDS,decodeBytes,parsePlayers,parseCamp,protocolItems});
})();

/* Browser adapter for the read-only Lyra roast detector. */
(function () {
    'use strict';

    const CORE = roastLyraCore || {};
    const QUERY_PROTO_ID = 6703;
    const QUERY_OPCODE = 0x1a2f;
    const TRANSITION_OPCODE = 0xe5d4;
    const REQUEST_TIMEOUT_MS = 8000;
    const REQUEST_INTERVAL_MS = 700;
    const INSTANCE = '__roastLyraUserscriptV1';
    const VERSION = '0.1.3';

    const get = (object, property) => {
        try { return object?.[property]; } catch (_) { return undefined; }
    };

    function uid(value) {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        if (!/^\d+$/.test(text)) return null;
        const number = Number(text);
        if (!Number.isSafeInteger(number) || number <= 0) return null;
        return String(number);
    }

    function playerIdOf(entry) {
        if (entry && typeof entry === 'object') {
            return uid(entry.playerId ?? entry.PlayerId ?? entry.uid ?? entry.id ?? entry['0']);
        }
        return uid(entry);
    }

    function playerLabelOf(entry, id) {
        if (!entry || typeof entry !== 'object') return id;
        return String(entry.name ?? entry.nickName ?? entry.nickname ?? entry.label ?? id);
    }

    function playerEntries(value) {
        const entries = [];
        if (Array.isArray(value)) {
            for (const item of value) {
                const id = playerIdOf(item);
                if (id) entries.push({ id, label: playerLabelOf(item, id) });
            }
        } else if (value && typeof value === 'object') {
            for (const [key, item] of Object.entries(value)) {
                const id = playerIdOf(item) || uid(key);
                if (id) entries.push({ id, label: playerLabelOf(item, id) });
            }
        } else if (typeof value === 'string') {
            for (const item of value.split(/[\s,，;；]+/)) {
                const id = uid(item);
                if (id) entries.push({ id, label: id });
            }
        }
        const seen = new Set();
        return entries.filter(entry => {
            if (seen.has(entry.id)) return false;
            seen.add(entry.id);
            return true;
        });
    }

    function normalizePlayers(value) {
        return playerEntries(value).map(entry => entry.id);
    }

    function parseCustomPlayers(text) {
        const value = String(text ?? '').trim();
        if (!value) return [];
        if (typeof CORE.parsePlayers === 'function') return CORE.parsePlayers(value);
        return playerEntries(value.split(/[\s,，;；]+/)).map(entry => entry.id);
    }

    function roastType(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : value;
    }

    function roastStatus(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : value;
    }

    function roastOccupier(value) {
        if (value === null || value === undefined || value === '') return '';
        return uid(value) || String(value);
    }

    function normalizeRoast(roast) {
        if (!roast || typeof roast !== 'object') return null;
        return {
            ...roast,
            type: roastType(roast.type ?? roast.roastType ?? roast.roast_type),
            status: roastStatus(roast.status),
            occupierId: roastOccupier(roast.occupierId ?? roast.ownerId ?? roast.occupier_id),
            occupierName: roast.occupierName ?? roast.ownerName ?? '',
            freeLarge: Boolean(roast.freeLarge),
        };
    }

    function normalizeParsed(parsed) {
        if (!parsed || typeof parsed !== 'object') return null;
        const playerId = uid(parsed.playerId ?? parsed.PlayerId ?? parsed.uid);
        if (!playerId) return null;
        return {
            ...parsed,
            playerId,
            code: Number.isFinite(Number(parsed.code)) ? Number(parsed.code) : 0,
            known: Boolean(parsed.known),
            roasts: Array.isArray(parsed.roasts) ? parsed.roasts.map(normalizeRoast).filter(Boolean) : [],
        };
    }

    function visibleRoasts(parsed, showAll = false) {
        const roasts = Array.isArray(parsed?.roasts) ? parsed.roasts : [];
        if (showAll) return roasts.slice();
        return roasts.filter(roast => Number(roast.type) === 3
            && Number(roast.status) === 2
            && roastOccupier(roast.occupierId) === '0'
            && roast.freeLarge === true);
    }

    function isBytes(value) {
        return typeof ArrayBuffer !== 'undefined'
            && (ArrayBuffer.isView(value) || value instanceof ArrayBuffer);
    }

    function opcodeFrom(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (value && typeof value === 'object') {
            const direct = value.rawId ?? value.protoId ?? value.opcode ?? value.id;
            if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
        }
        try {
            if (ArrayBuffer.isView(value)) {
                const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
                if (bytes.length >= 6) return bytes[4] | (bytes[5] << 8);
            } else if (value instanceof ArrayBuffer) {
                const bytes = new Uint8Array(value);
                if (bytes.length >= 6) return bytes[4] | (bytes[5] << 8);
            }
        } catch (_) {}
        return 0;
    }

    function isTransitionOpcode(rawId) {
        return Number(rawId) === TRANSITION_OPCODE || Number(rawId) === -TRANSITION_OPCODE;
    }

    function copyResult(result) {
        try { return JSON.parse(JSON.stringify(result)); } catch (_) { return result; }
    }

    // Keep the pure contract available to the offline VM harness.
    if (typeof window === 'undefined') {
        globalThis.RoastLyraRuntime = {
            QUERY_PROTO_ID,
            QUERY_OPCODE,
            TRANSITION_OPCODE,
            REQUEST_TIMEOUT_MS,
            REQUEST_INTERVAL_MS,
            normalizePlayers,
            playerEntries,
            parseCustomPlayers,
            normalizeParsed,
            visibleRoasts,
            opcodeFrom,
            isTransitionOpcode,
        };
        return;
    }

    let root = window;
    try {
        while (root.parent !== root && root.parent.document) root = root.parent;
    } catch (_) {}

    const previous = get(root, INSTANCE);
    if (previous?.document === root.document && previous.version === VERSION) {
        previous.mount();
        return;
    }

    const doc = root.document;
    let panel;
    let output;
    let status;
    let progress;
    let controls;
    let active = null;
    let pending = null;
    let running = false;
    let poisoned = false;
    let internalSend = false;
    let generation = 0;
    let results = [];
    let currentTargets = [];

    const bindings = new WeakMap();

    function alive(binding) {
        try {
            return Boolean(binding && !binding.win.closed
                && binding.win.document === binding.document
                && binding.win.ClientMessageHandle === binding.handle);
        } catch (_) { return false; }
    }

    function setStatus(text) {
        if (status) status.textContent = String(text);
    }

    function setProgress(text) {
        if (progress) progress.textContent = String(text);
    }

    function log(text) {
        if (!output) return;
        const line = doc.createElement('div');
        line.textContent = `${new Date().toLocaleTimeString()} ${text}`;
        output.append(line);
        while (output.children.length > 160) output.firstChild.remove();
        output.scrollTop = output.scrollHeight;
    }

    function roastTypeLabel(type) {
        return ({1: '小', 2: '中', 3: '大'})[Number(type)] || `类型${type}`;
    }

    function roastStatusLabel(value) {
        return ({1: '锁定', 2: '空闲', 3: '加热中', 4: '完成'})[Number(value)] || `状态${value}`;
    }

    function resultRows(showAll = false) {
        const rows = [];
        for (const result of results) {
            const roasts = visibleRoasts(result, showAll);
            if (showAll && !roasts.length) {
                rows.push({result, roast: null});
                continue;
            }
            for (const roast of roasts) {
                rows.push({ result, roast });
            }
        }
        return rows;
    }

    let selectingResults = false;
    function renderResults() {
        if (selectingResults) return;
        if (!output) return;
        const container = controls?.results;
        if (!container) return;
        if (typeof container.replaceChildren === 'function') container.replaceChildren();
        else while (container.firstChild) container.firstChild.remove();
        const rows = resultRows(Boolean(controls.all?.checked));
        if (!rows.length) {
            const empty = doc.createElement('div');
            empty.textContent = results.length ? '没有符合当前筛选的烤肉。' : '暂无结果。';
            container.append(empty);
            return;
        }
        for (const {result, roast} of rows) {
            const line = doc.createElement('div');
            if (!roast) {
                const summary = Number(result.code) !== 0
                    ? `服务器错误 ${result.code}`
                    : (result.known ? '无烤肉' : '未知结构');
                line.textContent = `${result.playerId} · ${summary}`;
                container.append(line);
                continue;
            }
            const occupier = roastOccupier(roast.occupierId) === '0'
                ? '无人占用'
                : `占用者 ${roast.occupierName || roast.occupierId}`;
            line.textContent = `${result.playerId} · ${roastTypeLabel(roast.type)} · ${roastStatusLabel(roast.status)} · ${occupier}`;
            container.append(line);
        }
    }

    function resultText() {
        return resultRows(Boolean(controls?.all?.checked)).map(({result, roast}) => {
            if (!roast) {
                const summary = Number(result.code) !== 0
                    ? `服务器错误 ${result.code}`
                    : (result.known ? '无烤肉' : '未知结构');
                return `${result.playerId}\t${summary}`;
            }
            const occupier = roastOccupier(roast.occupierId) === '0'
                ? '无人占用'
                : `占用者 ${roast.occupierName || roast.occupierId}`;
            return `${result.playerId}\t${roastTypeLabel(roast.type)}\t${roastStatusLabel(roast.status)}\t${occupier}`;
        }).join('\n');
    }

    async function copyResults() {
        const text = resultText();
        try {
            if (root.navigator?.clipboard?.writeText) {
                await root.navigator.clipboard.writeText(text);
            } else if (doc.execCommand) {
                const textarea = doc.createElement('textarea');
                textarea.value = text;
                doc.body.append(textarea);
                textarea.select?.();
                doc.execCommand('copy');
                textarea.remove();
            } else {
                throw new Error('当前页面不支持复制');
            }
            setStatus(`已复制 ${text ? text.split('\n').length : 0} 条结果`);
        } catch (error) {
            setStatus(`复制失败：${error.message || error}`);
        }
    }

    function makeElement(tag, parent, text, id) {
        const element = doc.createElement(tag);
        if (text !== undefined) element.textContent = String(text);
        if (id) {
            element.id = id;
            controls[id] = element;
        }
        parent.append(element);
        return element;
    }

    function ui() {
        if (!doc?.body) return false;
        if (panel) {
            if (!doc.body.contains(panel)) doc.body.append(panel);
            return true;
        }

        const host = doc.createElement('div');
        host.id = 'roast-lyra-panel';
        host.style.cssText = 'all:initial!important;display:block!important;position:fixed!important;left:14px!important;top:60px!important;z-index:2147483647!important;width:390px!important;max-width:calc(100vw - 28px)!important;max-height:85vh!important;overflow:auto!important;background:#211923!important;color:#f8f1f4!important;padding:14px!important;border:1px solid #986b83!important;border-radius:10px!important;font:13px/1.5 sans-serif!important;box-shadow:0 5px 24px #0008!important;visibility:visible!important;opacity:1!important';
        const shadow = typeof host.attachShadow === 'function' ? host.attachShadow({mode: 'open'}) : host;
        controls = {};
        makeElement('style', shadow, 'button,input{margin:4px;padding:4px}button{cursor:pointer}#results{max-height:280px;overflow:auto;font-size:12px;white-space:pre-wrap;cursor:text}#results,#results *{user-select:text!important;-webkit-user-select:text!important}label{display:inline-block}', null);
        makeElement('b', shadow, `🔥 Roast · Lyra v${VERSION} · 内置 ${playerEntries(CORE.PLAYERS).length} 人`);
        makeElement('button', shadow, '收起', 'fold');
        const body = makeElement('div', shadow, undefined, 'body');
        makeElement('p', body, '等待 Lyra 游戏同步', 'status');
        makeElement('p', body, '未开始', 'progress');
        const options = makeElement('label', body);
        const all = makeElement('input', options, undefined, 'all');
        all.type = 'checkbox';
        makeElement('span', options, '显示全部烤肉');
        body.append(doc.createElement('br'));
        for (const [id, title] of [['start', '开始'], ['stop', '停止'], ['clear', '清理'], ['copy', '复制结果']]) {
            makeElement('button', body, title, id);
        }
        makeElement('div', body, undefined, 'results');
        controls.results.addEventListener('pointerdown', () => { selectingResults = true; });
        // Preserve selected text while scan results arrive; clicking elsewhere
        // resumes rendering. Do not cancel native selection/copy defaults.
        doc.addEventListener('pointerdown', event => {
            if (event.composedPath().includes(controls.results)) return;
            if (selectingResults) { selectingResults = false; renderResults(); }
        }, true);
        for (const name of ['pointerdown','pointerup','mousedown','mouseup','selectstart','copy']) {
            controls.results.addEventListener(name, event => event.stopPropagation());
        }
        output = controls.results;
        status = controls.status;
        progress = controls.progress;
        controls.all.onchange = renderResults;
        controls.fold.onclick = () => { controls.body.hidden = !controls.body.hidden; };
        controls.stop.onclick = () => manualStop('已停止；当前等待已取消。');
        controls.clear.onclick = () => {
            if (running || pending) {
                setStatus('扫描进行中，请先停止后再清理结果');
                return;
            }
            results = [];
            renderResults();
            setProgress('已清理结果');
        };
        controls.copy.onclick = () => { void copyResults(); };
        controls.start.onclick = () => { void start(); };
        doc.body.append(host);
        panel = host;
        renderResults();
        log('脚本已启动；不会自动发包。');
        return true;
    }

    function protocolFor(binding) {
        return Object.values(binding.protocols || {}).find(protocol => Number(protocol?.protoId) === QUERY_PROTO_ID);
    }

    function cancelPending(error, poison = false) {
        const waiter = pending;
        if (!waiter) return;
        pending = null;
        root.clearTimeout(waiter.timer);
        if (poison) poisoned = true;
        waiter.reject(error instanceof Error ? error : new Error(String(error)));
    }

    function stopInternal(reason, invalidateOwner = false, poison = false) {
        running = false;
        generation += 1;
        cancelPending(new Error(reason || '已停止'), poison);
        if (invalidateOwner) active = null;
        if (reason) setStatus(reason);
    }

    function manualStop(reason = '已停止；当前等待已取消。') {
        stopInternal(reason, false, Boolean(pending));
    }

    function normalizeCoreResult(result, rawId, targetId = null) {
        if (isTransitionOpcode(rawId)) return null;
        if (typeof CORE.parseCamp !== 'function') return null;
        try { return normalizeParsed(CORE.parseCamp(result, rawId, targetId)); } catch (_) { return null; }
    }

    function handleDecoded(binding, result, rawId) {
        if (!alive(binding)) return;
        if (active !== binding) {
            if (active) stopInternal('检测到游戏上下文切换，已停止；不会发送下一项。', true, Boolean(pending));
            active = binding;
        }
        const expectedPlayerId = pending?.owner === binding ? pending.playerId : null;
        const parsed = normalizeCoreResult(result, rawId, expectedPlayerId);
        if (!parsed) return;

        const waiter = pending;
        if (!waiter || waiter.owner !== binding || waiter.generation !== generation) return;
        if (parsed.playerId !== waiter.playerId) return;
        pending = null;
        root.clearTimeout(waiter.timer);
        results.push(parsed);
        renderResults();
        setProgress(`已完成 ${results.length}/${currentTargets.length}`);
        waiter.resolve(parsed);
    }

    function hookDecoders(binding, game) {
        for (const object of [game.Message, game, get(binding.win, '$Global')?.core, binding.handle]) {
            if (!object || typeof get(object, 'decodeMessage') !== 'function' || binding.hooked.has(object)) continue;
            const original = object.decodeMessage;
            object.decodeMessage = function (...args) {
                const rawId = opcodeFrom(args[0]);
                const observe = value => {
                    try { handleDecoded(binding, value, rawId); } catch (_) {}
                };
                if (typeof args[1] === 'function') {
                    const callback = args[1];
                    args[1] = function (value) {
                        observe(value);
                        return callback.apply(this, arguments);
                    };
                    return original.apply(this, args);
                }
                const result = original.apply(this, args);
                if (result && typeof result.then === 'function') result.then(observe, () => {});
                else observe(result);
                return result;
            };
            binding.hooked.add(object);
        }
    }

    function install(win) {
        const handle = get(win, 'ClientMessageHandle');
        const game = get(get(win, '$Global'), 'core')?.Game;
        if (typeof get(handle, 'sendTcp') !== 'function' || !game?.Protocols) return;
        const old = bindings.get(win);
        if (old && old.document === win.document && old.handle === handle) {
            hookDecoders(old, game);
            return;
        }
        const binding = {win, document: win.document, handle, protocols: game.Protocols, hooked: new WeakSet()};
        bindings.set(win, binding);
        hookDecoders(binding, game);
    }

    function scan() {
        ui();
        const queue = [root];
        const seen = new Set();
        while (queue.length && seen.size < 64) {
            const win = queue.shift();
            if (seen.has(win)) continue;
            seen.add(win);
            try {
                void win.document;
                install(win);
                const frames = get(win, 'frames') || [];
                for (let index = 0; index < Math.min(frames.length, 32); index += 1) queue.push(frames[index]);
            } catch (_) {}
        }
        if (active && !alive(active)) {
            stopInternal('游戏上下文已失效，已停止；不会重试。', true);
        }
        if (status && !running && !pending && !active) setStatus('等待 Lyra 游戏 decoder 同步');
    }

    function sleep(milliseconds) {
        return new Promise(resolve => root.setTimeout(resolve, milliseconds));
    }

    function targetsFromControls() {
        const entries = playerEntries(CORE.PLAYERS);
        const excluded = new Set(CORE.EXCLUDED_UIDS || []);
        const seen = new Set();
        return entries.filter(entry => {
            if (!entry.id || excluded.has(entry.id) || seen.has(entry.id)) return false;
            seen.add(entry.id);
            return true;
        });
    }

    function query(entry, owner, runGeneration) {
        return new Promise((resolve, reject) => {
            if (!running || generation !== runGeneration || active !== owner || !alive(owner)) {
                reject(new Error('游戏上下文未就绪'));
                return;
            }
            const protocol = protocolFor(owner);
            if (!protocol) {
                reject(new Error('游戏协议表缺少 6703 营地查询协议'));
                return;
            }
            const waiter = {
                owner,
                generation: runGeneration,
                playerId: entry.id,
                resolve,
                reject,
                timer: 0,
            };
            // Register before send so a synchronous decoder callback cannot race the waiter.
            pending = waiter;
            waiter.timer = root.setTimeout(() => {
                if (pending !== waiter) return;
                pending = null;
                running = false;
                generation += 1;
                poisoned = true;
                setStatus(`UID ${entry.id} 响应超时，已停止；请刷新游戏后重试`);
                reject(new Error(`UID ${entry.id} 响应超时，已停止且不会重试`));
            }, REQUEST_TIMEOUT_MS);
            try {
                internalSend = true;
                owner.handle.sendTcp(protocol, [Number(entry.id)]);
            } catch (error) {
                if (pending === waiter) {
                    pending = null;
                    root.clearTimeout(waiter.timer);
                    running = false;
                    generation += 1;
                    poisoned = true;
                    setStatus(`UID ${entry.id} 发送异常，已停止；请刷新游戏后重试`);
                    reject(new Error(`UID ${entry.id} 发送异常，已停止且不会重试：${error.message || error}`));
                }
            } finally {
                internalSend = false;
            }
        });
    }

    async function start() {
        if (running || pending) return;
        if (poisoned) {
            setStatus('查询结果未确认，请刷新游戏后重试');
            return;
        }
        if (!active || !alive(active)) {
            setStatus('等待 Lyra 游戏 decoder 同步后再开始');
            return;
        }
        try {
            currentTargets = targetsFromControls();
        } catch (error) {
            setStatus(error.message || String(error));
            return;
        }
        if (!currentTargets.length) {
            setStatus('没有可查询的 UID');
            return;
        }
        results = [];
        renderResults();
        const owner = active;
        const runGeneration = ++generation;
        running = true;
        setStatus('正在扫描');
        setProgress(`已完成 0/${currentTargets.length}`);
        try {
            for (let index = 0; index < currentTargets.length; index += 1) {
                if (!running || generation !== runGeneration || active !== owner || !alive(owner)) break;
                if (index > 0) await sleep(REQUEST_INTERVAL_MS);
                if (!running || generation !== runGeneration || active !== owner || !alive(owner)) break;
                await query(currentTargets[index], owner, runGeneration);
            }
            if (running && generation === runGeneration) {
                running = false;
                setStatus(`扫描完成，共 ${results.length} 个玩家结果`);
            }
        } catch (error) {
            if (generation === runGeneration) {
                running = false;
                setStatus(error.message || String(error));
            }
        } finally {
            if (generation === runGeneration) running = false;
        }
    }

    const instance = {document: doc, version: VERSION, mount: () => ui()};
    ui();
    root[INSTANCE] = instance;
    scan();
    root.setInterval(scan, 500);
})();

})();
