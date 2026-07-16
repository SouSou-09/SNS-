// ============================================================
// SNS経営シミュレーター コアロジック
// ============================================================
'use strict';

const Game = {
  state: null,
  timer: null,
  speed: 1,
  paused: true,
  saveKey: 'chirper-tycoon-save-v1',

  // ---------------- セーブデータ ----------------
  hasSave() {
    try {
      return localStorage.getItem(this.saveKey) !== null;
    } catch (_) {
      return false;
    }
  },

  saveGame() {
    if (!this.state) return false;
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({ version: 1, state: this.state }));
      return true;
    } catch (_) {
      return false;
    }
  },

  loadGame() {
    const previousState = this.state;
    try {
      const data = JSON.parse(localStorage.getItem(this.saveKey));
      if (data?.version !== 1 || !data.state || !Number.isFinite(data.state.day)
          || !Number.isFinite(data.state.cash) || !Number.isFinite(data.state.users)) {
        throw new Error('Invalid save data');
      }
      this.pause();
      this.state = data.state;
      this.state.gameOver = Boolean(this.state.gameOver);
      this.state.won = Boolean(this.state.won);
      // 旧バージョンで1,000万ユーザー達成により終了したセーブも継続可能にする。
      if (this.state.won && this.state.users >= 10000000 && this.state.cash >= CONFIG.BANKRUPT_LINE) {
        this.state.gameOver = false;
      }
      this.state.incidentCooldown = Number.isFinite(this.state.incidentCooldown) ? this.state.incidentCooldown : 0;
      this.state.timeline = Array.isArray(this.state.timeline) ? this.state.timeline : [];
      this.state.timelineSeq = Number.isFinite(this.state.timelineSeq) ? this.state.timelineSeq : 0;
      this.state.trends = Array.isArray(this.state.trends) ? this.state.trends : [];
      this.state.buzzPosts = Array.isArray(this.state.buzzPosts) ? this.state.buzzPosts : [];
      this.state.buzzSeq = Number.isFinite(this.state.buzzSeq) ? this.state.buzzSeq : 0;
      this.state.userRequests = Array.isArray(this.state.userRequests) ? this.state.userRequests : this.createUserRequests();
      this.state.competitors = Array.isArray(this.state.competitors) ? this.state.competitors : this.createCompetitors();
      this.state.campaigns = this.state.campaigns || {};
      this.state.research = this.state.research || { completed:[], active:null };
      this.state.research.completed = Array.isArray(this.state.research.completed) ? this.state.research.completed : [];
      this.state.dataCenters = this.state.dataCenters || {};
      this.state.dcProjects = Array.isArray(this.state.dcProjects) ? this.state.dcProjects : [];
      this.state.markets = this.state.markets || {};
      this.state.overseasEvent = this.state.overseasEvent || null;
      this.state.overseasEventCooldown = Number.isFinite(this.state.overseasEventCooldown) ? this.state.overseasEventCooldown : 5;
      this.state.creatorShare = Number.isFinite(this.state.creatorShare) ? this.state.creatorShare : 0;
      this.state.acquisitions = Array.isArray(this.state.acquisitions) ? this.state.acquisitions : [];
      this.state.incidents = (this.state.incidents || []).map(inc => ({
        ...inc,
        minDays: Number.isFinite(inc.minDays) ? inc.minDays : CONFIG.INCIDENT_MIN_DAYS[inc.sev],
        maxDays: Number.isFinite(inc.maxDays) ? inc.maxDays : CONFIG.INCIDENT_MAX_DAYS[inc.sev],
        peakDay: Number.isFinite(inc.peakDay) ? inc.peakDay : 2 + inc.sev,
        responseDrag: Number.isFinite(inc.responseDrag) ? inc.responseDrag : 0,
        responseCooldown: Number.isFinite(inc.responseCooldown) ? inc.responseCooldown : 0,
        phase: inc.phase || '拡大中',
      }));
      this.state.timeline = this.state.timeline.map(post => ({
        ...post,
        audienceRate: Number.isFinite(post.audienceRate) ? post.audienceRate : Math.max(0.001, post.views / Math.max(this.state.users, 1)),
        engagementRate: Number.isFinite(post.engagementRate) ? post.engagementRate : Math.max(0.015, post.likes / Math.max(post.views, 1)),
        virality: Number.isFinite(post.virality) ? post.virality : 0.25,
        lastEngagementDay: Number.isFinite(post.lastEngagementDay) ? post.lastEngagementDay : post.day,
      }));
      if (this.state.trends.length === 0) this.updateTrends(this.computeReport(), true);
      if (this.state.timeline.length === 0) this.generateUserPosts(this.computeReport(), 6);
      this.computeReport();
      return true;
    } catch (_) {
      this.state = previousState;
      try { localStorage.removeItem(this.saveKey); } catch (_) { /* storage unavailable */ }
      return false;
    }
  },

  // ---------------- 初期化 ----------------
  newGame() {
    this.state = {
      day: 1,
      cash: CONFIG.START_CASH,
      users: CONFIG.START_USERS,
      bots: CONFIG.START_BOTS,
      satisfaction: 62,        // ユーザー満足度 0-100
      trust: 50,               // 企業信頼度 0-100
      premiumRate: 0.004,      // プレミアム加入率
      storageUsedTB: 12,       // 使用済みストレージ
      // 保有サーバー { key: 台数 }
      servers: { web_s: 4, db_s: 2, cache: 1, gpu: 0, storage: 1 },
      pendingOrders: [],       // { key, count, daysLeft }
      cdnUnits: 1,
      autoScale: false,
      staff: { engineer: 1, mod: 2, pr: 0, adSales: 0, reportTeam: 0 },
      aiModTier: 1,
      botAiTier: 0,
      captcha: false,
      smsVerify: false,
      adLoad: 8,               // 広告表示率 %
      adQuality: 1,            // 0=低審査 1=標準 2=厳格
      promoBudget: 0,          // マーケ予算 ¥/日
      incidents: [],           // アクティブ炎上
      incidentSeq: 0,
      incidentCooldown: 0,
      outageDays: 0,
      log: [],
      timeline: [],
      timelineSeq: 0,
      trends: [],
      buzzPosts: [],
      buzzSeq: 0,
      userRequests: this.createUserRequests(),
      competitors: this.createCompetitors(),
      campaigns: {},
      research: { completed:[], active:null },
      dataCenters: {},
      dcProjects: [],
      markets: {},
      overseasEvent: null,
      overseasEventCooldown: 5,
      creatorShare: 0,
      acquisitions: [],
      history: { users: [], cash: [], profit: [], satisfaction: [], load: [] },
      milestonesHit: [],
      gameOver: false,
      won: false,
      totalProfit: 0,
      lastReport: null,
      graceUsed: false,
    };
    this.log('🎉 SNS「Chirper」サービス開始!初期ユーザー5万人、資金¥5,000万からのスタートです。', 'good');
    const report = this.computeReport();
    this.updateTrends(report, true);
    this.generateUserPosts(report, 7);
  },

  log(msg, type = 'info') {
    this.state.log.unshift({ day: this.state.day, msg, type });
    if (this.state.log.length > 120) this.state.log.pop();
  },

  // ---------------- ソーシャル市場 ----------------
  createUserRequests() {
    return CONFIG.USER_REQUESTS.map((request, index) => ({
      ...request,
      support: 48 + index * 7 + Math.floor(Math.random() * 12),
      votes: 800 + Math.floor(Math.random() * 4200),
      implemented: false,
    }));
  },

  createCompetitors() {
    return CONFIG.COMPETITORS.map(competitor => ({ ...competitor, momentum: 0, dailyChange: 0 }));
  },

  // ---------------- タイムライン ----------------
  createPostMetrics(report) {
    const roll = Math.random();
    let audienceRate;
    let virality;
    if (roll < 0.025) {
      audienceRate = 0.12 + Math.random() * 0.28;
      virality = 1.4 + Math.random() * 1.2;
    } else if (roll < 0.16) {
      audienceRate = 0.018 + Math.random() * 0.065;
      virality = 0.65 + Math.random() * 0.65;
    } else {
      audienceRate = 0.0012 + Math.random() * 0.014;
      virality = 0.12 + Math.random() * 0.55;
    }
    const quality = 0.82 + this.state.satisfaction / 350;
    const views = Math.max(8, Math.min(this.state.users * 1.15,
      Math.round(report.dau * audienceRate * quality)));
    const engagementRate = Math.max(0.008, Math.min(0.14,
      (0.014 + Math.random() * 0.06) * (0.85 + this.state.satisfaction / 300) * (1 + virality * 0.12)));
    return { audienceRate, virality, views, engagementRate };
  },

  tickTimelineEngagement(report) {
    const s = this.state;
    for (const post of s.timeline) {
      const age = Math.max(0, s.day - post.day);
      if (age > 5 || post.lastEngagementDay >= s.day) continue;
      const decay = Math.exp(-age * 0.72);
      const potential = Math.min(s.users * 1.35,
        report.dau * post.audienceRate * (1.05 + post.virality * 0.38));
      const remaining = Math.max(0, potential - post.views);
      const addedViews = Math.round(Math.min(remaining,
        report.dau * post.audienceRate * decay * (0.16 + post.virality * 0.12)));
      if (addedViews > 0) {
        const addedLikes = Math.round(addedViews * post.engagementRate);
        post.views += addedViews;
        post.likes += addedLikes;
        post.reposts += Math.round(addedLikes * (0.10 + post.virality * 0.09));
        post.replies += Math.round(addedLikes * (0.07 + post.virality * 0.035));
      }
      post.lastEngagementDay = s.day;
    }
  },

  generateUserPosts(report, count = 3) {
    const s = this.state;
    const profiles = CONFIG.TIMELINE_PROFILE_GROUPS.flatMap(group =>
      group.users.map(([name, handle, avatar]) => ({ name, handle, avatar, color:group.color }))
    );
    const general = CONFIG.TIMELINE_POST_GROUPS.flat();
    const positive = CONFIG.TIMELINE_POSITIVE_GROUPS.flat();
    const concerns = [];
    if (report.latency > 250) concerns.push('読み込みが少し重いかも。投稿ボタンを押してから反映まで時間がかかった。');
    if (report.errorRate > 0.05) concerns.push('さっきから何度かエラーになる。運営から状況のお知らせがあると安心できそう。');
    if (report.botRatio > 0.08) concerns.push('同じ内容の返信が続いているけどBOTかな。通報したので確認してほしい。');
    if (report.toxicExposure > 0.005) concerns.push('攻撃的な返信を見かけた。会話は続けたいけど、もう少し対策があると安心。');
    if (s.adLoad > 15) concerns.push('広告が少し増えた気がする。投稿との区別がもっと分かりやすいと助かる。');
    if (s.incidents.length) concerns.push(`「${s.incidents[0].name}」の件、断片的な情報だけで決めつけず公式の説明を待ちたい。`);

    for (let i = 0; i < count; i++) {
      const profile = profiles[Math.floor(Math.random() * profiles.length)];
      const pool = concerns.length && Math.random() < 0.36
        ? concerns
        : (s.satisfaction >= 66 && Math.random() < 0.3 ? positive : general);
      const text = pool[Math.floor(Math.random() * pool.length)];
      const metrics = this.createPostMetrics(report);
      const likes = Math.round(metrics.views * metrics.engagementRate);
      s.timeline.unshift({
        id: ++s.timelineSeq,
        day: s.day,
        hour: 7 + Math.floor(Math.random() * 16),
        name: profile.name,
        handle: profile.handle,
        avatar: profile.avatar,
        color: profile.color,
        verified: Math.random() < 0.12,
        text,
        replies: Math.round(likes * (0.06 + metrics.virality * 0.035)),
        reposts: Math.round(likes * (0.09 + metrics.virality * 0.08)),
        likes,
        views: metrics.views,
        audienceRate: metrics.audienceRate,
        engagementRate: metrics.engagementRate,
        virality: metrics.virality,
        lastEngagementDay: s.day,
      });
    }
    if (s.timeline.length > 180) s.timeline.length = 180;
  },

  updateTrends(report, initial = false) {
    const s = this.state;
    const previous = new Map((s.trends || []).map(trend => [trend.tag, trend]));
    let topics = CONFIG.TREND_TOPICS.map(topic => {
      const old = previous.get(topic.tag);
      const pulse = 0.72 + Math.random() * 0.75;
      const volume = Math.round(report.dau * (0.008 + Math.random() * 0.032) * pulse);
      const momentum = initial ? 20 + Math.random() * 35 : Math.max(5, (old?.momentum || 20) * 0.52 + Math.random() * 55);
      return { ...topic, volume, momentum, change: old ? Math.round(momentum - old.momentum) : 0 };
    });
    for (const buzz of s.buzzPosts || []) {
      topics.push({ tag:buzz.tag, category:'バズ', sentiment:buzz.sentiment === 'negative' ? -0.5 : 0.7,
        volume:Math.round(buzz.reach * 0.18), momentum:buzz.velocity * 85, change:Math.round(buzz.velocity * 18) });
    }
    if (s.incidents.length) {
      topics.push({ tag:'#Chirper運営', category:'社会', sentiment:-0.6,
        volume:Math.round(report.dau * 0.035), momentum:70 + s.incidents[0].heat / 3, change:24 });
    }
    s.trends = topics.sort((a, b) => b.momentum - a.momentum).slice(0, 7);
  },

  rollBuzz(report) {
    const s = this.state;
    if (s.buzzPosts.length >= 2 || Math.random() > 0.045) return;
    const template = CONFIG.BUZZ_TEMPLATES[Math.floor(Math.random() * CONFIG.BUZZ_TEMPLATES.length)];
    const reach = Math.round(report.dau * (0.05 + Math.random() * 0.12));
    s.buzzPosts.unshift({
      uid:++s.buzzSeq, ...template, author:['@haru_snap','@tkm_dev','@daily_reader','@mina_days'][Math.floor(Math.random()*4)],
      reach, velocity:0.8 + Math.random() * 0.9, age:0, managed:false,
      likes:Math.round(reach * (0.04 + Math.random() * 0.08)), reposts:Math.round(reach * (0.012 + Math.random() * 0.04)),
    });
    this.log(`急上昇ポスト: ${template.tag} が拡散中`, template.sentiment === 'negative' ? 'bad' : 'good');
  },

  tickBuzz() {
    const s = this.state;
    s.buzzPosts = s.buzzPosts.filter(buzz => {
      buzz.age++;
      buzz.velocity *= 0.68 + Math.random() * 0.16;
      buzz.reach += Math.round(buzz.reach * buzz.velocity * 0.34);
      buzz.likes += Math.round(buzz.reach * 0.012 * buzz.velocity);
      buzz.reposts += Math.round(buzz.reach * 0.004 * buzz.velocity);
      if (buzz.sentiment === 'negative') {
        s.satisfaction = Math.max(0, s.satisfaction - buzz.velocity * 0.08);
        s.trust = Math.max(0, s.trust - buzz.velocity * 0.035);
      } else if (buzz.sentiment === 'positive') {
        s.satisfaction = Math.min(100, s.satisfaction + buzz.velocity * 0.035);
      }
      return buzz.age <= 7 && buzz.velocity > 0.08;
    });
  },

  manageBuzz(uid, action) {
    const s = this.state;
    const buzz = s.buzzPosts.find(item => item.uid === uid);
    if (!buzz) return;
    const cost = action === 'boost' ? 500000 : 300000;
    if (s.cash < cost) { this.log('施策を実行する資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= cost;
    if (action === 'boost' && buzz.sentiment !== 'negative') {
      buzz.velocity *= 1.55; buzz.managed = true; s.trust = Math.min(100, s.trust + 0.4);
      this.log(`${buzz.tag} の好意的な拡散を公式が後押ししました。`, 'good');
    } else {
      buzz.velocity *= 0.45; buzz.managed = true; s.trust = Math.min(100, s.trust + 0.7);
      this.log(`${buzz.tag} に背景説明を追加し、誤解の拡散を抑えました。`, 'good');
    }
    UI.render();
  },

  tickUserRequests() {
    for (const request of this.state.userRequests) {
      if (request.implemented) continue;
      request.votes += Math.round(20 + Math.random() * Math.max(40, this.state.users / 3000));
      request.support = Math.max(25, Math.min(96, request.support + (Math.random() - 0.43) * 1.4));
    }
  },

  surveyRequest(id) {
    const request = this.state.userRequests.find(item => item.id === id);
    if (!request || request.implemented || this.state.cash < 100000) return;
    this.state.cash -= 100000;
    request.support = Math.min(98, request.support + 3 + Math.random() * 5);
    request.votes += Math.round(this.state.users * 0.012);
    this.state.trust = Math.min(100, this.state.trust + 0.3);
    this.log(`「${request.title}」についてユーザーアンケートを実施しました。`, 'info');
    UI.render();
  },

  implementRequest(id) {
    const s = this.state;
    const request = s.userRequests.find(item => item.id === id);
    if (!request || request.implemented) return;
    if (s.cash < request.cost) { this.log('要望を実装する資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= request.cost;
    request.implemented = true;
    s.satisfaction = Math.min(100, s.satisfaction + request.effect * request.support / 100);
    s.trust = Math.min(100, s.trust + 0.8);
    this.log(`ユーザー要望「${request.title}」を正式リリースしました。`, 'good');
    UI.render();
  },

  tickCompetitors(report) {
    const s = this.state;
    for (const competitor of s.competitors) {
      let growth = 0.001 + (Math.random() - 0.45) * 0.006;
      if (competitor.id === 'loop' && (s.campaigns.youth || 0) > 0) growth -= 0.004;
      if (competitor.id === 'echo' && (s.campaigns.creator || 0) > 0) growth -= 0.004;
      if (competitor.id === 'linkup' && (s.campaigns.business || 0) > 0) growth -= 0.004;
      competitor.dailyChange = Math.round(competitor.users * growth);
      competitor.users = Math.max(10000, competitor.users + competitor.dailyChange);
      competitor.appeal = Math.max(35, Math.min(90, competitor.appeal + (Math.random() - 0.49) * 0.35));
      competitor.momentum = growth * 100;
    }
    for (const key of Object.keys(s.campaigns)) {
      s.campaigns[key]--;
      if (s.campaigns[key] <= 0) delete s.campaigns[key];
    }
  },

  launchCampaign(segment) {
    const s = this.state;
    const campaigns = {
      youth:{ name:'学生アンバサダー企画', cost:1500000, gain:2600 },
      creator:{ name:'クリエイター支援プログラム', cost:2500000, gain:1800 },
      business:{ name:'企業認証キャンペーン', cost:2200000, gain:1400 },
    };
    const campaign = campaigns[segment];
    if (!campaign || s.cash < campaign.cost || s.campaigns[segment] > 0) return;
    s.cash -= campaign.cost;
    s.users += campaign.gain;
    s.campaigns[segment] = 10;
    s.trust = Math.min(100, s.trust + 0.5);
    this.log(`${campaign.name}を開始。10日間、競合への流出を抑えます。`, 'good');
    UI.render();
  },

  // ---------------- キャパシティ計算 ----------------
  capacity() {
    const s = this.state, S = CONFIG.SERVERS;
    const engBonus = 1 + 0.02 * s.staff.engineer;
    const cnt = k => s.servers[k] || 0;
    const dc = Object.entries(s.dataCenters || {}).reduce((total, [key, count]) => {
      const facility = CONFIG.DATA_CENTERS[key];
      if (!facility) return total;
      total.web += facility.web * count;
      total.db += facility.db * count;
      total.bandwidth += facility.bandwidth * count;
      total.storage += facility.storage * count;
      total.gpu += facility.gpu * count;
      return total;
    }, { web:0, db:0, bandwidth:0, storage:0, gpu:0 });
    const streamBonus = (s.acquisitions || []).includes('streamTech') ? 1.15 : 1;
    return {
      webReq: ((cnt('web_s') * S.web_s.cap + cnt('web_m') * S.web_m.cap + cnt('web_l') * S.web_l.cap) + dc.web) * engBonus * streamBonus,
      dbQuery: ((cnt('db_s') * S.db_s.cap + cnt('db_m') * S.db_m.cap + cnt('db_l') * S.db_l.cap) + dc.db) * engBonus,
      cacheQuery: cnt('cache') * S.cache.cap * engBonus,
      gpuUnits: cnt('gpu') * S.gpu.cap + dc.gpu,
      storageTB: cnt('storage') * S.storage.cap + dc.storage,
      bandwidthGbps: (s.cdnUnits * CONFIG.CDN_UNIT_GBPS + dc.bandwidth) * streamBonus,
    };
  },

  // GPU割当:モデレーションAI優先→BOT検知
  gpuDemand() {
    const s = this.state;
    const modTier = CONFIG.AI_TIERS[s.aiModTier];
    const botTier = CONFIG.BOT_AI_TIERS[s.botAiTier];
    const dau = s.users * CONFIG.DAU_RATIO;
    const posts = dau * CONFIG.CONTRIBUTOR_RATIO * CONFIG.POSTS_PER_DAU + s.bots * 15; // BOTも投稿
    const modNeed = modTier.gpuPer > 0 ? posts / modTier.gpuPer : 0;
    const botNeed = botTier.gpuPer > 0 ? s.bots / botTier.gpuPer : 0;
    return { modNeed, botNeed, total: modNeed + botNeed };
  },

  // ---------------- 日次レポート計算(現在状態から) ----------------
  computeReport() {
    const s = this.state, cap = this.capacity();
    const activeMarkets = Object.keys(s.markets || {}).map(key => ({ key, ...CONFIG.MARKETS[key], status:s.markets[key] })).filter(market => market.name);
    const marketGrowthFactor = 1 + activeMarkets.reduce((sum, market) => sum + (market.growth - 1) * 0.18 + (market.status.feature ? 0.06 : 0), 0);
    const marketEcpmFactor = Math.max(0.7, 1 + activeMarkets.reduce((sum, market) => sum + (market.ecpm - 1) * 0.12 + (market.key === 'northAmerica' && market.status.feature ? 0.15 : 0), 0));
    const marketCost = activeMarkets.reduce((sum, market) => {
      const regulationCost = market.upkeep * (market.regulation || 0) * (market.key === 'europe' && market.status.feature ? 0.65 : 1);
      return sum + market.upkeep + regulationCost;
    }, 0);
    const marketInfraNeed = activeMarkets.reduce((sum, market) => sum + market.infraNeed * (market.key === 'southAmerica' && market.status.feature ? 0.75 : 1), 0);
    const overseasCoverage = (s.dataCenters?.overseas || 0) * 2 + (s.dataCenters?.urban || 0) * 0.2;
    const globalInfraPenalty = Math.max(0, marketInfraNeed - overseasCoverage) / Math.max(1, marketInfraNeed);
    const creatorGrowthFactor = ({ 0:0.88, 10:1, 20:1.16, 30:1.32 })[s.creatorShare] || 1;
    const acquisitionCost = (s.acquisitions || []).reduce((sum, id) => sum + (CONFIG.ACQUISITIONS.find(item => item.id === id)?.upkeep || 0), 0);

    // 実際のSNSに近い「見る人が多数、発信者は一部」の参加構造。
    // 曜日相当の周期とサービス状態により、DAUは毎日ゆるやかに揺れる。
    const weeklyPulse = 1 + Math.sin((s.day % 7) / 7 * Math.PI * 2 - 1.2) * 0.06;
    const healthFactor = 0.88 + s.satisfaction / 500 + s.trust / 1000;
    const activeRatio = Math.max(0.24, Math.min(0.62, CONFIG.DAU_RATIO * weeklyPulse * healthFactor));
    const dau = s.users * activeRatio;
    const segmentMetrics = CONFIG.USER_SEGMENTS.map(segment => {
      let affinity = s.satisfaction;
      if (segment.id === 'youth') affinity -= Math.max(0, s.adLoad - 10) * 0.7;
      if (segment.id === 'creator') affinity += ((s.campaigns.creator || 0) > 0 ? 8 : 0) + s.creatorShare * 0.45;
      if (segment.id === 'business') affinity += (s.trust - 50) * 0.35 - (s.outageDays || 0) * 4;
      if (segment.id === 'news') affinity -= Math.max(0, s.incidents.length - 1) * 4;
      if (segment.id === 'casual') affinity -= Math.max(0, (s.lastReport?.latency || CONFIG.BASE_LATENCY) - 180) / 80;
      return {
        ...segment,
        users: s.users * segment.share,
        dau: s.users * segment.share * activeRatio * segment.activity,
        affinity: Math.max(0, Math.min(100, affinity)),
      };
    });
    const contributors = dau * CONFIG.CONTRIBUTOR_RATIO * (0.75 + s.satisfaction / 200);
    const creators = dau * CONFIG.CREATOR_RATIO * (0.8 + s.trust / 250);
    const readers = Math.max(0, dau - contributors);
    const effectiveActors = dau + s.bots * CONFIG.BOT_LOAD_FACTOR;

    // --- 負荷 ---
    const peakReqPerSec = effectiveActors * CONFIG.ACTIONS_PER_DAU / 86400 * CONFIG.PEAK_FACTOR;
    const rawQueryPerSec = peakReqPerSec * CONFIG.DB_QUERY_PER_REQ;
    const cacheable = rawQueryPerSec * CONFIG.CACHEABLE_RATIO;
    const cacheHit = Math.min(cacheable, cap.cacheQuery);
    const dbQueryPerSec = rawQueryPerSec - cacheHit;
    const peakGbps = peakReqPerSec * CONFIG.MB_PER_REQ * 8 / 1000;

    // --- 稼働率と不足分 ---
    const shortWeb = Math.max(0, peakReqPerSec - cap.webReq);
    const shortDb = Math.max(0, dbQueryPerSec - cap.dbQuery);
    const shortBw = Math.max(0, peakGbps - cap.bandwidthGbps);

    let autoScaleCost = 0;
    let effShortWeb = shortWeb, effShortDb = shortDb, effShortBw = shortBw;
    if (s.autoScale) {
      autoScaleCost = shortWeb * CONFIG.AUTOSCALE.webCostPerReq
                    + shortDb * CONFIG.AUTOSCALE.dbCostPerQuery
                    + shortBw * CONFIG.AUTOSCALE.bwCostPerGbps;
      effShortWeb = effShortDb = effShortBw = 0;
    }

    const util = (used, capa) => capa > 0 ? used / capa : (used > 0 ? 2 : 0);
    const webUtil = s.autoScale ? Math.min(1, util(peakReqPerSec, cap.webReq)) : util(peakReqPerSec, cap.webReq);
    const dbUtil = s.autoScale ? Math.min(1, util(dbQueryPerSec, cap.dbQuery)) : util(dbQueryPerSec, cap.dbQuery);
    const bwUtil = s.autoScale ? Math.min(1, util(peakGbps, cap.bandwidthGbps)) : util(peakGbps, cap.bandwidthGbps);
    const storageUtil = util(s.storageUsedTB, cap.storageTB);
    const worstUtil = Math.max(webUtil, dbUtil, bwUtil);

    // --- レイテンシモデル(M/M/1近似) ---
    let latency = CONFIG.BASE_LATENCY;
    const congestion = u => u < 0.6 ? 0 : u < 1 ? Math.pow((u - 0.6) / 0.4, 2) : 1;
    latency += 400 * congestion(webUtil) + 500 * congestion(dbUtil) + 250 * congestion(bwUtil);
    latency += globalInfraPenalty * activeMarkets.length * 90;
    if (cacheHit > 0) latency -= 15;
    latency = Math.max(40, latency);

    // 障害判定(稼働率100%超過分に応じてエラー率上昇)
    const overload = Math.max(effShortWeb / Math.max(cap.webReq, 1), effShortDb / Math.max(cap.dbQuery, 1), effShortBw / Math.max(cap.bandwidthGbps, 1));
    const errorRate = Math.min(0.9, Math.max(overload * 1.2, globalInfraPenalty * activeMarkets.length * 0.08));
    const outage = errorRate > 0.35;

    // --- モデレーション ---
    const humanPosts = contributors * CONFIG.POSTS_PER_DAU;
    const botPosts = s.bots * 15;
    const posts = humanPosts + botPosts;
    const replies = humanPosts * (0.46 + Math.min(0.12, s.satisfaction / 500));
    const originalPosts = Math.max(0, humanPosts - replies);
    const reactions = dau * CONFIG.REACTIONS_PER_DAU * (0.75 + s.satisfaction / 200);
    const trendMomentum = s.trends?.[0]?.momentum || 0;
    const trendLift = 1 + Math.min(0.18, trendMomentum / 500);
    const shares = reactions * (0.035 + Math.max(0, s.satisfaction - 50) * 0.0005) * trendLift;
    const modTier = CONFIG.AI_TIERS[s.aiModTier];
    const gpu = this.gpuDemand();
    // GPU不足なら性能減衰(モデレーション優先割当)
    const gpuForMod = Math.min(gpu.modNeed, cap.gpuUnits);
    const modAiCover = gpu.modNeed > 0 ? gpuForMod / gpu.modNeed : 1;
    const acquisitionAiBonus = (s.acquisitions || []).includes('moderationAi') ? 0.08 : 0;
    const aiDetect = Math.min(0.99, modTier.detect * (modTier.gpuPer > 0 ? modAiCover : 1) + acquisitionAiBonus);

    const communityStress = 1 + Math.max(0, 55 - s.satisfaction) / 80;
    const toxicRate = CONFIG.TOXIC_BASE_RATE * communityStress * (1 + s.bots / Math.max(s.users, 1) * 2);
    const toxicPosts = posts * toxicRate;
    const aiCaught = toxicPosts * aiDetect;
    const humanCap = s.staff.mod * CONFIG.MOD_CAP_PER_HUMAN;
    const humanCaught = Math.min(toxicPosts - aiCaught, humanCap) * 0.95;
    const toxicVisible = Math.max(0, toxicPosts - aiCaught - Math.max(0, humanCaught));
    const toxicExposure = toxicVisible / Math.max(posts, 1); // フィード汚染率
    const falseBans = posts * modTier.fp * (modTier.gpuPer > 0 ? modAiCover : 1) * 0.001; // 誤BANアカウント数/日

    // --- BOT ---
    const gpuForBot = Math.max(0, Math.min(gpu.botNeed, cap.gpuUnits - gpuForMod));
    const botAiCover = gpu.botNeed > 0 ? gpuForBot / gpu.botNeed : 1;
    const botTier = CONFIG.BOT_AI_TIERS[s.botAiTier];
    const botBanAi = s.bots * botTier.banRate * (botTier.gpuPer > 0 ? botAiCover : 1);
    const botBanReport = Math.min(s.bots * 0.25, s.staff.reportTeam * CONFIG.REPORT_BAN_PER_STAFF);
    // BOT流入:ユーザー数と広告収益性に比例して増える
    let botInflowRate = 0.00012 + s.adLoad * 0.000004;
    let signupBlock = 0, convPenalty = 0;
    if (s.captcha) { signupBlock += CONFIG.CAPTCHA.block; convPenalty += CONFIG.CAPTCHA.convPenalty; }
    if (s.smsVerify) { signupBlock += (1 - signupBlock) * CONFIG.SMS.block; convPenalty += CONFIG.SMS.convPenalty; }
    const securityBotFactor = (s.acquisitions || []).includes('security') ? 0.75 : 1;
    const botInflow = s.users * botInflowRate * (1 - signupBlock) * securityBotFactor;
    const botRatio = s.bots / Math.max(s.users + s.bots, 1);

    // --- 満足度への影響を集計 ---
    let satDelta = 0;
    satDelta += (150 - latency) / 150 * 1.2;            // 速さ
    satDelta -= errorRate * 25;                          // エラー
    satDelta -= toxicExposure * 50;                      // 有害投稿
    satDelta -= botRatio * 12;                           // BOT遭遇
    satDelta -= Math.max(0, s.adLoad - 10) * 0.10;       // 広告過多
    if (s.adQuality === 0) satDelta -= 0.5;
    if (s.smsVerify) satDelta -= 0.1;
    satDelta -= s.incidents.reduce((a, i) => a + i.heat / 180, 0); // 炎上中
    if (storageUtil > 0.95) satDelta -= 1.5;             // 容量逼迫(アップロード失敗)
    satDelta += (s.trust - 50) * 0.01;
    // 満足度は現在値に応じて収束(高いほど上げにくい)
    satDelta -= (s.satisfaction - 60) * 0.035;

    // --- 収益 ---
    const impressions = dau * CONFIG.FEED_VIEWS_PER_DAU * (s.adLoad / 100);
    let ecpm = CONFIG.BASE_ECPM;
    ecpm *= 1 + Math.min(0.45, s.staff.adSales * 0.03);
    ecpm *= [1.25, 1.0, 0.85][2 - s.adQuality];          // 低審査ほど単価は高い
    ecpm *= 0.5 + s.satisfaction / 100 * 0.8;            // 満足度でエンゲージ変動
    ecpm *= 0.6 + s.trust / 100 * 0.8;                   // ブランドセーフティ
    ecpm *= Math.max(0.3, 1 - botRatio * 2.5);           // BOT impは広告主が値引き要求
    ecpm *= marketEcpmFactor;
    if ((s.acquisitions || []).includes('adAnalytics')) ecpm *= 1.12;
    if (outage) ecpm *= 0.6;
    const adRevenue = impressions / 1000 * ecpm;
    const premiumRevenue = s.users * s.premiumRate * CONFIG.PREMIUM_PRICE / 30;
    const revenue = adRevenue + premiumRevenue;
    const creatorPayout = adRevenue * s.creatorShare / 100;

    // --- 費用 ---
    let upkeep = 0;
    for (const k in s.servers) upkeep += s.servers[k] * CONFIG.SERVERS[k].upkeep;
    const cdnCost = s.cdnUnits * CONFIG.CDN_UNIT_COST;
    let staffCost = 0;
    for (const k in s.staff) staffCost += s.staff[k] * CONFIG.STAFF[k].cost;
    let securityCost = 0;
    if (s.captcha) securityCost += CONFIG.CAPTCHA.cost;
    if (s.smsVerify) securityCost += CONFIG.SMS.cost;
    const dcCost = Object.entries(s.dataCenters || {}).reduce((sum, [key, count]) => sum + (CONFIG.DATA_CENTERS[key]?.upkeep || 0) * count, 0);
    const licenseDiscount = (s.acquisitions || []).includes('moderationAi') ? 0.8 : 1;
    const licenseCost = (modTier.license + botTier.license) * licenseDiscount;
    const promoCost = s.promoBudget;
    const cost = upkeep + dcCost + cdnCost + staffCost + securityCost + licenseCost + promoCost + autoScaleCost
      + marketCost + acquisitionCost + creatorPayout + CONFIG.OFFICE_BASE_COST;
    const profit = revenue - cost;

    // --- 成長 ---
    const satFactor = (s.satisfaction - 45) / 55;        // 45未満で負成長圧
    const healthyConversation = Math.max(0.65, Math.min(1.25, (replies + shares * 3) / Math.max(humanPosts, 1)));
    const organicIn = s.users * CONFIG.VIRAL_COEF * Math.max(0, satFactor) * (1 - convPenalty)
                    * (0.7 + s.trust / 100 * 0.6) * healthyConversation * trendLift
                    * marketGrowthFactor * creatorGrowthFactor;
    const ownAppeal = s.satisfaction * 0.68 + s.trust * 0.32;
    const competitors = s.competitors || [];
    const strongestAppeal = competitors.reduce((max, competitor) => Math.max(max, competitor.appeal), 0);
    const campaignDefense = ['youth','creator','business'].reduce((sum, key) => sum + ((s.campaigns[key] || 0) > 0 ? 2.5 : 0), 0);
    const competitorOutflow = s.users * Math.max(0, strongestAppeal - ownAppeal - campaignDefense) / 100 * 0.0015;
    const competitorInflow = competitors.reduce((sum, competitor) =>
      sum + competitor.users * Math.max(0, ownAppeal - competitor.appeal) / 100 * 0.00045, 0);
    const cpa = CONFIG.PROMO_CPA_BASE * (1 + Math.max(0, 1 - s.satisfaction / 100));
    const promoIn = s.promoBudget / cpa * (1 - convPenalty);
    let churnRate = CONFIG.BASE_CHURN;
    churnRate += Math.max(0, 55 - s.satisfaction) * 0.0006;
    churnRate += errorRate * 0.02;
    churnRate += toxicExposure * 0.10;
    churnRate += botRatio * 0.015;
    churnRate += s.incidents.reduce((a, i) => a + i.heat * 0.00004, 0);
    churnRate += ({ 0:0.0012, 10:0, 20:-0.00035, 30:-0.0007 })[s.creatorShare] || 0;
    churnRate += globalInfraPenalty * activeMarkets.length * 0.0008;
    churnRate = Math.max(0.001, churnRate);
    const churnOut = s.users * churnRate;
    const wrongBanOut = falseBans * 40; // 誤BAN 1件が波及して周辺ユーザー離脱

    return {
      dau, activeRatio, segmentMetrics, readers, contributors, creators, humanPosts, botPosts,
      originalPosts, replies, reactions, shares, healthyConversation, trendLift,
      peakReqPerSec, dbQueryPerSec, rawQueryPerSec, cacheHit, peakGbps,
      webUtil, dbUtil, bwUtil, storageUtil, worstUtil, latency, errorRate, outage,
      posts, toxicPosts, aiCaught, humanCaught: Math.max(0, humanCaught), toxicVisible, toxicExposure,
      aiDetect, modAiCover, falseBans, humanCap,
      botBanAi, botBanReport, botInflow, botRatio, botAiCover, signupBlock, convPenalty,
      impressions, ecpm, adRevenue, premiumRevenue, revenue, creatorPayout,
      upkeep, dcCost, cdnCost, staffCost, securityCost, licenseCost, promoCost, autoScaleCost,
      marketCost, acquisitionCost, officeCost: CONFIG.OFFICE_BASE_COST, cost, profit,
      organicIn, promoIn, competitorInflow, competitorOutflow, ownAppeal, campaignDefense,
      churnOut, wrongBanOut, churnRate, satDelta,
      activeMarkets, marketGrowthFactor, marketEcpmFactor, globalInfraPenalty, creatorGrowthFactor,
      gpu, cap,
    };
  },

  // ---------------- 1日進行 ----------------
  tick() {
    const s = this.state;
    if (s.gameOver) return;
    const r = this.computeReport();
    s.lastReport = r;
    s.day++;

    // 資金・利益
    s.cash += r.profit;
    s.totalProfit += r.profit;

    // ユーザー増減
    const net = r.organicIn + r.promoIn + r.competitorInflow - r.competitorOutflow - r.churnOut - r.wrongBanOut;
    s.users = Math.max(1000, s.users + net);

    // BOT増減
    s.bots = Math.max(0, s.bots + r.botInflow - r.botBanAi - r.botBanReport);

    // 満足度・ストレージ
    s.satisfaction = Math.max(0, Math.min(100, s.satisfaction + r.satDelta));
    s.storageUsedTB += r.dau * CONFIG.STORAGE_MB_PER_DAU / 1e6;
    // ストレージ溢れ:古いデータ削除で信頼低下
    if (s.storageUsedTB > r.cap.storageTB) {
      s.storageUsedTB = r.cap.storageTB;
      s.trust = Math.max(0, s.trust - 0.5);
    }

    // 障害追跡
    if (r.outage) {
      s.outageDays++;
      const recover = Math.min(0.5, s.staff.engineer * 0.05);
      s.trust = Math.max(0, s.trust - (0.8 - recover));
      if (s.outageDays === 1) this.log('⚠️ サーバー過負荷で大規模障害が発生!エラー率' + Math.round(r.errorRate * 100) + '%', 'bad');
    } else {
      if (s.outageDays > 0) this.log('✅ 障害から復旧しました。', 'good');
      s.outageDays = 0;
      s.trust = Math.min(100, s.trust + 0.05);
    }

    // 納品処理
    s.pendingOrders = s.pendingOrders.filter(o => {
      o.daysLeft--;
      if (o.daysLeft <= 0) {
        s.servers[o.key] = (s.servers[o.key] || 0) + o.count;
        this.log(`📦 ${CONFIG.SERVERS[o.key].name} ×${o.count} が納品され稼働開始しました。`, 'good');
        return false;
      }
      return true;
    });

    // 研究開発と大型建設は日数を要し、完了後から効果と維持費が発生する。
    if (s.research.active) {
      s.research.active.daysLeft--;
      if (s.research.active.daysLeft <= 0) {
        const completed = CONFIG.RESEARCH.find(item => item.id === s.research.active.id);
        if (completed) {
          s.research.completed.push(completed.id);
          this.log(`研究「${completed.name}」が完了。${completed.desc}`, 'good');
        }
        s.research.active = null;
      }
    }
    s.dcProjects = s.dcProjects.filter(project => {
      project.daysLeft--;
      if (project.daysLeft <= 0) {
        s.dataCenters[project.key] = (s.dataCenters[project.key] || 0) + 1;
        this.log(`${CONFIG.DATA_CENTERS[project.key].name}が完成し、稼働を開始しました。`, 'good');
        return false;
      }
      return true;
    });
    this.tickOverseasEvents();

    // SNS内外の話題・バズ・競合市場を更新。
    this.updateTrends(r);
    this.tickBuzz(r);
    this.rollBuzz(r);
    this.tickCompetitors(r);
    this.tickUserRequests();

    // 既存ポストの反応も、現在のDAUと投稿鮮度に応じて数日間伸びる。
    this.tickTimelineEngagement(r);
    // ユーザーのタイムラインには、その日の空気を反映したポストが流れる。
    this.generateUserPosts(r, 2 + Math.floor(Math.random() * 3));

    // 炎上の進行（大きな話題にはクールダウン期間を設け、連発を防ぐ）
    this.tickIncidents(r);
    s.incidentCooldown = Math.max(0, (s.incidentCooldown || 0) - 1);
    // 新規炎上判定
    this.rollIncidents(r);

    // マイルストーン
    for (const m of CONFIG.MILESTONES) {
      if (s.users >= m.users && !s.milestonesHit.includes(m.users)) {
        s.milestonesHit.push(m.users);
        s.cash += m.bonus;
        this.log(`🏆 ${m.title} ${m.msg}`, 'gold');
        if (m.users >= 10000000) {
          s.won = true;
          this.log('1,000万ユーザーは通過点です。経営はこのまま継続できます。', 'gold');
        }
      }
    }

    // 履歴
    const h = s.history;
    h.users.push(Math.round(s.users));
    h.cash.push(Math.round(s.cash));
    h.profit.push(Math.round(r.profit));
    h.satisfaction.push(Math.round(s.satisfaction * 10) / 10);
    h.load.push(Math.round(Math.min(r.worstUtil, 1.5) * 100));
    for (const k in h) if (h[k].length > CONFIG.HISTORY_MAX) h[k].shift();

    // 倒産判定
    if (s.cash < 0 && !s.graceUsed) {
      s.graceUsed = true;
      this.log('🚨 資金がマイナスに!銀行から緊急融資枠(-¥1,000万まで)が設定されました。早急に黒字化を!', 'bad');
    }
    if (s.cash < CONFIG.BANKRUPT_LINE) {
      s.gameOver = true; s.won = false; this.pause();
      this.log('💀 負債が限度額を超え、倒産しました…', 'bad');
    }

    if (typeof UI !== 'undefined') UI.render(true);
  },

  // ---------------- 炎上 ----------------
  incidentSourcePressure(inc, r) {
    const s = this.state;
    switch (inc.id) {
      case 'hate': return Math.min(1.6, r.toxicExposure / 0.006);
      case 'wrongban': return Math.min(1.6, r.falseBans / 16);
      case 'outage': return r.outage ? Math.min(1.8, 0.8 + s.outageDays * 0.18) : 0.1;
      case 'adscam': return s.adQuality === 0 ? 1.25 : s.adQuality === 1 ? 0.45 : 0.1;
      case 'botspam': return Math.min(1.6, r.botRatio / 0.1);
      default: return 0.28;
    }
  },

  tickIncidents(r) {
    const s = this.state;
    s.incidents = s.incidents.filter(inc => {
      inc.age++;
      inc.responseCooldown = Math.max(0, (inc.responseCooldown || 0) - 1);
      const sourcePressure = this.incidentSourcePressure(inc, r);
      const noise = (Math.random() - 0.48) * (2.2 + inc.sev);

      if (inc.age <= inc.peakDay) {
        // 現実の炎上は発生直後に報道・引用・検証が重なり、数日かけてピークへ向かう。
        inc.phase = '拡大中';
        inc.heat += inc.sev * 2.1 + sourcePressure * 3.2 + noise - s.staff.pr * 0.2;
      } else {
        const resurgenceChance = 0.025 + sourcePressure * 0.055 + inc.sev * 0.008;
        if (Math.random() < resurgenceChance) {
          inc.phase = '再燃';
          inc.heat += 5 + inc.sev * 2.5 + sourcePressure * 4;
          this.log(`🔥 炎上「${inc.name}」が新たな投稿や報道で再燃しました。`, 'bad');
        } else {
          inc.phase = inc.heat > 55 ? '高止まり' : '収束中';
          const naturalDecay = 0.8 + s.staff.pr * 0.22 + (inc.responseDrag || 0)
            + Math.max(0, 0.65 - sourcePressure) * 1.1 - inc.sev * 0.1;
          inc.heat -= Math.max(0.25, naturalDecay) + Math.max(-1.5, noise * 0.35);
        }
      }

      // 最短期間中は、対策に成功しても余波・検証・検索流入が残る。
      if (inc.age < inc.minDays) {
        const residualHeat = 8 + inc.sev * 4 + (inc.minDays - inc.age) * 0.8;
        inc.heat = Math.max(residualHeat, inc.heat);
      }
      inc.heat = Math.max(0, Math.min(150, inc.heat));

      const sourceResolved = sourcePressure < 0.7;
      const naturallyClosed = inc.age >= inc.minDays && inc.heat <= 8 && sourceResolved;
      const attentionExpired = inc.age >= inc.maxDays && inc.heat <= 24;
      if (naturallyClosed || attentionExpired) {
        this.log(`🕊️ 炎上「${inc.name}」は${inc.age}日間の余波を経て沈静化しました。`, 'good');
        s.trust = Math.max(0, s.trust - inc.sev * (naturallyClosed ? 0.25 : 0.7));
        s.incidentCooldown = Math.max(s.incidentCooldown || 0, CONFIG.INCIDENT_COOLDOWN_DAYS);
        return false;
      }

      // 原因が未解決のまま上限を迎えた場合は「忘れられる」のではなく低熱で継続する。
      if (inc.age >= inc.maxDays && !sourceResolved) {
        inc.maxDays += 5;
        inc.heat = Math.max(18 + inc.sev * 3, inc.heat);
        inc.phase = '問題継続';
      }
      return true;
    });
  },

  rollIncidents(r) {
    const s = this.state;
    if (s.incidents.length >= CONFIG.MAX_ACTIVE_INCIDENTS || s.incidents.length > 0 || s.incidentCooldown > 0) return;
    // 問題があるだけでは炎上しない。一定の露出・規模を超えた時に低確率で社会的話題になる。
    const risks = {
      tox: Math.min(0.045, 0.0008 + Math.max(0, r.toxicExposure - 0.003) * 2.4),
      fban: Math.min(0.035, Math.max(0, r.falseBans - 12) * 0.00035),
      outage: r.outage ? Math.min(0.09, 0.025 + s.outageDays * 0.012) : 0,
      ad: s.adQuality === 0 ? 0.014 : s.adQuality === 1 ? 0.002 : 0.0004,
      bot: Math.min(0.04, Math.max(0, r.botRatio - 0.08) * 0.5),
      random: 0.0007,
    };
    for (const t of CONFIG.INCIDENT_TYPES) {
      const p = risks[t.cause] || 0;
      if (Math.random() < p * (1.15 - s.trust / 200)) {
        const scaleBonus = s.users > 1000000 && Math.random() < 0.25 ? 1 : 0;
        const sevRoll = Math.random();
        const sev = Math.min(4, (sevRoll < 0.62 ? 1 : sevRoll < 0.9 ? 2 : 3) + scaleBonus);
        const inc = {
          uid: ++s.incidentSeq, id: t.id, name: t.name, desc: t.desc, icon: t.icon,
          sev, heat: 32 + sev * 16, age: 0,
          minDays: CONFIG.INCIDENT_MIN_DAYS[sev] + Math.floor(Math.random() * 3),
          maxDays: CONFIG.INCIDENT_MAX_DAYS[sev] + Math.floor(Math.random() * 5),
          peakDay: 2 + sev + Math.floor(Math.random() * 2),
          responseDrag: 0, responseCooldown: 0, phase: '拡大中',
        };
        s.incidents.push(inc);
        this.log(`🔥 炎上発生[重大度${sev}]: ${t.name}`, 'bad');
        // 小規模な批判はフィード通知のみ。重大案件だけ経営判断のため一時停止する。
        if (sev >= 3 && this.speed > 0) this.pause();
        if (sev >= 3 && typeof UI !== 'undefined') UI.showIncidentAlert(inc);
        break; // 1日1件まで
      }
    }
  },

  respondIncident(uid, respId) {
    const s = this.state;
    const inc = s.incidents.find(i => i.uid === uid);
    if (!inc) return;
    const resp = CONFIG.RESPONSES.find(x => x.id === respId);
    if (!resp) return;
    if ((inc.responseCooldown || 0) > 0) {
      this.log(`対応の検証中です。次の施策投入まで残り${inc.responseCooldown}日です。`, 'info');
      if (typeof UI !== 'undefined') UI.render();
      return;
    }
    let cost = resp.cost ?? (resp.costBase + resp.costPerSev * inc.sev);
    if (s.cash < cost) { this.log('❌ 資金不足で対応できません。', 'bad'); UI.render(); return; }
    s.cash -= cost;

    let prob = resp.base + s.staff.pr * 0.04 + (s.trust - 50) * 0.003;
    if (resp.id === 'silence' && inc.sev <= 1) prob += resp.smallBonus;
    prob = Math.max(0.05, Math.min(0.97, prob));
    const ok = Math.random() < prob;

    inc.responseCooldown = CONFIG.INCIDENT_RESPONSE_COOLDOWN;
    if (ok) {
      // 単発施策で即消滅はせず、初動の熱を下げたうえで日々の収束速度を改善する。
      inc.heat -= resp.heatDown * 0.38 + s.staff.pr * 0.8;
      inc.responseDrag = Math.min(5.5, (inc.responseDrag || 0) + (resp.dragDown || 0));
      inc.phase = '対応検証中';
      s.trust = Math.min(100, s.trust + resp.trustOk);
      this.log(`✅ 「${resp.name}」が奏功。「${inc.name}」は弱まりましたが、余波と検証は続きます(成功率${Math.round(prob * 100)}%)。`, 'good');
    } else {
      inc.heat += resp.failHeat;
      inc.responseDrag = Math.max(0, (inc.responseDrag || 0) - 0.4);
      inc.phase = '再燃';
      s.trust = Math.max(0, s.trust + resp.trustNg);
      this.log(`❌ 「${resp.name}」は逆効果に…「${inc.name}」がさらに延焼(成功率${Math.round(prob * 100)}%)。`, 'bad');
    }
    if (typeof UI !== 'undefined') UI.render();
  },

  // ---------------- プレイヤー操作 ----------------
  buyServer(key, count = 1) {
    const s = this.state, sv = CONFIG.SERVERS[key];
    const cost = sv.price * count;
    if (s.cash < cost) { this.log('❌ 資金不足です。', 'bad'); UI.render(); return false; }
    s.cash -= cost;
    s.pendingOrders.push({ key, count, daysLeft: sv.delivery });
    this.log(`🛒 ${sv.name} ×${count} を発注(¥${cost.toLocaleString()}、納期${sv.delivery}日)`, 'info');
    UI.render(); return true;
  },

  sellServer(key, count = 1) {
    const s = this.state, sv = CONFIG.SERVERS[key];
    if ((s.servers[key] || 0) < count) return false;
    s.servers[key] -= count;
    const refund = Math.round(sv.price * 0.35 * count);
    s.cash += refund;
    this.log(`💸 ${sv.name} ×${count} を売却(+¥${refund.toLocaleString()}/中古価格35%)`, 'info');
    UI.render(); return true;
  },

  setCdn(units) {
    units = Math.max(0, Math.min(50, units));
    this.state.cdnUnits = units;
    UI.render();
  },

  hire(key, delta) {
    const s = this.state;
    const next = (s.staff[key] || 0) + delta;
    if (next < 0 || next > CONFIG.STAFF[key].max) return;
    s.staff[key] = next;
    UI.render();
  },

  setAiMod(tier) { this.state.aiModTier = tier; this.log(`🤖 AIモデレーション: ${CONFIG.AI_TIERS[tier].name} に変更`, 'info'); UI.render(); },
  setBotAi(tier) { this.state.botAiTier = tier; this.log(`🛡️ BOT検知AI: ${CONFIG.BOT_AI_TIERS[tier].name} に変更`, 'info'); UI.render(); },
  toggleCaptcha() { this.state.captcha = !this.state.captcha; UI.render(); },
  toggleSms() { this.state.smsVerify = !this.state.smsVerify; UI.render(); },
  toggleAutoScale() { this.state.autoScale = !this.state.autoScale; UI.render(); },
  setAdLoad(v) { this.state.adLoad = Math.max(0, Math.min(CONFIG.AD_LOAD_MAX, v)); UI.render(); },
  setAdQuality(q) { this.state.adQuality = q; UI.render(); },
  setPromo(v) { this.state.promoBudget = Math.max(0, v); UI.render(); },

  startResearch(id) {
    const s = this.state, research = CONFIG.RESEARCH.find(item => item.id === id);
    if (!research || s.research.active || s.research.completed.includes(id)) return;
    if ((research.requires || []).some(required => !s.research.completed.includes(required))) {
      this.log('前提となる研究が完了していません。', 'bad'); UI.render(); return;
    }
    if (s.cash < research.cost) { this.log('研究開発を開始する資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= research.cost;
    s.research.active = { id, daysLeft:research.days };
    this.log(`研究「${research.name}」を開始（完了まで${research.days}日）`, 'info');
    UI.render();
  },

  buildDataCenter(key) {
    const s = this.state, facility = CONFIG.DATA_CENTERS[key];
    if (!facility || !s.research.completed.includes('dcPlanning')) return;
    if (s.cash < facility.price) { this.log('データセンター建設資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= facility.price;
    s.dcProjects.push({ key, daysLeft:facility.days });
    this.log(`${facility.name}の建設を開始（工期${facility.days}日）`, 'info');
    UI.render();
  },

  enterMarket(key) {
    const s = this.state, market = CONFIG.MARKETS[key];
    if (!market || s.markets[key] || !s.research.completed.includes('globalOps')) return;
    if (s.cash < market.entry) { this.log('海外展開の初期費用が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= market.entry;
    s.markets[key] = { openedDay:s.day, feature:false };
    this.log(`${market.name}市場へ進出。現地運営を開始しました。`, 'good');
    UI.render();
  },

  launchMarketFeature(key) {
    const s = this.state, market = CONFIG.MARKETS[key], status = s.markets[key];
    if (!market || !status || status.feature) return;
    if (s.cash < market.featureCost) { this.log('地域限定機能の開発資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= market.featureCost;
    status.feature = true;
    s.satisfaction = Math.min(100, s.satisfaction + 0.8);
    this.log(`${market.name}限定機能「${market.feature}」を公開しました。`, 'good');
    UI.render();
  },

  tickOverseasEvents() {
    const s = this.state;
    if (s.overseasEvent) return;
    s.overseasEventCooldown = Math.max(0, (s.overseasEventCooldown || 0) - 1);
    const openMarkets = Object.keys(s.markets || {});
    if (!openMarkets.length || s.overseasEventCooldown > 0 || Math.random() > 0.05 * Math.min(openMarkets.length, 3)) return;
    const marketId = openMarkets[Math.floor(Math.random() * openMarkets.length)];
    const event = CONFIG.OVERSEAS_EVENTS[Math.floor(Math.random() * CONFIG.OVERSEAS_EVENTS.length)];
    s.overseasEvent = { marketId, eventId:event.id, day:s.day };
    this.log(`${CONFIG.MARKETS[marketId].name}イベント「${event.name}」が発生。成長戦略で対応してください。`, 'info');
  },

  resolveOverseasEvent(choiceId) {
    const s = this.state;
    if (!s.overseasEvent) return;
    const event = CONFIG.OVERSEAS_EVENTS.find(item => item.id === s.overseasEvent.eventId);
    const choice = event?.choices.find(item => item.id === choiceId);
    if (!choice) return;
    if (s.cash < choice.cost) { this.log('イベント施策の資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= choice.cost;
    s.users = Math.max(1000, s.users + choice.users);
    s.trust = Math.max(0, Math.min(100, s.trust + choice.trust));
    this.log(`${CONFIG.MARKETS[s.overseasEvent.marketId].name}: 「${choice.name}」を実施しました。`, choice.trust < 0 ? 'bad' : 'good');
    s.overseasEvent = null;
    s.overseasEventCooldown = 10;
    UI.render();
  },

  setCreatorShare(value) {
    if (!this.state.research.completed.includes('creatorEconomy')) return;
    const next = CONFIG.CREATOR_SHARE_LEVELS.includes(value) ? value : 10;
    this.state.creatorShare = next;
    this.log(`クリエイター収益還元率を${next}%に変更しました。`, next >= 20 ? 'good' : 'info');
    UI.render();
  },

  acquireCompany(id) {
    const s = this.state, company = CONFIG.ACQUISITIONS.find(item => item.id === id);
    if (!company || s.acquisitions.includes(id) || !s.research.completed.includes('maTeam')) return;
    if (s.cash < company.price) { this.log('買収資金が不足しています。', 'bad'); UI.render(); return; }
    s.cash -= company.price;
    s.acquisitions.push(id);
    if (id === 'smallSns') s.users += 120000;
    if (id === 'security') s.trust = Math.min(100, s.trust + 6);
    this.log(`${company.name}の買収が完了。${company.effect}`, 'good');
    UI.render();
  },

  // ---------------- 時間制御 ----------------
  play(speed = 1) {
    this.speed = speed; this.paused = false;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), CONFIG.TICK_MS / speed);
    UI.renderTimeControls();
  },
  pause() {
    this.paused = true; clearInterval(this.timer); this.timer = null;
    if (typeof UI !== 'undefined') UI.renderTimeControls();
  },
};
