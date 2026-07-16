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

  // --- タイムライン登場ユーザー（10カテゴリ × 8人） ---
  TIMELINE_PROFILE_GROUPS: [
    { color:'#e879a9', users:[
      ['ミナ','@mina_days','ミ'], ['あかり','@akari_life','あ'], ['ナツ','@natsu_journal','ナ'], ['えみ','@emi_everyday','え'],
      ['りん','@rin_room','り'], ['カナ','@kana_days','カ'], ['モモ','@momo_log','モ'], ['ヒナ','@hina_time','ヒ'],
    ] },
    { color:'#60a5fa', users:[
      ['たくみ','@tkm_dev','た'], ['Kento｜Web開発','@kento_codes','K'], ['miki.exe','@miki_engineer','m'], ['サトル','@satoru_backend','サ'],
      ['ユキ｜UI','@yuki_ui','ユ'], ['NaoTech','@naotech_lab','N'], ['インフラの人','@infra_note','イ'], ['すずき.dev','@suzuki_dev','す'],
    ] },
    { color:'#a78bfa', users:[
      ['ことり','@kotori_note','こ'], ['しおり','@shiori_books','し'], ['読書する猫','@bookish_cat','猫'], ['文具とノート','@paper_note','文'],
      ['コトバ研究室','@words_lab','言'], ['夜の読書会','@night_reads','夜'], ['積読タワー','@tsundoku_tower','積'], ['図書館の窓辺','@library_window','図'],
    ] },
    { color:'#f59e0b', users:[
      ['はる｜写真','@haru_snap','は'], ['ソラ写真部','@sora_photo','空'], ['街角スナップ','@city_snap_jp','街'], ['film_days','@film_days','F'],
      ['旅するレンズ','@travel_lens','旅'], ['夜景ノート','@night_view','夜'], ['みどりの写真','@green_camera','緑'], ['光を集める人','@light_collector','光'],
    ] },
    { color:'#34d399', users:[
      ['ニュースを読む人','@daily_reader','読'], ['朝刊メモ','@morning_press','朝'], ['データで見る社会','@data_society','数'], ['Local News Watch','@local_watch','L'],
      ['経済の余白','@economy_margin','経'], ['海外記事クリップ','@global_clip','海'], ['科学ニュース便','@science_wire','科'], ['選挙を学ぶ会','@civic_study','選'],
    ] },
    { color:'#fb7185', users:[
      ['ユウ','@you_314','ユ'], ['アオイ','@aoi_music','ア'], ['れん','@ren_playlist','れ'], ['推し活メモ','@oshi_memo','推'],
      ['映画館の住人','@cinema_home','映'], ['ゲーム夜更かし部','@game_midnight','ゲ'], ['ライブ帰り','@after_live','音'], ['ドラマ感想室','@drama_room','ド'],
    ] },
    { color:'#c08457', users:[
      ['まちのカフェ','@machi_cafe','街'], ['パン屋の朝','@bakery_morning','パ'], ['今日の定食','@today_lunch','食'], ['珈琲手帖','@coffee_record','珈'],
      ['週末キッチン','@weekend_kitchen','週'], ['町中華探検隊','@local_chinese','中'], ['おやつの時間','@snack_time','菓'], ['発酵くらし','@ferment_days','発'],
    ] },
    { color:'#22d3ee', users:[
      ['Sora','@sora_loop','S'], ['大学生の日記','@campus_days','大'], ['放課後ラジオ','@after_school','放'], ['新社会人メモ','@first_job','新'],
      ['子育てログ','@family_log','家'], ['朝活コミュニティ','@morning_club','朝'], ['週末ランナー','@weekend_run','走'], ['庭と暮らす','@garden_life','庭'],
    ] },
    { color:'#4ade80', users:[
      ['小さな会社の広報','@smallbiz_pr','広'], ['採用担当の本音','@recruit_note','採'], ['営業のメモ帳','@sales_memo','営'], ['PMの頭の中','@pm_thinking','P'],
      ['デザイン経営室','@design_biz','D'], ['リモートワーク研究','@remote_lab','在'], ['個人店オーナー','@shop_owner','店'], ['スタートアップ観測','@startup_watch','起'],
    ] },
    { color:'#f472b6', users:[
      ['イラスト日和','@illust_days','絵'], ['陶芸のある暮らし','@pottery_life','陶'], ['ハンドメイド部','@handmade_club','手'], ['作曲する部屋','@compose_room','曲'],
      ['漫画制作メモ','@manga_making','漫'], ['映像つくる人','@video_creator','映'], ['配信準備中','@stream_ready','配'], ['創作の途中','@making_now','創'],
    ] },
  ],

  // --- タイムライン投稿文（10カテゴリ × 8種類） ---
  TIMELINE_POST_GROUPS: [
    [
      'おはよう。タイムラインを眺めながら今日の予定を整理中。', 'この時間のタイムライン、落ち着いた話題が多くてちょうどいい。',
      '帰り道の風が少し涼しくなってきた。季節が変わる音がする。', '今日は早めに仕事を切り上げて、ゆっくり夕飯を作る予定。',
      '電車で座れた。それだけで今日の運を少し使った気がする。', '近所を歩いたら新しい店ができていた。週末に行ってみたい。',
      'やることを三つだけ書き出したら、頭の中がかなり静かになった。', '眠る前に今日よかったことを一つだけ残しておく。',
    ],
    [
      'さっきの投稿、コメントで別の視点を知れてよかった。', 'この話題、結論を急がずいろんな人の意見を読みたい。',
      '反対意見にも理由があると分かると、議論の見え方が変わる。', '短い投稿でも、丁寧に書かれた言葉はちゃんと伝わる。',
      '引用元まで読んだら印象が変わった。一次情報は大事。', '詳しい人の解説が集まっていて、タイムラインの良さを感じた。',
      '分からないことを分からないと言える空気は大切にしたい。', '今日はコメント欄から学ぶことが多かった。',
    ],
    [
      '写真を一枚。今日は空の色がきれいだった。', '朝の光が机に落ちていたので、作業前に一枚だけ撮った。',
      '雨上がりの道、街灯が反射して映画みたいだった。', '散歩中に見つけた小さな花。名前を知っている人いますか。',
      '古い商店街の看板、文字の形がすごく好き。', '窓から見える雲が速い。今日は風の強い日。',
      '旅先の写真を整理中。音や匂いまで思い出してしまう。', '夕焼けは数分で色が変わるから、見逃せない。',
    ],
    [
      '読みたいものが増えたので、週末用の読書リストを更新した。', 'この本、前半は静かだけど後半から一気に景色が変わる。',
      '紙のノートに考えを書くと、なぜか文章がゆっくりになる。', '積読を一冊読み終えた。次を開く前の余韻が好き。',
      '図書館で偶然手に取った本が当たりだった。', '今日覚えた言葉をメモ。使う場面が来るまで温めておく。',
      '短編を一つだけ読むつもりが、気づいたら夜更かし。', 'おすすめされたエッセイ、生活を見る解像度が少し上がる感じ。',
    ],
    [
      '小さな改善を一つ出した。派手じゃないけど毎日の手間が減る。', '会議を30分短くしたら、決まることはむしろ増えた。',
      '集中したい時間だけ通知を切る。単純だけど効果が大きい。', '失敗した作業手順をメモ。次の自分への引き継ぎ。',
      '説明するときは結論より先に前提を揃えるのが大事だと実感。', '今日の学びは、早めの相談は手戻りを減らすということ。',
      'タスクを細かくしすぎない。終わりが見える単位にする。', '新しいツールを試した。便利さよりチームで続けられるかが重要。',
    ],
    [
      '新しいアルバムを一周。二曲目の入り方が特に好き。', '映画の余韻が残っていて、帰り道まで少し違って見えた。',
      '推しの新しい活動が発表された。今週を乗り切れる。', '昔遊んだゲームの音楽を聴いたら記憶が一気に戻った。',
      'ライブ配信のコメント欄、みんな同じ瞬間に笑っていて楽しい。', 'ドラマ最終回を見た。感想は明日まで寝かせてから書く。',
      '次に観る作品を探し中。静かな雰囲気のおすすめが知りたい。', 'プレイリストを季節ごとに分ける作業、終わらないけど楽しい。',
    ],
    [
      '今日の昼ごはん。シンプルだけど出汁がすごくおいしかった。', 'コーヒーの豆を変えたら、朝の香りが少し明るくなった。',
      '冷蔵庫にあるもので作ったスープが思った以上に成功。', '近所のパン屋、焼き上がりの時間をやっと覚えた。',
      '旅先で食べた味を再現してみた。まだ何かが足りない。', '旬の野菜は焼くだけで十分おいしい。',
      '今日は甘いものを一つ。頑張った日の小さな区切り。', 'おすすめの朝ごはんを募集中。手軽で温かいものが理想。',
    ],
    [
      '週末に5km走れた。速さより続けられたことがうれしい。', 'ベランダの新芽が開いた。毎朝見る楽しみが増えた。',
      '久しぶりに友人と話したら、時間が一瞬で過ぎた。', '朝に10分だけ片付ける習慣、部屋より気持ちに効いている。',
      '子どもの発想は予想できない。今日も新しい遊びが始まった。', '公園のベンチで少し休憩。何もしない時間も必要。',
      '手紙を書いた。メッセージより時間がかかる分、言葉を選べる。', '新しいことを始めるのに、きれいな月初を待たなくてもいい。',
    ],
    [
      '小さなお店同士で情報交換。悩みが似ていて少し安心した。', '採用面談でこちらが学ぶことも多い。質問の準備を見直した。',
      '数字だけでは見えないお客さまの声をチームに共有した。', '今月の目標を、結果だけでなく行動の数にも分けてみる。',
      'リモートでも雑談できる時間を少し作ったら相談が増えた。', '新機能より、今ある機能の分かりにくさを直すことにした。',
      'お知らせ文を短くした。伝えたいことを絞るのは難しい。', '忙しい時ほど、やらないことを決める必要がある。',
    ],
    [
      '制作途中を少しだけ公開。完成まであと何回変わるだろう。', '色を一つ変えただけで全体の空気がまとまった。',
      'うまく作れない日も、手を動かした記録は残しておく。', '没にした案にも次の作品につながる部分がある。',
      '配信の準備中。音量確認だけで何度も同じ曲を聴いている。', '作品を見てくれた人の感想が、次を作る力になった。',
      '道具を手入れした。制作前のこの時間もけっこう好き。', '締切前だけど一度休む。離れて見ると直す場所が分かる。',
    ],
  ],
  TIMELINE_POSITIVE_GROUPS: [
    ['最近Chirperが軽くなった気がする。画像もすぐ開けて快適。', 'アプリを開いてからタイムラインが出るまで速くなった。', '動画の読み込みが安定していて助かる。'],
    ['ここ数日、会話の雰囲気が穏やかで使いやすい。', '丁寧な返信が多くて、コメント欄まで読みたくなる。', '知らない人同士でも落ち着いて話せる空気がいい。'],
    ['おすすめ欄から面白い人を見つけた。こういう出会いがあると嬉しい。', '興味の近い投稿がほどよく混ざるようになった。', 'フォロー外の小さなコミュニティを見つけられた。'],
    ['通報した投稿への対応が早かった。運営の動きが見えると安心。', '迷惑な返信が減って、会話を続けやすくなった。', 'モデレーションの説明が分かりやすくなった気がする。'],
    ['投稿画面が使いやすい。下書きから戻っても内容が残っていた。', '通知の設定が細かくできて助かる。', '検索結果が前より探しやすくなった。'],
    ['クリエイターへの還元が始まって投稿を続ける理由が増えた。', '好きな作り手を応援できる仕組みがうれしい。', '制作の裏側を話してくれる人が増えた。'],
    ['地域の話題が見つけやすくなって、近所のイベントを知れた。', '海外の投稿に自然な翻訳がついて読みやすい。', 'ローカルなニュースが流れてくるのが便利。'],
    ['障害のお知らせが早く、復旧状況も追いやすかった。', 'サービス状況が見えるだけで不安がかなり減る。', 'メンテナンス予定を事前に確認できて助かった。'],
    ['広告と通常投稿の区別が分かりやすくなった。', '興味に合う広告なら情報として読める。', '広告の表示頻度がちょうどよく感じる。'],
    ['長く使っているけど、最近また新しい楽しみ方が増えた。', '大きくなっても初期の話しやすさが残っていてうれしい。', '今日もここで知らなかったことを一つ学べた。'],
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
