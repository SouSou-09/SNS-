// ============================================================
// SNS経営シミュレーター 設定・バランスデータ
// ============================================================
const CONFIG = {
  // --- 初期状態 ---
  START_CASH: 50000000,        // 初期資金 ¥5,000万
  START_USERS: 50000,          // 初期登録ユーザー
  START_BOTS: 2000,            // 初期BOT数
  BANKRUPT_LINE: -10000000,    // 倒産ライン(負債¥1,000万)

  // --- ユーザー行動モデル ---
  DAU_RATIO: 0.42,             // 登録ユーザーのうち日次アクティブ率（曜日・満足度で変動）
  CONTRIBUTOR_RATIO: 0.18,     // DAUのうち投稿・返信する人
  CREATOR_RATIO: 0.025,        // DAUのうち継続的に発信する人
  ACTIONS_PER_DAU: 220,        // 1DAUあたりのリクエスト数/日
  PEAK_FACTOR: 2.5,            // ピーク時倍率(夜間帯)
  DB_QUERY_PER_REQ: 4,         // 1リクエストあたりDBクエリ数
  CACHEABLE_RATIO: 0.7,        // キャッシュ可能クエリ割合
  MB_PER_REQ: 0.8,             // 1リクエストあたり転送量(MB)
  POSTS_PER_DAU: 1.8,          // 投稿者1人あたり投稿+返信数/日
  REACTIONS_PER_DAU: 12,       // いいね等の軽い反応/日
  FEED_VIEWS_PER_DAU: 140,     // 1DAUあたりフィード閲覧アイテム数/日
  STORAGE_MB_PER_DAU: 3,       // 1DAUあたり新規データ量(MB/日)
  BOT_LOAD_FACTOR: 0.6,        // BOT 1体のサーバー負荷(人間比)

  // --- ユーザー層 ---
  USER_SEGMENTS: [
    { id:'casual', name:'日常・ライト層', share:0.36, activity:0.82, color:'#60a5fa', icon:'fa-mug-hot', desc:'近況閲覧が中心。速度と使いやすさを重視' },
    { id:'youth', name:'学生・若年層', share:0.24, activity:1.22, color:'#a78bfa', icon:'fa-graduation-cap', desc:'トレンドやバズへの反応が速く、広告過多に敏感' },
    { id:'creator', name:'クリエイター', share:0.14, activity:1.38, color:'#f472b6', icon:'fa-palette', desc:'投稿と拡散の中心。収益機会と表現環境を重視' },
    { id:'business', name:'ビジネス・企業', share:0.11, activity:0.76, color:'#34d399', icon:'fa-briefcase', desc:'信頼性・障害率・ブランドセーフティを重視' },
    { id:'news', name:'ニュース・議論層', share:0.15, activity:1.08, color:'#f59e0b', icon:'fa-newspaper', desc:'速報と議論に参加。透明性とモデレーションを重視' },
  ],

  // --- トレンド・バズ ---
  TREND_TOPICS: [
    { tag:'#今日の一枚', category:'写真', sentiment:0.8 },
    { tag:'#朝のひとこと', category:'日常', sentiment:0.7 },
    { tag:'#仕事術', category:'ビジネス', sentiment:0.5 },
    { tag:'#推しを語ろう', category:'エンタメ', sentiment:0.9 },
    { tag:'#いま読んでる', category:'本・文化', sentiment:0.7 },
    { tag:'#週末どうする', category:'日常', sentiment:0.8 },
    { tag:'#テックニュース', category:'テクノロジー', sentiment:0.4 },
    { tag:'#みんなのごはん', category:'グルメ', sentiment:0.9 },
  ],
  BUZZ_TEMPLATES: [
    { text:'何気なく撮った帰り道の写真。空が二色に分かれていた。', tag:'#今日の一枚', sentiment:'positive' },
    { text:'新人の頃に知りたかった仕事の進め方を図にまとめました。', tag:'#仕事術', sentiment:'positive' },
    { text:'おすすめ欄の仕様が変わった？ 同じ話題ばかり流れてくる。', tag:'#Chirper改善希望', sentiment:'negative' },
    { text:'このニュース、見出しだけで判断せず一次情報まで読んでほしい。', tag:'#テックニュース', sentiment:'neutral' },
  ],

  // --- ユーザー要望 ---
  USER_REQUESTS: [
    { id:'bookmark', title:'ブックマークの整理機能', segment:'casual', cost:1200000, effect:1.6, desc:'フォルダ分けと後で読むリストが欲しい' },
    { id:'creatorAnalytics', title:'投稿アナリティクス', segment:'creator', cost:2800000, effect:2.2, desc:'閲覧・反応・フォロワー推移を詳しく確認したい' },
    { id:'communityNote', title:'コミュニティノート', segment:'news', cost:3500000, effect:2.5, desc:'誤解を招く投稿に利用者が背景情報を追加したい' },
    { id:'quietMode', title:'静かなタイムライン', segment:'youth', cost:1800000, effect:1.8, desc:'おすすめや通知を一時的に減らすモードが欲しい' },
  ],

  // --- 競合SNS ---
  COMPETITORS: [
    { id:'loop', name:'Loop', users:180000, appeal:64, color:'#a78bfa', focus:'若年層・短尺コンテンツ', icon:'fa-play' },
    { id:'echo', name:'Echo', users:130000, appeal:60, color:'#f472b6', focus:'クリエイター収益化', icon:'fa-microphone-lines' },
    { id:'linkup', name:'LinkUp', users:210000, appeal:67, color:'#34d399', focus:'企業・実名コミュニティ', icon:'fa-link' },
  ],

  // --- サーバーカタログ ---
  SERVERS: {
    web_s: { cat:'web', name:'Web APサーバー(小)', spec:'8vCPU / 32GB RAM', cap:400, capUnit:'req/s',
             price:400000, upkeep:3000, delivery:1, icon:'fa-server' },
    web_m: { cat:'web', name:'Web APサーバー(中)', spec:'32vCPU / 128GB RAM', cap:1800, capUnit:'req/s',
             price:1500000, upkeep:10000, delivery:2, icon:'fa-server' },
    web_l: { cat:'web', name:'Web APサーバー(大)', spec:'96vCPU / 512GB RAM', cap:6000, capUnit:'req/s',
             price:4800000, upkeep:28000, delivery:3, icon:'fa-server' },
    db_s:  { cat:'db', name:'DBサーバー(小)', spec:'NVMe 4TB / 64GB RAM', cap:3000, capUnit:'query/s',
             price:800000, upkeep:5000, delivery:2, icon:'fa-database' },
    db_m:  { cat:'db', name:'DBサーバー(中)', spec:'NVMe 16TB / 256GB RAM', cap:12000, capUnit:'query/s',
             price:2800000, upkeep:15000, delivery:3, icon:'fa-database' },
    db_l:  { cat:'db', name:'DBサーバー(大)', spec:'NVMe 64TB / 1TB RAM', cap:40000, capUnit:'query/s',
             price:9000000, upkeep:40000, delivery:4, icon:'fa-database' },
    cache: { cat:'cache', name:'キャッシュサーバー', spec:'Redis 512GB RAM', cap:8000, capUnit:'query/s',
             price:600000, upkeep:4000, delivery:1, icon:'fa-bolt' },
    gpu:   { cat:'gpu', name:'GPUサーバー', spec:'A100 x8 / 640GB VRAM', cap:8, capUnit:'GPUユニット',
             price:6000000, upkeep:20000, delivery:5, icon:'fa-microchip' },
    storage:{ cat:'storage', name:'ストレージノード', spec:'HDD 200TB RAID6', cap:200, capUnit:'TB',
             price:1200000, upkeep:6000, delivery:2, icon:'fa-hard-drive' },
  },

  // --- CDN(契約制・即時反映) ---
  CDN_UNIT_GBPS: 10,           // 1契約あたり帯域
  CDN_UNIT_COST: 18000,        // ¥/日/契約

  // --- クラウドオートスケール(従量課金・割高) ---
  AUTOSCALE: {
    webCostPerReq: 45,         // 不足req/sあたり¥/日
    dbCostPerQuery: 12,        // 不足query/sあたり¥/日
    bwCostPerGbps: 35000,      // 不足Gbpsあたり¥/日
  },

  // --- 人材(日給) ---
  STAFF: {
    engineer: { name:'インフラエンジニア', cost:30000, max:20, desc:'チューニングで総容量+2%/人。障害復旧を高速化' },
    mod:      { name:'人間モデレーター', cost:16000, max:100, desc:'1人あたり500件/日を精度95%で審査' },
    pr:       { name:'広報(PR)スタッフ', cost:25000, max:8, desc:'炎上対応の成功率+4%/人' },
    adSales:  { name:'広告営業', cost:28000, max:15, desc:'eCPM+3%/人(逓減あり)' },
    reportTeam:{ name:'通報対応チーム', cost:15000, max:30, desc:'1人あたりBOT 400体/日をBAN' },
  },

  // --- AIモデレーション ---
  MOD_CAP_PER_HUMAN: 500,      // 人間モデレーター処理能力(件/日)
  AI_TIERS: [
    { name:'なし', detect:0, fp:0, gpuPer:0, license:0,
      desc:'モデレーションを行わない。有害投稿が野放しに' },
    { name:'キーワードフィルタ', detect:0.40, fp:0.08, gpuPer:0, license:8000,
      desc:'NGワード辞書ベース。検出率40% / 誤検出8%' },
    { name:'ML分類器 v1', detect:0.65, fp:0.05, gpuPer:3000000, license:40000,
      desc:'テキスト分類モデル。検出率65% / 誤検出5% / GPU 1ユニットあたり300万件/日' },
    { name:'マルチモーダルAI', detect:0.80, fp:0.03, gpuPer:1500000, license:120000,
      desc:'画像・動画も解析。検出率80% / 誤検出3% / GPU 1ユニットあたり150万件/日' },
    { name:'LLMモデレーター', detect:0.92, fp:0.015, gpuPer:600000, license:350000,
      desc:'文脈理解型LLM。検出率92% / 誤検出1.5% / GPU 1ユニットあたり60万件/日' },
  ],
  TOXIC_BASE_RATE: 0.006,      // 投稿のうち有害な割合（基礎。コミュニティ状態で変動）

  // --- BOT対策 ---
  BOT_AI_TIERS: [
    { name:'なし', banRate:0, gpuPer:0, license:0, desc:'既存BOTを放置' },
    { name:'ルールベース検知', banRate:0.03, gpuPer:0, license:10000, desc:'既存BOTの3%/日をBAN' },
    { name:'行動分析ML', banRate:0.09, gpuPer:800000, license:60000, desc:'既存BOTの9%/日をBAN / GPU 1ユニットあたりBOT 80万体' },
    { name:'グラフニューラル検知', banRate:0.20, gpuPer:400000, license:180000, desc:'既存BOTの20%/日をBAN / GPU 1ユニットあたりBOT 40万体' },
  ],
  CAPTCHA: { block:0.55, convPenalty:0.05, cost:5000, name:'CAPTCHA認証' },
  SMS:     { block:0.80, convPenalty:0.12, cost:20000, name:'SMS本人確認' },
  REPORT_BAN_PER_STAFF: 400,   // 通報チーム1人あたりBAN数/日

  // --- 広告 ---
  AD_LOAD_MAX: 30,             // 広告表示率上限(%)
  BASE_ECPM: 600,              // 基礎eCPM(¥/1000imp)
  PROMO_CPA_BASE: 300,         // マーケ獲得単価(¥/人)基礎
  PREMIUM_PRICE: 480,          // プレミアム月額(¥) → 日割り
  OFFICE_BASE_COST: 80000,     // 固定費(オフィス等)/日

  // --- 満足度・成長 ---
  BASE_LATENCY: 80,            // 基礎レイテンシ(ms)
  VIRAL_COEF: 0.030,           // バイラル係数
  BASE_CHURN: 0.005,           // 基礎解約率/日

  // --- 炎上インシデント ---
  INCIDENT_COOLDOWN_DAYS: 10,  // 炎上の沈静化後は同種の話題が連続しにくい
  INCIDENT_MIN_DAYS: [0, 5, 8, 12, 16], // 重大度別の最短継続日数
  INCIDENT_MAX_DAYS: [0, 14, 21, 30, 45], // 重大度別の関心が残り得る上限
  INCIDENT_RESPONSE_COOLDOWN: 2, // 対応策を連続投入できない日数
  MAX_ACTIVE_INCIDENTS: 2,
  INCIDENT_TYPES: [
    { id:'hate',    name:'差別的投稿の拡散放置', cause:'tox', icon:'fa-fire',
      desc:'ヘイト投稿がトレンド入り。「運営は放置している」と批判殺到。' },
    { id:'wrongban',name:'有名人アカウント誤BAN騒動', cause:'fban', icon:'fa-user-slash',
      desc:'AIの誤検出で著名人が凍結され、フォロワーが猛抗議。' },
    { id:'outage',  name:'大規模障害への批判', cause:'outage', icon:'fa-plug-circle-xmark',
      desc:'長時間の接続障害にユーザーの怒りが爆発。他SNSでトレンド入り。' },
    { id:'adscam',  name:'悪質広告の掲載発覚', cause:'ad', icon:'fa-rectangle-ad',
      desc:'詐欺まがいの広告が大量掲載されていると告発記事が公開された。' },
    { id:'botspam', name:'スパムBOT大量発生', cause:'bot', icon:'fa-robot',
      desc:'リプ欄がBOTだらけだとスクショが拡散。「もう終わりだ」の声。' },
    { id:'leak',    name:'情報流出疑惑', cause:'random', icon:'fa-shield-halved',
      desc:'ユーザーデータが闇市場で売られているとの疑惑が浮上。' },
    { id:'policy',  name:'規約変更への反発', cause:'random', icon:'fa-file-contract',
      desc:'利用規約の文言が「ユーザー軽視だ」と解釈され署名運動に発展。' },
  ],
  RESPONSES: [
    { id:'apology', name:'公式謝罪文を公開', cost:0, base:0.42, heatDown:30, dragDown:1.3, failHeat:10,
      trustOk:2, trustNg:-3, desc:'謝罪後も検証や批判は残る。初動と今後の収束を少し改善' },
    { id:'presser', name:'記者会見+補償対応', costBase:2000000, costPerSev:1000000, base:0.75, heatDown:60, dragDown:2.8, failHeat:8,
      trustOk:5, trustNg:-2, desc:'高額だが最も確実。再燃を抑え、収束期間も短縮' },
    { id:'silence', name:'沈黙を保つ', cost:0, base:0.28, smallBonus:0.35, heatDown:18, dragDown:0.4, failHeat:16,
      trustOk:0, trustNg:-4, desc:'小規模なら有効なこともあるが、説明不足で長期化しやすい' },
    { id:'influencer', name:'インフルエンサー火消し', cost:1500000, base:0.5, heatDown:28, dragDown:0.8, failHeat:22,
      trustOk:1, trustNg:-6, desc:'一時的に話題をそらすが、ステマ発覚で大延焼のリスク' },
    { id:'transparency', name:'透明性レポート公開', cost:500000, base:0.55, heatDown:22, dragDown:2.0, failHeat:6,
      trustOk:4, trustNg:-1, desc:'即効性は低めだが、検証が進むほど着実に収束' },
  ],

  // --- 研究開発ツリー ---
  RESEARCH: [
    { id:'dcPlanning', name:'大規模DC設計', cost:8000000, days:7, icon:'fa-compass-drafting', desc:'大型データセンター建設を解禁', unlocks:'dataCenter', requires:[] },
    { id:'creatorEconomy', name:'クリエイター経済圏', cost:6000000, days:6, icon:'fa-wand-magic-sparkles', desc:'収益分配プログラムを解禁', unlocks:'creatorShare', requires:[] },
    { id:'globalOps', name:'グローバル運用基盤', cost:12000000, days:10, icon:'fa-earth-asia', desc:'海外市場と地域限定機能を解禁', unlocks:'markets', requires:['dcPlanning'] },
    { id:'maTeam', name:'M&A専門チーム', cost:10000000, days:8, icon:'fa-building-circle-check', desc:'買収候補のデューデリジェンスを解禁', unlocks:'acquisitions', requires:['creatorEconomy'] },
  ],

  // --- データセンター ---
  DATA_CENTERS: {
    regional: { name:'地方DC', price:20000000, days:10, upkeep:160000, web:18000, db:70000, bandwidth:25, storage:1200, gpu:0, icon:'fa-warehouse', desc:'低コストで基礎容量を拡張' },
    urban: { name:'都市DC', price:60000000, days:16, upkeep:480000, web:65000, db:230000, bandwidth:90, storage:3500, gpu:0, icon:'fa-city', desc:'低遅延・大容量の国内拠点' },
    overseas: { name:'海外DC', price:150000000, days:24, upkeep:1250000, web:150000, db:520000, bandwidth:220, storage:8000, gpu:0, icon:'fa-earth-americas', desc:'海外市場の成長と安定運用を支える' },
    ai: { name:'AI専用DC', price:300000000, days:30, upkeep:2600000, web:30000, db:100000, bandwidth:80, storage:5000, gpu:320, icon:'fa-microchip', desc:'モデレーション・推薦AI向けGPU拠点' },
  },

  // --- 海外市場 ---
  MARKETS: {
    asia: { name:'アジア', entry:30000000, upkeep:300000, growth:1.65, ecpm:0.72, regulation:0, infraNeed:0.8, icon:'fa-earth-asia', desc:'成長が速いが広告単価は低め', feature:'スタンプストア', featureCost:12000000, featureEffect:'成長率+18%' },
    northAmerica: { name:'北米', entry:70000000, upkeep:750000, growth:1.05, ecpm:1.55, regulation:0, infraNeed:1.15, competition:1.35, icon:'fa-earth-americas', desc:'広告単価が高いが競争も激しい', feature:'ライブ音声ルーム', featureCost:28000000, featureEffect:'広告単価+15%' },
    europe: { name:'欧州', entry:60000000, upkeep:950000, growth:0.9, ecpm:1.25, regulation:1.35, infraNeed:1.0, trustBonus:0.08, icon:'fa-earth-europe', desc:'企業需要が高いが規制費も高い', feature:'プライバシーセンター', featureCost:22000000, featureEffect:'規制費-35%・信頼度上昇' },
    southAmerica: { name:'南米', entry:25000000, upkeep:260000, growth:1.35, ecpm:0.62, regulation:0, infraNeed:1.6, icon:'fa-earth-americas', desc:'獲得費用は安いがインフラ投資が必要', feature:'データ節約モード', featureCost:10000000, featureEffect:'インフラ負荷-25%' },
  },
  OVERSEAS_EVENTS: [
    { id:'festival', name:'地域カルチャーフェス', icon:'fa-icons', desc:'現地クリエイターから公式連携の依頼。', choices:[
      { id:'sponsor', name:'公式スポンサーになる', cost:5000000, users:45000, trust:1.5, desc:'大規模協賛で認知と好感度を獲得' },
      { id:'community', name:'コミュニティ枠を提供', cost:1200000, users:14000, trust:0.7, desc:'小規模だが堅実に支援' },
    ] },
    { id:'regulation', name:'現地規制の改定', icon:'fa-scale-balanced', desc:'データ管理体制について当局から対応を求められた。', choices:[
      { id:'comply', name:'先行して完全対応', cost:8000000, users:0, trust:3, desc:'高コストだが企業信頼を高める' },
      { id:'minimum', name:'最低限の対応', cost:1800000, users:-12000, trust:-1.5, desc:'費用を抑える代わりに反発を招く' },
    ] },
    { id:'localTrend', name:'ローカルトレンド急騰', icon:'fa-arrow-trend-up', desc:'地域発の話題が急拡散。運営の後押しが注目されている。', choices:[
      { id:'curate', name:'特集チームを投入', cost:3000000, users:30000, trust:1, desc:'安全に特集し新規利用者を呼び込む' },
      { id:'organic', name:'自然な拡散に任せる', cost:0, users:9000, trust:0, desc:'費用なしで小さな成長を得る' },
    ] },
  ],

  // --- 買収候補 ---
  ACQUISITIONS: [
    { id:'moderationAi', name:'モデレーションAI会社', price:35000000, upkeep:120000, icon:'fa-shield-halved', effect:'AI検出率+8%、ライセンス費-20%', desc:'文脈解析モデルと研究チームを獲得' },
    { id:'streamTech', name:'動画配信技術会社', price:48000000, upkeep:180000, icon:'fa-video', effect:'Web・帯域容量+15%', desc:'低遅延トランスコード技術を内製化' },
    { id:'adAnalytics', name:'広告分析会社', price:28000000, upkeep:90000, icon:'fa-chart-simple', effect:'広告eCPM+12%', desc:'広告主向け分析基盤を統合' },
    { id:'smallSns', name:'小規模SNS', price:22000000, upkeep:150000, icon:'fa-users', effect:'ユーザー12万人を獲得', desc:'コミュニティと運営チームを統合' },
    { id:'security', name:'セキュリティ会社', price:45000000, upkeep:160000, icon:'fa-lock', effect:'信頼度上昇、BOT流入-25%', desc:'不正検知とインシデント対応を強化' },
  ],

  // --- クリエイター収益分配 ---
  CREATOR_SHARE_LEVELS: [0, 10, 20, 30],

  // --- マイルストーン ---
  MILESTONES: [
    { users:100000,   title:'10万ユーザー達成!', bonus:3000000, msg:'ベンチャーキャピタルから追加出資 +¥300万' },
    { users:500000,   title:'50万ユーザー達成!', bonus:10000000, msg:'シリーズA調達に成功 +¥1,000万' },
    { users:1000000,  title:'100万ユーザー達成!', bonus:30000000, msg:'シリーズB調達に成功 +¥3,000万' },
    { users:5000000,  title:'500万ユーザー達成!', bonus:100000000, msg:'大型調達に成功 +¥1億' },
    { users:10000000, title:'1,000万ユーザー達成!!', bonus:0, msg:'国民的SNSの仲間入り。あなたの経営手腕は伝説になった。' },
  ],

  TICK_MS: 1800,               // 1日あたりのリアル時間(1倍速)
  HISTORY_MAX: 400,
};
